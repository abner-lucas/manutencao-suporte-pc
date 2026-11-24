/*
 * logica.js · regras dos laboratórios (sem DOM).
 * Funciona no navegador (window.Logica) e no Node (require), para os testes:
 *   node --test testes/logica.test.js
 *
 * Laboratórios:
 *   1. Montagem + POST  → instalar(), ligar()
 *   2. Diagnóstico      → DIAGNOSTICO, passo(), validarArvore()
 *   3. Particionador    → adicionarParticao(), analisarDisco(), capacidadeReal()
 *   4. Termos técnicos  → TERMOS, buscarTermos()
 */
(function (raiz, fabrica) {
    if (typeof module === 'object' && module.exports) module.exports = fabrica();
    else raiz.Logica = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /* ---------- utilidades ---------- */
    function normalizar(txt) {
        return String(txt || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    }
    function congelar(o) { return Object.freeze(o); }

    /* =====================================================================
     * 1. MONTAGEM E POST
     * Montagem de um PC com CPU sem vídeo integrado (como as linhas "F" da
     * Intel ou boa parte dos Ryzen sem "G"): sem placa de vídeo, não há imagem.
     * ===================================================================== */
    var COMPONENTES = congelar({
        cpu:    congelar({ nome: 'Processador', slot: 'soquete', dica: 'Alinhe o triângulo do canto com a marca do soquete; não force.' }),
        pasta:  congelar({ nome: 'Pasta térmica', slot: 'soquete', requer: ['cpu'], dica: 'Uma gota do tamanho de um grão de ervilha no centro da CPU.' }),
        cooler: congelar({ nome: 'Cooler', slot: 'soquete', requer: ['cpu'], dica: 'Aperte os parafusos em X, aos poucos, e ligue o cabo no conector CPU_FAN.' }),
        ram:    congelar({ nome: 'Memória RAM', slot: 'dimm', dica: 'Abra as travas, alinhe o chanfro e empurre até as travas fecharem.' }),
        ssd:    congelar({ nome: 'SSD NVMe M.2', slot: 'm2', dica: 'Encaixe inclinado (~30°), abaixe e fixe com o parafuso.' }),
        gpu:    congelar({ nome: 'Placa de vídeo', slot: 'pcie', dica: 'Use o slot PCIe x16 mais próximo da CPU e prenda no gabinete.' }),
        eps:    congelar({ nome: 'Cabo EPS 8 pinos', slot: 'eps', dica: 'Alimenta a CPU. Fica no alto da placa, perto do soquete.' }),
        atx24:  congelar({ nome: 'Cabo ATX 24 pinos', slot: 'atx24', dica: 'Alimentação principal da placa-mãe. Encaixe até ouvir o clique da trava.' })
    });

    var NOMES_SLOT = congelar({
        soquete: 'soquete da CPU', dimm: 'slots de memória (DIMM)', m2: 'slot M.2',
        pcie: 'slot PCIe x16', eps: 'conector EPS da CPU', atx24: 'conector ATX 24 pinos'
    });

    function estadoInicial() {
        return congelar({ instalados: congelar([]) });
    }

    function tem(estado, id) { return estado.instalados.indexOf(id) !== -1; }

    /** Tenta encaixar `id` em `slot`. Nunca altera o estado recebido. */
    function instalar(estado, id, slot) {
        var c = COMPONENTES[id];
        if (!c) return { estado: estado, ok: false, tipo: 'erro', msg: 'Componente desconhecido.' };
        if (tem(estado, id)) return { estado: estado, ok: false, tipo: 'aviso', msg: c.nome + ' já está instalado.' };
        if (c.slot !== slot) {
            return { estado: estado, ok: false, tipo: 'erro',
                msg: c.nome + ' não encaixa no ' + (NOMES_SLOT[slot] || slot) + '. Lugar certo: ' + NOMES_SLOT[c.slot] + '.' };
        }
        var falta = (c.requer || []).filter(function (r) { return !tem(estado, r); });
        if (falta.length) {
            return { estado: estado, ok: false, tipo: 'erro',
                msg: 'Antes de ' + c.nome.toLowerCase() + ', instale: ' + falta.map(function (f) { return COMPONENTES[f].nome.toLowerCase(); }).join(', ') + '.' };
        }
        if (id === 'pasta' && tem(estado, 'cooler')) {
            return { estado: estado, ok: false, tipo: 'erro', msg: 'O cooler já está em cima da CPU. Remova-o para aplicar a pasta térmica.' };
        }
        var novo = congelar({ instalados: congelar(estado.instalados.concat(id)) });
        var r = { estado: novo, ok: true, tipo: 'ok', msg: c.nome + ' instalado. ' + c.dica };
        if (id === 'cooler' && !tem(estado, 'pasta')) {
            r.tipo = 'aviso';
            r.msg = 'Cooler instalado sem pasta térmica: a CPU vai esquentar demais. ' + c.dica;
        }
        return r;
    }

    function faltando(estado) {
        return Object.keys(COMPONENTES).filter(function (id) { return !tem(estado, id); });
    }

    /**
     * Simula o botão Liga. Retorna as linhas da tela (etapas) e o resultado.
     * A ordem das verificações segue o caminho real da energia:
     * fonte → placa → CPU → refrigeração → memória → vídeo → armazenamento.
     */
    function ligar(estado) {
        var e = [];
        function linha(txt, st) { e.push({ texto: txt, status: st || 'ok' }); }
        function fim(codigo, titulo, explicacao) {
            return { etapas: e, resultado: { codigo: codigo, titulo: titulo, explicacao: explicacao }, ventoinhas: codigo !== 'sem-energia', temperatura: temp };
        }
        var temp = null;

        if (!tem(estado, 'atx24')) {
            linha('Botão Liga pressionado… nenhuma resposta', 'erro');
            return fim('sem-energia', 'Nada acontece', 'Sem o cabo ATX 24 pinos a placa-mãe não recebe energia nem o sinal para ligar a fonte. Nenhum LED, nenhuma ventoinha.');
        }
        linha('Fonte: PS_ON ativado · +12V +5V +3,3V estáveis');
        if (!tem(estado, 'eps') || !tem(estado, 'cpu')) {
            linha(tem(estado, 'cpu') ? 'CPU sem alimentação (EPS 8 pinos ausente)' : 'Soquete vazio: nenhuma CPU detectada', 'erro');
            return fim('sem-post', 'Ventoinhas giram, mas não há POST', tem(estado, 'cpu')
                ? 'O conector EPS leva 12 V direto para os reguladores da CPU. Sem ele a placa acende, mas o processador não inicia.'
                : 'Sem processador não há quem execute o firmware. A placa acende os LEDs e para (LED de diagnóstico CPU aceso).');
        }
        linha('CPU inicializada · executando firmware UEFI');
        if (!tem(estado, 'cooler')) {
            temp = 105;
            linha('Temperatura da CPU subindo rápido… 105 °C', 'erro');
            return fim('termico', 'Desliga em poucos segundos', 'Sem cooler a CPU atinge o limite térmico e a proteção desliga o computador para evitar dano. Nunca ligue uma CPU sem refrigeração.');
        }
        if (!tem(estado, 'ram')) {
            linha('Teste de memória: nenhum módulo encontrado', 'erro');
            return fim('sem-memoria', 'Bipes e nenhuma imagem', 'O POST para no teste de memória: a placa emite bipes ou acende o LED DRAM. O padrão de bipes varia por fabricante; consulte o manual da placa-mãe.');
        }
        linha('Memória: 16 GB · dual channel · OK');
        if (!tem(estado, 'gpu')) {
            linha('Saída de vídeo: nenhum adaptador encontrado', 'erro');
            return fim('sem-video', 'Liga, mas a tela fica preta', 'Esta CPU não tem vídeo integrado. Sem placa de vídeo, o POST avisa com bipes/LED VGA e o monitor não recebe sinal.');
        }
        linha('Vídeo: adaptador PCIe x16 · sinal enviado ao monitor');
        temp = tem(estado, 'pasta') ? 38 : 88;
        if (!tem(estado, 'pasta')) linha('Aviso: CPU a 88 °C em repouso. Verifique a pasta térmica', 'aviso');
        else linha('CPU a 38 °C · ventoinha CPU_FAN 1 200 rpm');
        if (!tem(estado, 'ssd')) {
            linha('Procurando dispositivo de boot…', 'erro');
            return fim('sem-boot', 'Reboot and Select proper Boot device', 'O hardware passou no POST, mas não há disco com sistema. A tela da BIOS/UEFI pede um dispositivo de inicialização.');
        }
        linha('Armazenamento: NVMe 512 GB · partição EFI encontrada');
        linha('Entregando o controle ao gerenciador de boot…');
        if (!tem(estado, 'pasta')) {
            return fim('quente', 'Inicia, mas esquenta demais', 'Tudo funciona, mas sem pasta térmica o ar entre CPU e cooler isola o calor. Sob carga o processador reduz a velocidade (throttling) ou desliga.');
        }
        return fim('ok', 'Sistema iniciado', 'Montagem completa. O POST terminou com um bipe curto e o sistema operacional assumiu.');
    }

    /* =====================================================================
     * 2. DIAGNÓSTICO (árvore de decisão)
     * Nó de pergunta: { pergunta, ajuda?, opcoes: [{ txt, ir }] }
     * Folha:          { causa, tipo, acoes: [] }
     * ===================================================================== */
    var DIAGNOSTICO = congelar({
        inicio: { pergunta: 'O que acontece quando você aperta o botão Liga?', opcoes: [
            { txt: 'Nada: nenhum LED, nenhuma ventoinha', ir: 'energia1' },
            { txt: 'As ventoinhas giram, mas o monitor fica sem imagem', ir: 'video1' },
            { txt: 'Aparece imagem, mas o sistema não carrega', ir: 'boot1' },
            { txt: 'O sistema carrega, mas trava, reinicia ou fica lento', ir: 'instavel1' }
        ] },

        energia1: { pergunta: 'A tomada e o cabo de força funcionam?', ajuda: 'Teste a tomada com outro aparelho e troque o cabo da fonte por um que você sabe que funciona. Confira a chave da fonte (I/O) e, se houver, a chave 127/220 V.', opcoes: [
            { txt: 'Não: trocando tomada ou cabo, o PC liga', ir: 'f_externo' },
            { txt: 'Sim: tomada e cabo estão bons', ir: 'energia2' }
        ] },
        energia2: { pergunta: 'A fonte liga sozinha no teste do clipe?', ajuda: 'Com tudo desligado da tomada, solte o conector de 24 pinos da placa e una com um clipe o fio verde (PS_ON) a um fio preto (GND). Só então ligue na tomada: a ventoinha da fonte deve girar.', opcoes: [
            { txt: 'Não: a fonte continua parada', ir: 'f_fonte' },
            { txt: 'Sim: a fonte liga', ir: 'energia3' }
        ] },
        energia3: { pergunta: 'O PC liga ao encostar uma chave de fenda nos dois pinos PWR_SW da placa?', ajuda: 'Os pinos ficam no painel frontal da placa-mãe (F_PANEL). Encostar os dois pinos é o mesmo que apertar o botão do gabinete.', opcoes: [
            { txt: 'Sim: assim ele liga', ir: 'f_painel' },
            { txt: 'Não: continua sem reação', ir: 'f_placa' }
        ] },

        video1: { pergunta: 'A placa-mãe dá algum sinal (bipes ou LED de diagnóstico aceso)?', ajuda: 'Muitas placas têm quatro LEDs perto da memória: CPU, DRAM, VGA e BOOT. O que fica aceso indica onde o POST parou.', opcoes: [
            { txt: 'LED DRAM aceso ou bipes de memória', ir: 'f_memoria' },
            { txt: 'LED VGA aceso ou bipes de vídeo', ir: 'f_video' },
            { txt: 'LED CPU aceso', ir: 'f_cpu' },
            { txt: 'Nenhum sinal', ir: 'video2' }
        ] },
        video2: { pergunta: 'O monitor funciona em outro computador, com o mesmo cabo e a mesma entrada?', opcoes: [
            { txt: 'Não, ou não testei a entrada certa', ir: 'f_monitor' },
            { txt: 'Sim, o monitor está bom', ir: 'f_minimo' }
        ] },

        boot1: { pergunta: 'Que mensagem aparece?', opcoes: [
            { txt: '"No bootable device" ou "Reboot and select proper boot device"', ir: 'f_disco' },
            { txt: 'Tela azul (BSOD) durante a inicialização', ir: 'f_bsod_boot' },
            { txt: 'Fica no logotipo ou reinicia em ciclo', ir: 'f_reparo' }
        ] },

        instavel1: { pergunta: 'Quando o problema aparece?', opcoes: [
            { txt: 'Desliga ou reinicia em jogos e tarefas pesadas', ir: 'f_termico' },
            { txt: 'Está lento o tempo todo', ir: 'f_lento' },
            { txt: 'Telas azuis em momentos aleatórios', ir: 'f_bsod' },
            { txt: 'Janelas estranhas, navegador alterado, arquivos sumindo', ir: 'f_malware' }
        ] },

        f_externo: { causa: 'Problema externo: tomada, filtro de linha, cabo de força ou chave da fonte.', tipo: 'corretiva', acoes: [
            'Troque o cabo ou a tomada com defeito.',
            'Evite filtros de linha baratos e "benjamins"; um estabilizador ou nobreak protege o equipamento.'
        ] },
        f_fonte: { causa: 'Fonte de alimentação com defeito.', tipo: 'corretiva', acoes: [
            'Substitua a fonte por uma de potência real adequada e com certificação.',
            'Não abra a fonte: os capacitores guardam carga perigosa mesmo desligados.'
        ] },
        f_painel: { causa: 'Botão Liga ou cabo do painel frontal solto/invertido.', tipo: 'corretiva', acoes: [
            'Reencaixe os cabos do F_PANEL conforme o manual da placa (PWR_SW, RESET, HDD_LED, PWR_LED).',
            'Se o botão estiver quebrado, use temporariamente o botão Reset ligado nos pinos PWR_SW.'
        ] },
        f_placa: { causa: 'Placa-mãe com defeito ou em curto.', tipo: 'corretiva', acoes: [
            'Monte a placa fora do gabinete, sobre a caixa de papelão, para descartar curto com o gabinete (espaçador sobrando).',
            'Procure capacitores estufados e marcas de queimado.',
            'Teste com o mínimo: placa, CPU, cooler e fonte.'
        ] },
        f_memoria: { causa: 'Memória RAM mal encaixada, suja ou com defeito.', tipo: 'corretiva', acoes: [
            'Desligue da tomada, retire os módulos e limpe os contatos dourados com borracha branca.',
            'Teste um módulo por vez, no slot indicado no manual (geralmente A2).',
            'Depois que ligar, rode o MemTest86 ou o Diagnóstico de Memória do Windows.'
        ] },
        f_video: { causa: 'Placa de vídeo sem sinal, mal encaixada ou sem energia.', tipo: 'corretiva', acoes: [
            'Ligue o cabo do monitor na placa de vídeo, não na saída da placa-mãe.',
            'Reencaixe a placa no slot PCIe x16 e conecte os cabos PCIe de energia dela.',
            'Se a CPU tiver vídeo integrado, teste sem a placa de vídeo para isolar o defeito.'
        ] },
        f_cpu: { causa: 'Processador sem energia, mal assentado ou não suportado pela BIOS.', tipo: 'corretiva', acoes: [
            'Confira o cabo EPS de 8 pinos no alto da placa.',
            'Verifique se a versão da BIOS suporta essa CPU (lista de compatibilidade do fabricante).',
            'Inspecione o soquete com lanterna: pinos tortos impedem o contato.'
        ] },
        f_monitor: { causa: 'Monitor, cabo ou entrada de vídeo errada.', tipo: 'corretiva', acoes: [
            'Selecione a entrada certa no menu do monitor (HDMI 1, HDMI 2, DisplayPort…).',
            'Troque o cabo e teste outra saída da placa de vídeo.'
        ] },
        f_minimo: { causa: 'Defeito ainda não isolado: é hora do teste mínimo.', tipo: 'corretiva', acoes: [
            'Deixe só placa-mãe, CPU, cooler, um módulo de memória, vídeo e fonte.',
            'Limpe a CMOS (jumper CLR_CMOS ou retire a bateria por alguns minutos) para voltar a BIOS ao padrão.',
            'Acrescente uma peça por vez até o defeito voltar: a última peça é a suspeita.'
        ] },
        f_disco: { causa: 'Disco não detectado ou ordem/modo de boot errado.', tipo: 'corretiva', acoes: [
            'Entre na BIOS/UEFI e veja se o disco aparece na lista de armazenamento.',
            'Ajuste a ordem de boot para o disco do sistema.',
            'Confira o modo: disco GPT inicia em UEFI; disco MBR inicia em modo legado (CSM).',
            'Reencaixe o SSD M.2 ou troque o cabo SATA.'
        ] },
        f_bsod_boot: { causa: 'Erro do sistema na inicialização (driver, atualização ou arquivos corrompidos).', tipo: 'corretiva', acoes: [
            'Anote o código de parada da tela azul e pesquise-o.',
            'Inicie no Modo de Segurança e desfaça o último driver ou atualização.',
            'Rode sfc /scannow e chkdsk C: /f no Prompt de Comando como administrador.',
            'Use um ponto de restauração, se houver.'
        ] },
        f_reparo: { causa: 'Inicialização do sistema danificada ou disco falhando.', tipo: 'corretiva', acoes: [
            'Use o Reparo de Inicialização (pela mídia de instalação ou pelo ambiente de recuperação).',
            'Verifique a saúde do disco (atributos SMART com o CrystalDiskInfo).',
            'Faça backup assim que conseguir acessar os dados.'
        ] },
        f_termico: { causa: 'Superaquecimento ou fonte no limite.', tipo: 'preventiva', acoes: [
            'Monitore as temperaturas (HWMonitor) em uso pesado.',
            'Limpe a poeira dos dissipadores e filtros com ar comprimido, segurando as ventoinhas paradas.',
            'Troque a pasta térmica da CPU se ela estiver seca.',
            'Confira se a potência real da fonte atende a placa de vídeo.'
        ] },
        f_lento: { causa: 'Desempenho: disco cheio ou lento, inicialização carregada, pouca memória ou malware.', tipo: 'preventiva', acoes: [
            'No Gerenciador de Tarefas, veja o uso de CPU, memória e disco e desative programas da inicialização.',
            'Libere espaço (Limpeza de Disco) e mantenha ao menos 15% do disco livre.',
            'Troque HDD por SSD: é a melhoria com maior efeito em máquinas antigas.',
            'Faça uma verificação completa com o antivírus.'
        ] },
        f_bsod: { causa: 'Instabilidade de hardware ou drivers: memória é a primeira suspeita.', tipo: 'corretiva', acoes: [
            'Teste a memória (MemTest86 ou Diagnóstico de Memória do Windows).',
            'Atualize os drivers de chipset e de vídeo pelo site do fabricante.',
            'Desfaça overclock e perfis XMP/EXPO para testar.'
        ] },
        f_malware: { causa: 'Infecção por malware.', tipo: 'corretiva', acoes: [
            'Desconecte da rede e faça uma verificação offline do antivírus (Microsoft Defender Offline).',
            'Remova programas e extensões desconhecidos e redefina o navegador.',
            'Troque as senhas usando outro dispositivo limpo e mantenha o sistema atualizado.'
        ] }
    });

    function eFolha(no) { return !!(no && no.causa); }

    /** Responde ao nó `id` com a opção `indice`. Retorna o id do próximo nó ou null. */
    function passo(id, indice) {
        var no = DIAGNOSTICO[id];
        if (!no || eFolha(no)) return null;
        var op = no.opcoes[indice];
        return op ? op.ir : null;
    }

    /** Confere a árvore: todo destino existe, não há ciclos e toda folha é alcançável. */
    function validarArvore(arvore) {
        arvore = arvore || DIAGNOSTICO;
        var problemas = [], visitados = {};
        function visitar(id, pilha) {
            var no = arvore[id];
            if (!no) { problemas.push('destino inexistente: ' + id); return; }
            if (pilha.indexOf(id) !== -1) { problemas.push('ciclo em ' + id); return; }
            visitados[id] = true;
            if (eFolha(no)) return;
            if (!no.opcoes || !no.opcoes.length) { problemas.push('nó sem opções: ' + id); return; }
            no.opcoes.forEach(function (o) { visitar(o.ir, pilha.concat(id)); });
        }
        visitar('inicio', []);
        Object.keys(arvore).forEach(function (id) { if (!visitados[id]) problemas.push('nó solto: ' + id); });
        return { ok: problemas.length === 0, problemas: problemas };
    }

    /* =====================================================================
     * 3. PARTICIONADOR (MBR × GPT)
     * Tamanhos em GB como o fabricante anuncia (1 GB = 10^9 bytes).
     * ===================================================================== */
    var LIMITE_MBR_GB = 2199;          // 2^32 setores × 512 B ≈ 2,2 TB
    var MAX_PRIMARIAS_MBR = 4;
    var MAX_GPT = 128;

    /** Capacidade que o Windows mostra (GiB, base 2) para um disco anunciado em GB. */
    function capacidadeReal(gb) {
        return Math.round((gb * 1e9 / Math.pow(2, 30)) * 10) / 10;
    }

    function discoInicial(tamanho, esquema, firmware) {
        return congelar({ tamanho: tamanho, esquema: esquema, firmware: firmware, particoes: congelar([]) });
    }

    function somar(lista, filtro) {
        return lista.filter(filtro || function () { return true; }).reduce(function (s, p) { return s + p.tamanho; }, 0);
    }

    function usavel(disco) {
        return disco.esquema === 'MBR' ? Math.min(disco.tamanho, LIMITE_MBR_GB) : disco.tamanho;
    }

    /** Ocupação no nível do disco (lógicas ficam dentro da estendida e não contam de novo). */
    function ocupado(disco) {
        return somar(disco.particoes, function (p) { return p.tipo !== 'logica'; });
    }

    /** Adiciona uma partição se as regras do esquema permitirem. */
    function adicionarParticao(disco, nova) {
        var tam = Number(nova.tamanho);
        var tipo = disco.esquema === 'GPT' ? 'gpt' : (nova.tipo || 'primaria');
        function falha(msg) { return { disco: disco, ok: false, msg: msg }; }
        if (!(tam > 0) || Math.floor(tam) !== tam) return falha('Informe um tamanho inteiro em GB, maior que zero.');

        var ps = disco.particoes;
        if (disco.esquema === 'GPT') {
            if (ps.length >= MAX_GPT) return falha('GPT aceita até ' + MAX_GPT + ' partições no Windows.');
            if (ocupado(disco) + tam > usavel(disco)) return falha('Não há espaço livre suficiente no disco.');
        } else {
            var noTopo = ps.filter(function (p) { return p.tipo !== 'logica'; }).length;
            var estendida = ps.filter(function (p) { return p.tipo === 'estendida'; })[0];
            if (tipo === 'logica') {
                if (!estendida) return falha('Partição lógica só existe dentro de uma partição estendida. Crie a estendida primeiro.');
                var usadoNaEst = somar(ps, function (p) { return p.tipo === 'logica'; });
                if (usadoNaEst + tam > estendida.tamanho) return falha('Não cabe: a estendida tem ' + (estendida.tamanho - usadoNaEst) + ' GB livres.');
            } else {
                if (tipo === 'estendida' && estendida) return falha('O MBR permite só uma partição estendida.');
                if (noTopo >= MAX_PRIMARIAS_MBR) return falha('O MBR tem só 4 entradas: até 4 primárias, ou 3 primárias + 1 estendida (que guarda as lógicas).');
                if (ocupado(disco) + tam > usavel(disco)) return falha('Não há espaço livre suficiente no disco.');
            }
        }
        var p = congelar({ tipo: tipo, tamanho: tam, rotulo: nova.rotulo || '' });
        return { disco: congelar({ tamanho: disco.tamanho, esquema: disco.esquema, firmware: disco.firmware, particoes: congelar(ps.concat(p)) }), ok: true, msg: 'Partição de ' + tam + ' GB criada.' };
    }

    function removerUltima(disco) {
        var ps = disco.particoes.slice(0, -1);
        // removendo a estendida, as lógicas dentro dela também somem
        if (!ps.some(function (p) { return p.tipo === 'estendida'; })) ps = ps.filter(function (p) { return p.tipo !== 'logica'; });
        return congelar({ tamanho: disco.tamanho, esquema: disco.esquema, firmware: disco.firmware, particoes: congelar(ps) });
    }

    /** Diagnóstico do disco: espaço, limites e se o Windows consegue iniciar dele. */
    function analisarDisco(disco) {
        var alertas = [];
        var usado = ocupado(disco);
        var limite = usavel(disco);
        if (disco.esquema === 'MBR' && disco.tamanho > LIMITE_MBR_GB) {
            alertas.push({ tipo: 'aviso', msg: 'Com MBR só ' + LIMITE_MBR_GB + ' GB (~2,2 TB) podem ser usados; ' + (disco.tamanho - LIMITE_MBR_GB) + ' GB ficam inacessíveis. Use GPT.' });
        }
        var boot;
        if (disco.firmware === 'UEFI' && disco.esquema === 'GPT') boot = { ok: true, msg: 'UEFI + GPT: combinação padrão dos PCs atuais. O Windows instala e inicia normalmente.' };
        else if (disco.firmware === 'Legado' && disco.esquema === 'MBR') boot = { ok: true, msg: 'BIOS legada + MBR: funciona, mas é o modo antigo (o Windows 11 exige UEFI).' };
        else if (disco.firmware === 'UEFI') boot = { ok: false, msg: 'UEFI + MBR: o instalador do Windows recusa o disco em modo UEFI. Converta o disco para GPT ou ative o modo legado (CSM).' };
        else boot = { ok: false, msg: 'BIOS legada + GPT: o Windows não inicia de disco GPT sem UEFI. Use MBR ou ative UEFI na configuração.' };
        if (disco.esquema === 'GPT' && disco.firmware === 'UEFI' && disco.particoes.length && !disco.particoes.some(function (p) { return /efi/i.test(p.rotulo); })) {
            alertas.push({ tipo: 'info', msg: 'Na instalação, o Windows cria sozinho a partição EFI (~100 MB) e a MSR (16 MB) se houver espaço livre.' });
        }
        return { usado: usado, livre: Math.max(0, limite - usado), limite: limite, boot: boot, alertas: alertas };
    }

    /* =====================================================================
     * 4. TERMOS TÉCNICOS
     * ===================================================================== */
    // rótulo curto de cada termo na tecla do teclado
    var TECLAS = {
        'BIOS / UEFI': 'BIOS', 'Dual channel': 'Dual', 'PCI Express': 'PCIe', 'Fonte ATX': 'Fonte', 'M.2 / NVMe': 'NVMe',
        'MBR / GPT': 'MBR·GPT', 'Formatação': 'Format', 'Pasta térmica': 'Pasta', 'Manutenção preventiva': 'Prevent',
        'Manutenção corretiva': 'Corret', 'Periférico': 'Perif'
    };

    var TERMOS = congelar([
        { termo: 'BIOS / UEFI', cat: 'firmware', def: 'Firmware gravado na placa-mãe que testa o hardware e entrega o controle ao sistema. UEFI é a versão moderna: interface gráfica, discos GPT e Secure Boot.' },
        { termo: 'POST', cat: 'firmware', def: 'Power-On Self-Test: autoteste ao ligar. Verifica CPU, memória e vídeo; se algo falha, avisa com bipes ou LEDs.' },
        { termo: 'CMOS', cat: 'firmware', def: 'Memória pequena que guarda as configurações da BIOS e o relógio, mantida pela bateria CR2032. Limpar a CMOS volta tudo ao padrão.' },
        { termo: 'Chipset', cat: 'hardware', def: 'Conjunto de chips da placa-mãe que liga a CPU às portas USB, SATA e a parte dos slots PCIe.' },
        { termo: 'Soquete', cat: 'hardware', def: 'Encaixe da CPU na placa-mãe (ex.: LGA 1700, AM5). CPU e soquete precisam ser do mesmo padrão.' },
        { termo: 'VRM', cat: 'hardware', def: 'Reguladores de tensão ao redor do soquete. Convertem os 12 V da fonte (cabo EPS) na tensão baixa que a CPU usa.' },
        { termo: 'DIMM', cat: 'hardware', def: 'Módulo de memória de desktop. Notebooks usam SO-DIMM, menor. DDR4 e DDR5 têm chanfros em posições diferentes e não se misturam.' },
        { termo: 'Dual channel', cat: 'hardware', def: 'Dois módulos de memória iguais em slots pareados (geralmente A2 e B2) dobram a largura de acesso à memória.' },
        { termo: 'PCI Express', cat: 'hardware', def: 'Barramento dos slots de expansão (x1, x4, x16). A placa de vídeo usa o x16 mais próximo da CPU.' },
        { termo: 'Fonte ATX', cat: 'energia', def: 'Converte a tensão da tomada em +12 V, +5 V e +3,3 V. A certificação 80 Plus indica eficiência, não potência.' },
        { termo: 'Nobreak', cat: 'energia', def: 'Equipamento com bateria que mantém o PC ligado na falta de energia e dá tempo de desligar com segurança.' },
        { termo: 'HDD', cat: 'armazenamento', def: 'Disco rígido: pratos magnéticos girando e cabeça de leitura. Barato por GB, mas lento e sensível a quedas.' },
        { termo: 'SSD', cat: 'armazenamento', def: 'Armazenamento em memória flash, sem partes móveis. SATA (até ~550 MB/s) ou NVMe no slot M.2 (vários GB/s).' },
        { termo: 'M.2 / NVMe', cat: 'armazenamento', def: 'M.2 é o formato do encaixe; NVMe é o protocolo rápido pela via PCIe. Um slot M.2 pode aceitar SATA, NVMe ou os dois.' },
        { termo: 'SMART', cat: 'armazenamento', def: 'Autodiagnóstico dos discos: setores realocados, horas de uso, temperatura. Lido com programas como o CrystalDiskInfo.' },
        { termo: 'Partição', cat: 'software', def: 'Divisão lógica de um disco, que o sistema trata como uma unidade separada (C:, D:…).' },
        { termo: 'MBR / GPT', cat: 'software', def: 'Tabelas de partição. MBR: até 4 primárias e ~2,2 TB. GPT: até 128 partições no Windows, discos enormes, exigido pelo boot UEFI.' },
        { termo: 'Formatação', cat: 'software', def: 'Cria o sistema de arquivos numa partição (NTFS, exFAT, ext4). A formatação rápida não apaga os dados de verdade.' },
        { termo: 'Driver', cat: 'software', def: 'Programa que ensina o sistema operacional a conversar com um dispositivo. Baixe do site do fabricante.' },
        { termo: 'Pasta térmica', cat: 'hardware', def: 'Composto que preenche as microfalhas entre CPU e cooler. Sem ela o ar isola o calor.' },
        { termo: 'ESD', cat: 'seguranca', def: 'Descarga eletrostática: o choque que você nem sente pode queimar um chip. Use pulseira antiestática e toque no gabinete antes das peças.' },
        { termo: 'Malware', cat: 'seguranca', def: 'Software malicioso: vírus, ransomware, spyware, trojans. Prevenção: antivírus ativo, atualizações e cuidado com anexos.' },
        { termo: 'Manutenção preventiva', cat: 'seguranca', def: 'Feita antes do defeito: limpeza, troca de pasta, backup, atualizações e verificação de discos.' },
        { termo: 'Manutenção corretiva', cat: 'seguranca', def: 'Feita depois do defeito: diagnosticar, isolar a peça e reparar ou substituir.' },
        { termo: 'Periférico', cat: 'hardware', def: 'Dispositivo ligado ao computador. Entrada (teclado, mouse), saída (monitor, impressora) ou entrada e saída (pendrive, multifuncional).' }
    ].map(function (t) { t.tecla = TECLAS[t.termo] || t.termo; return congelar(t); }));

    var CATEGORIAS = congelar({ hardware: 'Hardware', firmware: 'Firmware', energia: 'Energia', armazenamento: 'Armazenamento', software: 'Software', seguranca: 'Segurança' });

    function buscarTermos(consulta, categoria) {
        var q = normalizar(consulta);
        return TERMOS.filter(function (t) {
            if (categoria && categoria !== 'todos' && t.cat !== categoria) return false;
            if (!q) return true;
            return normalizar(t.termo + ' ' + t.def).indexOf(q) !== -1;
        });
    }


    /* =====================================================================
     * 5. BENCHMARK (laboratório): mediana das rodadas e razão entre notas
     * ===================================================================== */
    /** Valor do meio depois de ordenar; com quantidade par, média dos dois do meio. */
    function mediana(valores) {
        var v = (valores || []).filter(function (x) { return typeof x === 'number' && isFinite(x); }).slice().sort(function (a, b) { return a - b; });
        if (!v.length) return null;
        var m = Math.floor(v.length / 2);
        return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
    }
    /** Diferença percentual de b em relação a a (positiva = b maior). */
    function diferencaPct(a, b) {
        if (!(a > 0) || typeof b !== 'number') return null;
        return (b - a) / a * 100;
    }

    return {
        normalizar: normalizar,
        COMPONENTES: COMPONENTES, NOMES_SLOT: NOMES_SLOT, estadoInicial: estadoInicial, instalar: instalar, ligar: ligar, faltando: faltando,
        DIAGNOSTICO: DIAGNOSTICO, eFolha: eFolha, passo: passo, validarArvore: validarArvore,
        LIMITE_MBR_GB: LIMITE_MBR_GB, capacidadeReal: capacidadeReal, discoInicial: discoInicial, adicionarParticao: adicionarParticao,
        removerUltima: removerUltima, analisarDisco: analisarDisco,
        TERMOS: TERMOS, CATEGORIAS: CATEGORIAS, buscarTermos: buscarTermos,
        mediana: mediana, diferencaPct: diferencaPct
    };
});
