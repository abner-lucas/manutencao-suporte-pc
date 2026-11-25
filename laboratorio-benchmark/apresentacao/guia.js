/*
 * guia.js · ajuda dos slides (carregado depois do script principal e de ../../logica.js).
 * 1. No alto de cada slide: as siglas que aparecem nele, com o significado curto.
 * 2. Slide "Siglas que vão aparecer": a lista completa.
 * 3. Na barra de baixo: onde anotar na planilha o que o slide pede (mapa ANOTAR, pelo título do slide).
 */
(function () {
    'use strict';
    var L = window.Logica;
    if (!L || !L.SIGLAS) return;
    function el(tag, cls, txt) { var n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; }

    /* COMO EDITAR: chave = data-title do slide; valor = onde anotar (aparece na barra de baixo). */
    var ANOTAR = {
        'Como anotar: a planilha': 'Planilha registro_benchmark.xlsx · amarelo = digitar · branco = calcula',
        'O kit na pasta bench': 'Deixe a planilha aberta: modelo-de-entrega › registro_benchmark.xlsx',
        'Gerenciador · CPU': 'Ficha › B8 modelo · B9 núcleos · B10 lógicos · B11 base · B12 cache',
        'Gerenciador · Memória e Disco': 'Ficha › B13 RAM · B14 MT/s · B15 slots · B16 tipo de disco',
        'msinfo32 · dxdiag · systeminfo': 'Ficha › B7 nome · B17 vídeo · B18 Windows · B19 e B20 navegadores',
        'Modelo da ficha': 'Ficha › coluna B',
        'JetStream 3 · onde clicar': 'Medicoes › D6 · E6 · F6 (rodadas 1, 2 e 3)',
        '7-Zip · comandos': 'Medicoes › Rating: 7za b D8 · -mmt1 D9 · -mmt2 D10 · -mmt4 D11 · R/U D12',
        '7-Zip · ler a saída': 'Medicoes › último número do Tot (Rating) e o do meio (R/U) · colunas D, E, F',
        '7-Zip · razão todos/1 thread': 'Medicoes › G35 calcula sozinho',
        'IPC do 7-Zip': 'Medicoes › G36 calcula sozinho (depois de colar o Log CPU)',
        'Os testes web': 'Medicoes › Speedometer linhas 14 e 15 · MotionMark 16 (número antes do @) · Framerate 17',
        'Speedometer · onde clicar': 'Medicoes › navegador 1 linha 14 · navegador 2 linha 15 · só a nota, sem o ±',
        'Experimento: navegador × navegador': 'Medicoes › linha 14 (navegador 1) · linha 15 (navegador 2)',
        'DiskSpd · comandos': 'Os resultados vão para d1.txt a d5.txt, na pasta amd64',
        'DiskSpd · ler o resultado': 'Medicoes › d1 D19 · d2 D20 · d3 D21 IOPS, D22 AvgLat, D23 99th · d4 D24 · d5 D25',
        'Calculadora IOPS × bloco': 'Medicoes › G37 confere sozinho',
        'Forma 1: observar': 'Caderno: a Velocidade a cada 30 segundos',
        'Forma 2: registrar': 'Nada a digitar agora: o log vai para a aba Log CPU no fim',
        'Roteiro do estresse': 'Nada a digitar agora: o log vai para a aba Log CPU no fim',
        'Fazer o gráfico': 'Log CPU › A1 › Ctrl + V',
        'Ler a curva': 'Ficha › B11 base · Medicoes › G33 sugere · G32 escolha o formato',
        'Parte B · escolha a hipótese': 'Experimento › B3 hipótese · siga o quadro dela na página do laboratório',
        'O que entregar': 'Arquivo › Salvar como › SeuNome_registro.xlsx'
    };

    var slides = Array.prototype.slice.call(document.querySelectorAll('#deck .slide'));

    /* 1. legenda de siglas no alto de cada slide (só siglas e colunas; termos ficam no glossário da página) */
    slides.forEach(function (s) {
        if (s.dataset.title === 'Siglas que vão aparecer') return;
        var achadas = L.encontrarSiglas(s.textContent, ['sigla', 'coluna']).slice(0, 9);
        if (!achadas.length) return;
        var p = el('p', 'siglas-slide');
        p.setAttribute('aria-label', 'Siglas deste slide');
        achadas.forEach(function (x) {
            var item = el('span');
            item.appendChild(el('b', null, x.sigla));
            item.appendChild(document.createTextNode(' ' + x.curta));
            p.appendChild(item);
        });
        s.appendChild(p);
    });

    /* 2. slide com todas as siglas */
    var gs = document.getElementById('glosslide');
    if (gs) L.SIGLAS.filter(function (x) { return x.tipo === 'sigla'; }).forEach(function (x) {
        var d = el('div');
        d.appendChild(el('dt', null, x.sigla));
        d.appendChild(el('dd', null, x.curta));
        gs.appendChild(d);
    });

    /* 3. barra "anote em" na barra de baixo, trocando junto com o slide */
    var hud = document.getElementById('hud'), titulo = document.getElementById('stitle');
    if (!hud || !titulo) return;
    var pilula = el('span', 'anote-hud');
    pilula.setAttribute('aria-live', 'polite');
    titulo.parentNode.insertBefore(pilula, titulo.nextSibling);
    function atualizar() {
        var t = ANOTAR[titulo.textContent];
        pilula.textContent = t || '';
        pilula.hidden = !t;
    }
    new MutationObserver(atualizar).observe(titulo, { childList: true, characterData: true, subtree: true });
    atualizar();

    /* estilos (ficam aqui para não mexer no CSS do arquivo da apresentação) */
    var css = el('style');
    css.textContent =
        '.siglas-slide{position:absolute;left:72px;right:72px;top:12px;margin:0;display:flex;flex-wrap:wrap;gap:2px 16px;font:500 12.5px/1.45 var(--f-mono);color:var(--muted);max-width:none;pointer-events:none}' +
        '.siglas-slide b{color:var(--accent);font-weight:700}' +
        '.anote-hud{display:inline-flex;align-items:center;gap:8px;max-width:58vw;padding:4px 12px 4px 8px;border-radius:6px;background:#fff2b3;color:#3a3200;font:600 13px var(--f-mono);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
        '.anote-hud::before{content:"anote";flex:none;padding:1px 6px;border-radius:4px;background:#3a3200;color:#fff2b3;font-size:11px;text-transform:uppercase;letter-spacing:.06em}' +
        '.anote-hud[hidden]{display:none}' +
        '.glosslide{display:grid;grid-template-columns:repeat(3,1fr);gap:2px 40px;margin:6px 0 0}' +
        '.glosslide div{display:flex;gap:10px;align-items:baseline;padding:6px 0;border-bottom:1px solid var(--line)}' +
        '.glosslide dt{flex:none;min-width:150px;font:700 17px var(--f-mono);color:var(--accent)}' +
        '.glosslide dd{margin:0;font-size:16px;color:var(--ink)}';
    document.head.appendChild(css);
})();
