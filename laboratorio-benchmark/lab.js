/*
 * lab.js · peças próprias do Laboratório de Benchmark (depois de ../logica.js e ../comum.js).
 * Medidor com benchmark ao vivo, botões copiar,
 * parâmetros que se revelam, curvas de clock e quiz certo/errado.
 */
(function () {
    'use strict';
    var L = window.Logica, C = window.Comum, el = C.el;
    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
    function nf(v, d) { return v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }); }

    /* ================= MEDIDOR: benchmark de 1 thread no navegador =================
     * Cada "operação" é um pequeno cálculo inteiro (xorshift + soma). Conta quantas cabem
     * em 0,8 s, em fatias de 16 ms para a página continuar respondendo e o ponteiro se mexer.
     */
    var medidor = $('.medidor'), botao = $('#med-botao'), ponteiro = $('#ponteiro'), arco = $('#arco-valor');
    var notaEl = $('#med-nota'), rodadasEl = $('#med-rodadas'), medianaEl = $('#med-mediana'), rodadaEl = $('#med-rodada');
    var rodadas = [], escala = null, rodando = false;

    function mostrar(valorMil, max) {
        var f = Math.max(0, Math.min(1, valorMil / max));
        ponteiro.style.transform = 'rotate(' + (-90 + f * 180).toFixed(1) + 'deg)';
        arco.style.strokeDasharray = (f * 100).toFixed(1) + ' 100';
    }
    function trabalho(n, s) { for (var i = 0; i < n; i++) { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s = (s + i) | 0; } return s; }

    function umaRodada(fim) {
        var DURACAO = 800, LOTE = 20000, ops = 0, semente = 2463534242 | 0, inicio = performance.now();
        (function fatia() {
            var t0 = performance.now();
            while (performance.now() - t0 < 16) { semente = trabalho(LOTE, semente); ops += LOTE; }
            var passou = performance.now() - inicio;
            var parcial = ops / passou / 1000; // milhões de operações por segundo (ops/ms ÷ 1000)
            if (escala) mostrar(parcial, escala);
            notaEl.textContent = nf(parcial, 1);
            if (passou < DURACAO) requestAnimationFrame(fatia);
            else fim(parcial, semente);
        })();
    }

    botao.addEventListener('click', function () {
        if (rodando) return;
        if (rodadas.length >= 3) { rodadas = []; rodadasEl.textContent = ''; escala = null; }
        rodando = true; botao.disabled = true; medidor.classList.add('rodando');
        medianaEl.textContent = 'Mãos fora do mouse: medindo…';
        umaRodada(function (nota) {
            rodadas.push(nota);
            if (!escala) escala = nota * 1.35; // fundo de escala fixado pela 1ª rodada
            medidor.classList.remove('rodando');
            mostrar(nota, escala);
            notaEl.textContent = nf(nota, 1);
            rodadaEl.textContent = rodadas.length;
            rodadasEl.appendChild(el('li', { texto: nf(nota, 1) }));
            if (rodadas.length < 3) {
                medianaEl.textContent = 'Rodada ' + rodadas.length + ' anotada. Faltam ' + (3 - rodadas.length) + '.';
                botao.lastChild.textContent = ' Próxima rodada';
            } else {
                var med = L.mediana(rodadas);
                var melhor = Math.max.apply(null, rodadas);
                $$('li', rodadasEl).forEach(function (li, i) { li.classList.toggle('meio', rodadas[i] === med); });
                medianaEl.innerHTML = '';
                medianaEl.appendChild(document.createTextNode('Mediana: '));
                medianaEl.appendChild(el('b', { texto: nf(med, 1) }));
                var dif = L.diferencaPct(med, melhor);
                medianaEl.appendChild(document.createTextNode(dif > 0.5 ? '. A melhor rodada foi ' + nf(dif, 1) + '% acima: é por isso que não se usa a melhor.' : '. As rodadas ficaram próximas: medição estável.'));
                notaEl.textContent = nf(med, 1);
                mostrar(med, escala);
                botao.lastChild.textContent = ' Medir de novo';
            }
            rodando = false; botao.disabled = false;
        });
    });

    /* ================= COPIAR COMANDOS ================= */
    $$('.cmd').forEach(function (bloco) {
        var b = el('button', { type: 'button', classe: 'copiar', texto: 'copiar' });
        b.addEventListener('click', function () {
            var txt = $('code', bloco).textContent;
            var ok = function () { b.textContent = 'copiado'; setTimeout(function () { b.textContent = 'copiar'; }, 1400); };
            try { navigator.clipboard.writeText(txt).then(ok, function () { b.textContent = 'selecione e copie'; }); }
            catch (e) { b.textContent = 'selecione e copie'; }
        });
        bloco.appendChild(b);
    });

    /* ================= PARÂMETROS QUE SE REVELAM ================= */
    $$('.revelar').forEach(function (r) {
        r.addEventListener('click', function () { r.setAttribute('aria-expanded', String(r.getAttribute('aria-expanded') !== 'true')); });
    });

    /* ================= CURVAS DE CLOCK ================= */
    var CURVAS = [
        ['Estável', 'sobe ao iniciar a carga e fica estável: a refrigeração dá conta. Típico de desktop.'],
        ['Pico e queda', 'pico nos primeiros segundos, depois cai e estabiliza mais baixo: limite de energia ou de temperatura de longa duração. Típico de notebook.'],
        ['Dente de serra', 'sobe e despenca repetidamente: throttling térmico. Investigue poeira, pasta térmica e ventoinha.'],
        ['Abaixo da base', 'fica abaixo do clock base o tempo todo: plano de energia econômico, bateria ou refrigeração falhando.']
    ];
    var curva = $('#curva'), desc = $('#curva-desc');
    function y(ghz) { return 190 - ghz / 5 * 170; }  // eixo: 0 a 5 GHz; base em 2,9 GHz ≈ y 110 (ajustado abaixo)
    function pontos(c) {
        var p = [], X0 = 40, X1 = 590;
        for (var t = 0; t <= 100; t += 1) {
            var g;
            if (t < 12 || t > 88) g = 1.2;
            else if (c === 0) g = 4.1;
            else if (c === 1) g = t < 26 ? 4.3 : 3.3;
            else if (c === 2) g = (Math.floor((t - 12) / 9) % 2 === 0) ? 4.1 - ((t - 12) % 9) / 9 * 0.5 : 2.3 + ((t - 12) % 9) / 9 * 0.6;
            else g = 2.1;
            p.push((X0 + t / 100 * (X1 - X0)).toFixed(1) + ' ' + y(g).toFixed(1));
        }
        return 'M' + p.join(' L');
    }
    // a linha tracejada do clock base fica em 2,9 GHz
    var base = $('.curvas-grafico .base'), baseTxt = $('.curvas-grafico .base-txt');
    base.setAttribute('y1', y(2.9)); base.setAttribute('y2', y(2.9)); baseTxt.setAttribute('y', y(2.9) - 6);
    function mostrarCurva(c) {
        curva.setAttribute('d', pontos(c));
        var len = curva.getTotalLength ? Math.ceil(curva.getTotalLength()) : 2000;
        curva.style.setProperty('--len', len);
        curva.classList.remove('desenhando'); void curva.getBBox(); if (!C.reduzido) curva.classList.add('desenhando');
        desc.textContent = '';
        desc.appendChild(el('b', { texto: CURVAS[c][0] + ': ' }));
        desc.appendChild(document.createTextNode(CURVAS[c][1]));
    }
    var abasCurva = $$('.curvas-abas button');
    abasCurva.forEach(function (b) {
        b.addEventListener('click', function () {
            abasCurva.forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
            mostrarCurva(+b.dataset.c);
        });
    });
    mostrarCurva(0);

    /* ================= QUIZ CERTO OU ERRADO ================= */
    var itens = $$('#quiz-lista li'), placar = $('#quiz-placar'), acertos = 0, respondidas = 0;
    itens.forEach(function (li) {
        var porque = li.dataset.porque, certo = li.dataset.certo === 'sim';
        var texto = li.textContent;
        li.textContent = '';
        li.appendChild(el('span', { texto: texto }));
        var botoes = el('div', { classe: 'quiz-botoes', role: 'group', 'aria-label': 'Sua resposta' }, [
            el('button', { type: 'button', 'data-r': 'sim', texto: 'Certo' }),
            el('button', { type: 'button', 'data-r': 'nao', texto: 'Errado' })
        ]);
        li.appendChild(botoes);
        var exp = el('p', { classe: 'quiz-porque', 'aria-live': 'polite' });
        li.appendChild(exp);
        $$('button', botoes).forEach(function (b) {
            b.addEventListener('click', function () {
                if (li.dataset.respondida) return;
                li.dataset.respondida = '1';
                var acertou = (b.dataset.r === 'sim') === certo;
                li.classList.add(acertou ? 'acertou' : 'errou');
                exp.textContent = (certo ? 'Certo. ' : 'Errado. ') + porque;
                $$('button', botoes).forEach(function (x) { x.disabled = true; });
                respondidas++; if (acertou) acertos++;
                placar.textContent = acertos + ' de ' + respondidas + ' acertos' + (respondidas === itens.length ? ' · fim' : '');
            });
        });
    });

    /* ================= SIGLAS: glossário + balão ao passar o mouse ou tocar =================
     * Lista em logica.js (SIGLAS). Em cada seção, a primeira vez que uma sigla aparece
     * ela ganha sublinhado pontilhado e um balão com o significado.
     */
    (function () {
        var NOMES = { sigla: 'Siglas', coluna: 'Colunas e linhas da saída dos programas', termo: 'Termos' };
        var gl = $('#glossario');
        if (gl) {
            ['sigla', 'coluna', 'termo'].forEach(function (tipo) {
                gl.appendChild(el('h3', { texto: NOMES[tipo] }));
                L.SIGLAS.filter(function (s) { return s.tipo === tipo; }).forEach(function (s) {
                    gl.appendChild(el('div', {}, [el('dt', { texto: s.sigla }), el('dd', { texto: s.def })]));
                });
            });
        }

        var dica = el('div', { classe: 'dica', role: 'tooltip', id: 'dica-sigla' });
        document.body.appendChild(dica);
        var PULAR = 'pre, script, style, abbr, button, summary, .glossario, .cabeca-n, .estacao-n, .medidor, .divisor, kbd, .cel, .arvore, h1, h2';

        $$('main > section').forEach(function (sec) {
            var vistas = {};
            var walker = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT, {
                acceptNode: function (n) {
                    if (!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                    return n.parentElement.closest(PULAR) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
                }
            });
            var nos = [];
            while (walker.nextNode()) nos.push(walker.currentNode);
            nos.forEach(function (no) {
                // marca, da esquerda para a direita, cada sigla que ainda não apareceu nesta seção
                while (no) {
                    var achadas = L.encontrarSiglas(no.nodeValue).filter(function (s) { return !vistas[s.sigla]; });
                    if (!achadas.length) return;
                    var s = achadas[0];
                    var m = new RegExp(s.fonte, 'u').exec(no.nodeValue);
                    if (!m) return;
                    vistas[s.sigla] = true;
                    var depois = no.splitText(m.index);
                    var resto = depois.splitText(m[0].length);
                    var ab = el('abbr', { classe: 'sigla', tabindex: '0', title: s.def, 'data-sigla': s.sigla, 'aria-describedby': 'dica-sigla' });
                    ab.textContent = depois.nodeValue;
                    depois.parentNode.replaceChild(ab, depois);
                    no = resto;
                }
            });
        });

        var aberta = null;
        function mostrar(ab) {
            var s = L.SIGLAS.filter(function (x) { return x.sigla === ab.dataset.sigla; })[0];
            if (!s) return;
            ab.removeAttribute('title'); // evita o balão nativo duplicado
            dica.textContent = '';
            dica.appendChild(el('b', { texto: s.sigla }));
            dica.appendChild(document.createTextNode(s.def));
            dica.classList.add('on');
            var r = ab.getBoundingClientRect(), d = dica.getBoundingClientRect();
            var x = Math.min(Math.max(12, r.left + r.width / 2 - d.width / 2), innerWidth - d.width - 12);
            var y = r.top - d.height - 8;
            if (y < 8) y = r.bottom + 8;
            dica.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
            aberta = ab;
        }
        function esconder() { dica.classList.remove('on'); aberta = null; }
        document.addEventListener('mouseover', function (e) { var ab = e.target.closest && e.target.closest('abbr.sigla'); if (ab) mostrar(ab); });
        document.addEventListener('mouseout', function (e) { if (e.target.closest && e.target.closest('abbr.sigla')) esconder(); });
        document.addEventListener('focusin', function (e) { if (e.target.matches && e.target.matches('abbr.sigla')) mostrar(e.target); });
        document.addEventListener('focusout', function (e) { if (e.target.matches && e.target.matches('abbr.sigla')) esconder(); });
        document.addEventListener('click', function (e) {
            var ab = e.target.closest && e.target.closest('abbr.sigla');
            if (ab) { if (aberta === ab) esconder(); else mostrar(ab); } else if (aberta) esconder();
        });
        addEventListener('scroll', function () { if (aberta) esconder(); }, { passive: true });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') esconder(); });
    })();
})();
