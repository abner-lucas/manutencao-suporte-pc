/*
 * script.js · interface do portal (tema, rolagem, vista explodida, bancada, laboratórios, teclado).
 * As regras ficam em logica.js (window.Logica), testadas com node --test.
 * Sem bibliotecas: tudo com um único laço de rolagem em requestAnimationFrame.
 */
(function () {
    'use strict';
    var L = window.Logica;
    var doc = document.documentElement;
    var reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
    function el(tag, attrs, filhos) {
        var n = document.createElement(tag);
        Object.keys(attrs || {}).forEach(function (k) {
            if (k === 'texto') n.textContent = attrs[k];
            else if (k === 'classe') n.className = attrs[k];
            else n.setAttribute(k, attrs[k]);
        });
        (filhos || []).forEach(function (f) { if (f) n.appendChild(typeof f === 'string' ? document.createTextNode(f) : f); });
        return n;
    }
    function guardar(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
    function limitar(v) { return Math.min(1, Math.max(0, v)); }
    function suave(t) { return 1 - Math.pow(1 - t, 3); }

    /* ================= TEMA ================= */
    var botaoTema = $('#botao-tema');
    function sincronizarTema() {
        var escuro = doc.dataset.tema === 'escuro';
        botaoTema.setAttribute('aria-pressed', String(escuro));
        botaoTema.setAttribute('aria-label', escuro ? 'Ativar modo claro' : 'Ativar modo escuro');
    }
    sincronizarTema();
    botaoTema.addEventListener('click', function () {
        var trocar = function () {
            doc.dataset.tema = doc.dataset.tema === 'escuro' ? 'claro' : 'escuro';
            guardar('msc:tema', doc.dataset.tema);
            sincronizarTema();
        };
        if (!document.startViewTransition || reduzido) { trocar(); return; }
        var r = botaoTema.getBoundingClientRect();
        var x = r.left + r.width / 2, y = r.top + r.height / 2;
        var raio = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        document.startViewTransition(trocar).ready.then(function () {
            doc.animate({ clipPath: ['circle(0 at ' + x + 'px ' + y + 'px)', 'circle(' + raio + 'px at ' + x + 'px ' + y + 'px)'] },
                { duration: 650, easing: 'cubic-bezier(.16,1,.3,1)', pseudoElement: '::view-transition-new(root)' });
        });
    });

    /* ================= MENU MÓVEL ================= */
    var menu = $('#menu'), botaoMenu = $('#botao-menu');
    function fecharMenu() { menu.classList.remove('aberto'); botaoMenu.setAttribute('aria-expanded', 'false'); botaoMenu.setAttribute('aria-label', 'Abrir menu'); }
    botaoMenu.addEventListener('click', function () {
        var abrir = !menu.classList.contains('aberto');
        menu.classList.toggle('aberto', abrir);
        botaoMenu.setAttribute('aria-expanded', String(abrir));
        botaoMenu.setAttribute('aria-label', abrir ? 'Fechar menu' : 'Abrir menu');
    });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', fecharMenu); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('aberto')) { fecharMenu(); botaoMenu.focus(); } });

    /* ================= TÍTULOS PALAVRA A PALAVRA ================= */
    $$('[data-palavras]').forEach(function (h) {
        var i = 0;
        h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim());
        (function quebrar(no) {
            Array.prototype.slice.call(no.childNodes).forEach(function (n) {
                if (n.nodeType === 3) {
                    var frag = document.createDocumentFragment();
                    n.textContent.split(/(\s+)/).forEach(function (p) {
                        if (!p) return;
                        if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
                        var w = el('span', { classe: 'palavra', 'aria-hidden': 'true' }, [el('span', { texto: p })]);
                        w.firstChild.style.setProperty('--i', i++);
                        frag.appendChild(w);
                    });
                    no.replaceChild(frag, n);
                } else if (n.nodeType === 1) quebrar(n);
            });
        })(h);
    });

    /* ================= REVELAÇÃO ================= */
    $$('.revela').forEach(function (c) { c.style.setProperty('--i', $$(':scope > .revela', c.parentElement).indexOf(c)); });
    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (ents) {
        ents.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visivel'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }) : null;
    $$('.revela, .cabeca h2').forEach(function (n) { if (io) io.observe(n); else n.classList.add('visivel'); });

    /* cupom: imprime uma vez quando a impressora aparece */
    var impressora = $('#impressora'), cupom = $('#cupom');
    function imprimir() {
        if (cupom.classList.contains('impresso')) return;
        impressora.classList.add('imprimindo');
        cupom.classList.add('impresso');
        setTimeout(function () { impressora.classList.remove('imprimindo'); }, reduzido ? 0 : 2400);
    }
    if ('IntersectionObserver' in window) {
        var ioCupom = new IntersectionObserver(function (ents) {
            if (ents[0].isIntersecting) { imprimir(); ioCupom.disconnect(); }
        }, { threshold: 0.35 });
        ioCupom.observe(impressora);
    } else imprimir();

    /* ================= VISTA EXPLODIDA ================= */
    var explode = $('#inicio');
    var trilhoVerbo = $('#verbo-trilho');
    var legendas = $$('.legenda', explode);
    var contador = $('#contador-etapa');
    var pecasEx = $$('.peca-ex', explode).map(function (g) {
        return { g: g, id: g.dataset.peca, dx: +g.dataset.dx, dy: +g.dataset.dy, de: +g.dataset.de, ate: +g.dataset.ate, tampa: g.classList.contains('tampa') };
    });
    var rotulos = $$('.rotulo', explode);
    var etapaAtual = -1;

    function desenharExplode(p) {
        var prog = {};
        pecasEx.forEach(function (pc) {
            var e = pc.ate > pc.de ? suave(limitar((p - pc.de) / (pc.ate - pc.de))) : 1;
            prog[pc.id] = e;
            if (pc.ate > pc.de) pc.g.setAttribute('transform', 'translate(' + (pc.dx * e).toFixed(1) + ' ' + (pc.dy * e).toFixed(1) + ')');
            if (pc.tampa) pc.g.style.opacity = (1 - e).toFixed(3);
        });
        rotulos.forEach(function (r) { r.classList.toggle('on', (prog[r.dataset.de] || 0) > 0.9); });

        var etapa = p < 0.3 ? 0 : p < 0.72 ? 1 : 2;
        var inicio = [0, 0.3, 0.72][etapa], fim = [0.3, 0.72, 1][etapa];
        var local = limitar((p - inicio) / (fim - inicio));
        // tipografia cinética: a palavra se alarga conforme a etapa avança
        explode.style.setProperty('--wdth', (75 + 14 * local).toFixed(1));
        if (etapa !== etapaAtual) {
            etapaAtual = etapa;
            explode.dataset.etapa = etapa;
            trilhoVerbo.style.setProperty('--etapa', etapa);
            legendas.forEach(function (l) { l.classList.toggle('ativa', +l.dataset.etapa === etapa); });
            contador.textContent = '0' + (etapa + 1);
        }
    }
    if (reduzido) desenharExplode(1);
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (ents) { explode.classList.toggle('parado', !ents[0].isIntersecting); }).observe(explode);
    }

    /* ================= LAÇO DE ROLAGEM ================= */
    var topo = $('#topo'), barra = $('#progresso-barra');
    var cenas = $$('.cena');
    var secoes = $$('main section[id]');
    var linksMenu = $$('a', menu);
    var linhasBoot = $$('#bootlog li');
    var ultimoY = scrollY, agendado = false;

    function aoRolar() {
        agendado = false;
        var y = scrollY, vh = innerHeight;
        var max = doc.scrollHeight - vh;
        barra.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
        if (!menu.classList.contains('aberto')) topo.classList.toggle('escondido', y > ultimoY && y > 200);
        ultimoY = y;

        if (!reduzido) {
            var re = explode.getBoundingClientRect();
            if (re.bottom > 0) desenharExplode(limitar(-re.top / (re.height - vh)));
            cenas.forEach(function (c) {
                var t = c.getBoundingClientRect().top;
                c.style.setProperty('--p', limitar((vh - t) / (vh * 0.35)).toFixed(3)); // termina com o topo a ~65% da tela
            });
        }

        var atual = null;
        secoes.forEach(function (s) { if (s.getBoundingClientRect().top < vh * 0.4) atual = s.id; });
        linksMenu.forEach(function (a) {
            if (a.getAttribute('href') === '#' + atual) a.setAttribute('aria-current', 'true');
            else a.removeAttribute('aria-current');
        });

        linhasBoot.forEach(function (li) { li.classList.toggle('ok', reduzido || li.getBoundingClientRect().top < vh * 0.72); });
    }
    addEventListener('scroll', function () { if (!agendado) { agendado = true; requestAnimationFrame(aoRolar); } }, { passive: true });
    addEventListener('resize', aoRolar);

    /* status do log de boot: [ .... ] → [  OK  ] */
    linhasBoot.forEach(function (li) { $('.st', li).innerHTML = '[<em> .... </em><b>  OK  </b>]'; });
    aoRolar();

    /* ================= ABAS DO LABORATÓRIO ================= */
    var abas = $('.abas'), cursorAba = $('.abas-cursor'), botoesAba = $$('.aba', abas);
    function moverCursor(cursor, ativo) {
        if (!ativo) return;
        cursor.style.width = ativo.offsetWidth + 'px';
        cursor.style.transform = 'translateX(' + ativo.offsetLeft + 'px)';
    }
    function ativarAba(b, focar) {
        botoesAba.forEach(function (x) {
            var sel = x === b;
            x.setAttribute('aria-selected', String(sel));
            x.tabIndex = sel ? 0 : -1;
            document.getElementById(x.getAttribute('aria-controls')).hidden = !sel;
        });
        moverCursor(cursorAba, b);
        if (focar) b.focus();
    }
    botoesAba.forEach(function (b, i) {
        b.addEventListener('click', function () { ativarAba(b); });
        b.addEventListener('keydown', function (e) {
            var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
            if (d) { e.preventDefault(); ativarAba(botoesAba[(i + d + botoesAba.length) % botoesAba.length], true); }
        });
    });
    $$('[data-abrir-aba]').forEach(function (a) {
        a.addEventListener('click', function () { ativarAba(document.getElementById(a.dataset.abrirAba)); });
    });
    function posicionarCursor() { moverCursor(cursorAba, $('.aba[aria-selected="true"]')); }
    addEventListener('resize', posicionarCursor);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(posicionarCursor);
    posicionarCursor();

    /* luz do palco segue o ponteiro */
    $$('.palco-inner').forEach(function (palco) {
        palco.addEventListener('pointermove', function (e) {
            var r = palco.getBoundingClientRect();
            palco.style.setProperty('--mx', (e.clientX - r.left) + 'px');
            palco.style.setProperty('--my', (e.clientY - r.top) + 'px');
        });
    });

    /* ================= BANCADA: MONTAGEM + POST ================= */
    var bancada = $('#bancada-fig'), placa = $('#placa'), moldura = $('#placa-moldura');
    var bandeja = $('#bandeja'), linhasTela = $('#tela-linhas'), resultadoTela = $('#tela-resultado');
    var botaoLigar = $('#botao-ligar'), botaoSom = $('#botao-som');
    var slots = $$('.slot', placa);
    var SIGLAS = { cpu: 'CPU', pasta: 'TIM', cooler: 'FAN', ram: 'RAM', ssd: 'M.2', gpu: 'GPU', eps: '8p', atx24: '24p' };
    var estado = L.estadoInicial();
    var selecionada = null, ligando = false, som = false, timers = [];

    Object.keys(L.COMPONENTES).forEach(function (id) {
        var b = el('button', { type: 'button', classe: 'chip-peca', 'data-id': id, 'aria-pressed': 'false' },
            [el('i', { 'aria-hidden': 'true', texto: SIGLAS[id] }), L.COMPONENTES[id].nome]);
        bandeja.appendChild(el('li', {}, [b]));
    });
    var chips = $$('.chip-peca', bandeja);

    function linha(txt, tipo) {
        linhasTela.appendChild(el('li', { classe: tipo ? 'tela-' + tipo : '', texto: txt }));
        while (linhasTela.children.length > 7) linhasTela.removeChild(linhasTela.firstChild);
    }
    function limparTela() { linhasTela.textContent = ''; resultadoTela.textContent = ''; resultadoTela.className = 'tela-resultado'; }

    function selecionar(id) {
        selecionada = selecionada === id ? null : id;
        chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.dataset.id === selecionada)); });
        bancada.classList.toggle('selecionando', !!selecionada);
        slots.forEach(function (s) { s.classList.toggle('alvo', !!selecionada); });
        if (selecionada) linha('Peça na mão: ' + L.COMPONENTES[selecionada].nome + '. Escolha o encaixe.', 'info');
    }
    function desligar() {
        timers.forEach(clearTimeout); timers = [];
        bancada.classList.remove('ligado', 'girar');
        ligando = false; botaoLigar.disabled = false;
    }
    function render() {
        chips.forEach(function (c) { c.disabled = estado.instalados.indexOf(c.dataset.id) !== -1; });
        $$('.peca', placa).forEach(function (p) { p.classList.toggle('instalada', estado.instalados.indexOf(p.dataset.peca) !== -1); });
    }
    function tentar(id, slot, slotEl) {
        if (ligando) return;
        desligar();
        var r = L.instalar(estado, id, slot);
        if (r.ok) estado = r.estado;
        else if (slotEl) { slotEl.classList.remove('errado'); void slotEl.getBBox(); slotEl.classList.add('errado'); setTimeout(function () { slotEl.classList.remove('errado'); }, 450); }
        resultadoTela.textContent = '';
        linha(r.msg, r.tipo === 'ok' ? '' : r.tipo);
        if (selecionada) selecionar(selecionada);
        render();
        if (r.ok && L.faltando(estado).length === 0) linha('Todas as peças instaladas. Aperte Ligar.', 'info');
    }

    chips.forEach(function (c) {
        var inicio = null, arrastando = false, fantasma = null, sobre = null, ignorarClique = false;
        c.addEventListener('click', function () { if (ignorarClique) { ignorarClique = false; return; } selecionar(c.dataset.id); });
        c.addEventListener('pointerdown', function (e) {
            if (c.disabled || e.button !== 0) return;
            inicio = { x: e.clientX, y: e.clientY };
            try { c.setPointerCapture(e.pointerId); } catch (err) {}
        });
        c.addEventListener('pointermove', function (e) {
            if (!inicio) return;
            if (!arrastando && Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) > 8) {
                arrastando = true;
                fantasma = c.cloneNode(true);
                fantasma.classList.add('fantasma');
                fantasma.style.width = c.offsetWidth + 'px';
                document.body.appendChild(fantasma);
                if (selecionada !== c.dataset.id) selecionar(c.dataset.id);
            }
            if (!arrastando) return;
            fantasma.style.left = e.clientX + 'px';
            fantasma.style.top = e.clientY + 'px';
            var alvo = document.elementFromPoint(e.clientX, e.clientY);
            var s = alvo && alvo.closest ? alvo.closest('.slot') : null;
            if (s !== sobre) { if (sobre) sobre.classList.remove('sobre'); sobre = s; if (s) s.classList.add('sobre'); }
        });
        function soltar() {
            if (arrastando) {
                ignorarClique = true;
                if (fantasma) fantasma.remove();
                if (sobre) { sobre.classList.remove('sobre'); tentar(c.dataset.id, sobre.dataset.slot, sobre); }
                else if (selecionada) selecionar(selecionada);
                setTimeout(function () { ignorarClique = false; }, 50);
            }
            inicio = null; arrastando = false; fantasma = null; sobre = null;
        }
        c.addEventListener('pointerup', soltar);
        c.addEventListener('pointercancel', soltar);
    });

    slots.forEach(function (s) {
        var acao = function () {
            if (selecionada) tentar(selecionada, s.dataset.slot, s);
            else linha('Esse é o ' + L.NOMES_SLOT[s.dataset.slot] + '. Escolha uma peça na bandeja primeiro.', 'info');
        };
        s.addEventListener('click', acao);
        s.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); acao(); } });
    });

    /* som opcional: bipes do POST (Web Audio) */
    var audio = null;
    function bipe(dur, atraso, freq) {
        if (!som) return;
        try {
            audio = audio || new (window.AudioContext || window.webkitAudioContext)();
            var o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime + (atraso || 0);
            o.type = 'square'; o.frequency.value = freq || 880;
            g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.08, t + 0.01);
            g.gain.setValueAtTime(0.08, t + dur); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.03);
            o.connect(g).connect(audio.destination); o.start(t); o.stop(t + dur + 0.05);
        } catch (e) {}
    }
    var BIPES = { ok: [[0.12, 0]], 'sem-memoria': [[0.5, 0], [0.5, 0.7], [0.5, 1.4]], 'sem-video': [[0.6, 0], [0.15, 0.8], [0.15, 1.05], [0.15, 1.3]] };
    botaoSom.addEventListener('click', function () {
        som = !som;
        botaoSom.setAttribute('aria-pressed', String(som));
        botaoSom.textContent = som ? 'Som: ligado' : 'Som: desligado';
    });

    botaoLigar.addEventListener('click', function () {
        if (ligando) return;
        desligar();
        if (selecionada) selecionar(selecionada);
        var r = L.ligar(estado);
        ligando = true; botaoLigar.disabled = true;
        limparTela();
        if (r.ventoinhas) bancada.classList.add('ligado', 'girar');
        var passo = reduzido ? 0 : 420;
        r.etapas.forEach(function (et, i) {
            timers.push(setTimeout(function () { linha(et.texto, et.status === 'ok' ? '' : et.status); }, i * passo));
        });
        timers.push(setTimeout(function () {
            var res = r.resultado;
            resultadoTela.className = 'tela-resultado' + (res.codigo === 'ok' ? '' : ' falha');
            resultadoTela.textContent = '';
            resultadoTela.appendChild(el('strong', { texto: res.titulo }));
            resultadoTela.appendChild(document.createTextNode(res.explicacao));
            (BIPES[res.codigo] || []).forEach(function (b) { bipe(b[0], b[1]); });
            if (res.codigo === 'termico') timers.push(setTimeout(function () { bancada.classList.remove('ligado', 'girar'); }, reduzido ? 0 : 900));
            ligando = false; botaoLigar.disabled = false;
        }, r.etapas.length * passo + (reduzido ? 0 : 200)));
    });

    $('#botao-desmontar').addEventListener('click', function () {
        desligar();
        if (selecionada) selecionar(selecionada);
        estado = L.estadoInicial();
        render(); limparTela();
        linha('Placa vazia de novo. Desconecte sempre da tomada antes de desmontar.', 'info');
    });

    if (!reduzido && matchMedia('(pointer: fine)').matches) {
        moldura.addEventListener('pointermove', function (e) {
            var r = moldura.getBoundingClientRect();
            var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
            placa.style.setProperty('--rx', (-y * 7).toFixed(2) + 'deg');
            placa.style.setProperty('--ry', (x * 9).toFixed(2) + 'deg');
        });
        moldura.addEventListener('pointerleave', function () { placa.style.setProperty('--rx', '0deg'); placa.style.setProperty('--ry', '0deg'); });
    }
    render();

    /* ================= DIAGNÓSTICO ================= */
    var caixaPergunta = $('#diag-pergunta'), listaCaminho = $('#diag-caminho');
    var historico = [];
    var atualDiag = 'inicio';

    function renderDiag(focar) {
        var no = L.DIAGNOSTICO[atualDiag];
        caixaPergunta.textContent = '';
        caixaPergunta.classList.toggle('diag-folha', L.eFolha(no));
        var titulo;
        if (L.eFolha(no)) {
            caixaPergunta.appendChild(el('p', { classe: 'diag-etapa' }, ['causa provável', el('span', { classe: 'diag-tipo', texto: 'manutenção ' + no.tipo })]));
            titulo = el('h3', { tabindex: '-1', texto: no.causa });
            caixaPergunta.appendChild(titulo);
            caixaPergunta.appendChild(el('ol', { classe: 'diag-acoes' }, no.acoes.map(function (a) { return el('li', { texto: a }); })));
        } else {
            caixaPergunta.appendChild(el('p', { classe: 'diag-etapa', texto: 'pergunta ' + String(historico.length + 1).padStart(2, '0') }));
            titulo = el('h3', { tabindex: '-1', texto: no.pergunta });
            caixaPergunta.appendChild(titulo);
            if (no.ajuda) caixaPergunta.appendChild(el('p', { classe: 'diag-ajuda', texto: no.ajuda }));
            caixaPergunta.appendChild(el('ul', { classe: 'diag-opcoes' }, no.opcoes.map(function (o, i) {
                var b = el('button', { type: 'button', 'data-n': String(i + 1), texto: o.txt });
                b.addEventListener('click', function () {
                    historico.push({ id: atualDiag, indice: i });
                    atualDiag = L.passo(atualDiag, i);
                    renderDiag(true);
                });
                return el('li', {}, [b]);
            })));
        }
        listaCaminho.textContent = '';
        historico.forEach(function (h) { listaCaminho.appendChild(el('li', { texto: L.DIAGNOSTICO[h.id].opcoes[h.indice].txt })); });
        $('#diag-voltar').disabled = historico.length === 0;
        if (focar) titulo.focus({ preventScroll: true });
    }
    $('#diag-voltar').addEventListener('click', function () { var h = historico.pop(); if (h) { atualDiag = h.id; renderDiag(true); } });
    $('#diag-reiniciar').addEventListener('click', function () { historico = []; atualDiag = 'inicio'; renderDiag(true); });
    renderDiag(false);

    /* ================= PARTICIONADOR ================= */
    var formConfig = $('#part-config'), formNova = $('#part-nova');
    var selTamanho = $('#part-tamanho'), selTipo = $('#part-tipo');
    var barraDisco = $('#disco-barra'), analise = $('#part-analise');
    var disco, ultimaMsg = null;
    var NOMES_TIPO = { primaria: 'primária', estendida: 'estendida', logica: 'lógica', gpt: 'partição' };

    function lerConfig() {
        return {
            tamanho: Number(selTamanho.value),
            esquema: formConfig.querySelector('input[name="esquema"]:checked').value,
            firmware: formConfig.querySelector('input[name="firmware"]:checked').value
        };
    }
    function novoDisco(msg) {
        var c = lerConfig();
        disco = L.discoInicial(c.tamanho, c.esquema, c.firmware);
        selTipo.disabled = c.esquema === 'GPT';
        selTipo.title = c.esquema === 'GPT' ? 'GPT não divide em primária, estendida e lógica' : '';
        ultimaMsg = msg || null;
        renderDisco();
    }
    function rotuloSeg(p) { return p.rotulo || NOMES_TIPO[p.tipo]; }
    function renderDisco() {
        barraDisco.textContent = '';
        var total = disco.tamanho;
        var logicas = disco.particoes.filter(function (p) { return p.tipo === 'logica'; });
        disco.particoes.forEach(function (p) {
            if (p.tipo === 'logica') return;
            var seg = el('div', { classe: 'disco-seg', 'data-tipo': p.tipo, title: rotuloSeg(p) + ' · ' + p.tamanho + ' GB' });
            seg.style.flex = '0 0 ' + (p.tamanho / total * 100) + '%';
            if (p.tipo === 'estendida') {
                logicas.forEach(function (lg) {
                    var d = el('div', { classe: 'disco-logica', title: rotuloSeg(lg) + ' · ' + lg.tamanho + ' GB' }, [el('span', { texto: rotuloSeg(lg) })]);
                    d.style.flex = '0 0 calc(' + (lg.tamanho / p.tamanho * 100) + '% - 3px)';
                    seg.appendChild(d);
                });
                if (!logicas.length) seg.appendChild(el('span', { texto: 'estendida (vazia)' }));
            } else {
                seg.appendChild(el('span', { texto: rotuloSeg(p) }));
                seg.appendChild(el('small', { texto: p.tamanho + ' GB' }));
            }
            barraDisco.appendChild(seg);
        });
        var a = L.analisarDisco(disco);
        if (a.livre > 0) { var vz = el('div', { 'aria-hidden': 'true' }); vz.style.flex = '1 1 0'; barraDisco.appendChild(vz); }
        if (total > a.limite) {
            var ina = el('div', { classe: 'disco-seg disco-seg-inacessivel', title: 'inacessível com MBR' }, [el('span', { texto: 'inacessível' })]);
            ina.style.flex = '0 0 ' + ((total - a.limite) / total * 100) + '%';
            barraDisco.appendChild(ina);
        }
        $('#disco-uso').textContent = 'usado ' + a.usado + ' GB · livre ' + a.livre + ' GB';
        $('#disco-real').textContent = total + ' GB na caixa ≈ ' + String(L.capacidadeReal(total)).replace('.', ',') + ' GB no Windows (base 2)';

        analise.textContent = '';
        function msg(tipo, titulo, texto) { analise.appendChild(el('div', { classe: 'msg msg-' + tipo }, [el('strong', { texto: titulo }), texto])); }
        if (ultimaMsg) msg(ultimaMsg.tipo, ultimaMsg.titulo, ultimaMsg.texto);
        msg(a.boot.ok ? 'ok' : 'erro', a.boot.ok ? 'Windows inicia' : 'Windows não inicia', a.boot.msg);
        a.alertas.forEach(function (al) { msg(al.tipo, al.tipo === 'aviso' ? 'Atenção' : 'Bom saber', al.msg); });
        $('#part-desfazer').disabled = disco.particoes.length === 0;
    }
    formConfig.addEventListener('change', function () {
        novoDisco({ tipo: 'info', titulo: 'Disco reiniciado', texto: 'Trocar a tabela (MBR ↔ GPT) exige apagar todas as partições, como no Gerenciamento de Disco do Windows.' });
    });
    formNova.addEventListener('submit', function (e) {
        e.preventDefault();
        var gb = $('#part-gb').value.trim();
        var r = L.adicionarParticao(disco, { tipo: selTipo.value, tamanho: gb === '' ? NaN : Number(gb), rotulo: $('#part-rotulo').value.trim() });
        if (r.ok) { disco = r.disco; $('#part-rotulo').value = ''; }
        ultimaMsg = { tipo: r.ok ? 'ok' : 'erro', titulo: r.ok ? 'Partição criada' : 'Não foi possível', texto: r.msg };
        renderDisco();
    });
    $('#part-desfazer').addEventListener('click', function () {
        disco = L.removerUltima(disco);
        ultimaMsg = { tipo: 'info', titulo: 'Desfeito', texto: 'A última partição foi apagada.' };
        renderDisco();
    });
    novoDisco();

    /* ================= TERMOS: TECLADO ================= */
    var teclado = $('#teclado'), campoQ = $('#termos-q');
    var visorCat = $('#visor-cat'), visorTermo = $('#visor-termo'), visorDef = $('#visor-def');
    var CORES = { hardware: '#e7e4d8', firmware: '#c6ff5a', energia: '#e3914f', armazenamento: '#3a4640', software: '#bcc3be', seguranca: '#f2694c' };
    var digitando = null;

    function mostrarTermo(t, botao) {
        $$('.tecla', teclado).forEach(function (k) { k.setAttribute('aria-pressed', String(k === botao)); });
        visorCat.textContent = L.CATEGORIAS[t.cat];
        visorTermo.textContent = t.termo;
        clearInterval(digitando);
        if (reduzido) { visorDef.textContent = t.def; return; }
        var i = 0;
        visorDef.textContent = '';
        digitando = setInterval(function () {
            i += 3;
            visorDef.textContent = t.def.slice(0, i);
            if (i >= t.def.length) clearInterval(digitando);
        }, 16);
    }
    L.TERMOS.forEach(function (t, i) {
        var k = el('button', { type: 'button', classe: 'tecla', 'data-cat': t.cat, 'aria-pressed': 'false', 'aria-label': t.termo, texto: t.tecla });
        k.addEventListener('click', function () {
            k.classList.add('batida');
            setTimeout(function () { k.classList.remove('batida'); }, 110);
            mostrarTermo(t, k);
        });
        k.dataset.indice = i;
        teclado.appendChild(k);
    });
    var teclas = $$('.tecla', teclado);
    teclado.appendChild(el('span', { classe: 'tecla tecla-espaco', 'aria-hidden': 'true' })); // barra de espaço decorativa fecha a última fileira
    var legenda = $('#teclado-legenda');
    Object.keys(L.CATEGORIAS).forEach(function (c) {
        var s = el('span', {}, [el('i', { 'aria-hidden': 'true' }), L.CATEGORIAS[c]]);
        s.firstChild.style.setProperty('--c', CORES[c]);
        legenda.appendChild(s);
    });
    campoQ.addEventListener('input', function () {
        var achados = L.buscarTermos(campoQ.value);
        var nomes = achados.map(function (t) { return t.termo; });
        teclas.forEach(function (k, i) { k.classList.toggle('apagada', nomes.indexOf(L.TERMOS[i].termo) === -1); });
        if (achados.length) mostrarTermo(achados[0], teclas[L.TERMOS.indexOf(achados[0])]);
        else { visorCat.textContent = 'sem resultado'; visorTermo.textContent = 'Nenhuma tecla com esse termo'; visorDef.textContent = 'Tente outra palavra, sem se preocupar com acentos.'; }
    });
    mostrarTermo(L.TERMOS[0], teclas[0]);
    // na carga não precisa animar a digitação
    clearInterval(digitando); visorDef.textContent = L.TERMOS[0].def;
})();
