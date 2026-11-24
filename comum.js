/*
 * comum.js · comportamento compartilhado pelas subpáginas (disciplina, laboratório).
 * Tema, menu móvel, títulos palavra a palavra, revelação, divisores de trilha,
 * log de boot ([ OK ] ao rolar), barra de progresso, cabeçalho e seção atual no menu.
 * Expõe window.Comum.el() para os scripts de cada página.
 */
(function () {
    'use strict';
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
    function aoVer(alvos, fn, opcoes) {
        if (!('IntersectionObserver' in window) || reduzido) { alvos.forEach(fn); return; }
        var io = new IntersectionObserver(function (ents) {
            ents.forEach(function (e) { if (e.isIntersecting) { fn(e.target); io.unobserve(e.target); } });
        }, opcoes || { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
        alvos.forEach(function (a) { io.observe(a); });
    }
    window.Comum = { el: el, aoVer: aoVer, reduzido: reduzido };

    /* ---------- tema ---------- */
    var botaoTema = $('#botao-tema');
    function sincronizarTema() {
        var escuro = doc.dataset.tema === 'escuro';
        botaoTema.setAttribute('aria-pressed', String(escuro));
        botaoTema.setAttribute('aria-label', escuro ? 'Ativar modo claro' : 'Ativar modo escuro');
    }
    if (botaoTema) {
        sincronizarTema();
        var trocandoTema = false;
        var liberarTema = function () { trocandoTema = false; requestAnimationFrame(function () { doc.classList.remove('sem-transicao'); }); };
        botaoTema.addEventListener('click', function () {
            if (trocandoTema) return; // um clique só: ignora cliques durante a animação
            trocandoTema = true;
            var trocar = function () {
                doc.classList.add('sem-transicao'); // sem esmaecer cores: o círculo revela o tema final
                doc.dataset.tema = doc.dataset.tema === 'escuro' ? 'claro' : 'escuro';
                try { localStorage.setItem('msc:tema', doc.dataset.tema); } catch (e) {}
                sincronizarTema();
            };
            if (!document.startViewTransition || reduzido) { trocar(); liberarTema(); return; }
            var r = botaoTema.getBoundingClientRect();
            var x = r.left + r.width / 2, y = r.top + r.height / 2;
            var raio = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
            var vt = document.startViewTransition(trocar);
            vt.finished.then(liberarTema, liberarTema);
            vt.ready.then(function () {
                doc.animate({ clipPath: ['circle(0 at ' + x + 'px ' + y + 'px)', 'circle(' + raio + 'px at ' + x + 'px ' + y + 'px)'] },
                    { duration: 650, easing: 'cubic-bezier(.16,1,.3,1)', pseudoElement: '::view-transition-new(root)' });
            }).catch(function () {}); // transição pulada: o tema já trocou, só não anima
        });
    }

    /* ---------- menu móvel ---------- */
    var menu = $('#menu'), botaoMenu = $('#botao-menu');
    function fecharMenu() { menu.classList.remove('aberto'); botaoMenu.setAttribute('aria-expanded', 'false'); botaoMenu.setAttribute('aria-label', 'Abrir menu'); }
    if (menu && botaoMenu) {
        botaoMenu.addEventListener('click', function () {
            var abrir = !menu.classList.contains('aberto');
            menu.classList.toggle('aberto', abrir);
            botaoMenu.setAttribute('aria-expanded', String(abrir));
            botaoMenu.setAttribute('aria-label', abrir ? 'Fechar menu' : 'Abrir menu');
        });
        $$('a', menu).forEach(function (a) { a.addEventListener('click', fecharMenu); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('aberto')) { fecharMenu(); botaoMenu.focus(); } });
    }

    /* ---------- títulos palavra a palavra ---------- */
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

    /* ---------- revelação ---------- */
    $$('.revela').forEach(function (c) { c.style.setProperty('--i', Math.min($$(':scope > .revela', c.parentElement).indexOf(c), 4)); });
    aoVer($$('.revela, .cabeca h2'), function (n) { n.classList.add('visivel'); });

    /* ---------- divisores: trilha de cobre com conector ---------- */
    var NS = 'http://www.w3.org/2000/svg';
    function svg(tag, attrs) {
        var n = document.createElementNS(NS, tag);
        Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
        return n;
    }
    function trilha(lado) {
        var d = lado === 'e' ? 'M0 14 H70 L84 46 H100' : 'M0 46 H16 L30 14 H100';
        var s = svg('svg', { viewBox: '0 0 100 60', preserveAspectRatio: 'none', class: 'divisor-trilha divisor-' + lado });
        ['tr-base', 'tr-cobre', 'tr-pulso'].forEach(function (c) { s.appendChild(svg('path', { d: d, class: c, 'vector-effect': 'non-scaling-stroke' })); });
        return s;
    }
    var divisores = $$('.divisor');
    divisores.forEach(function (dv) {
        dv.appendChild(el('span', { classe: 'divisor-via divisor-via-e' }));
        dv.appendChild(trilha('e'));
        dv.appendChild(el('div', { classe: 'divisor-chip' }, [
            el('span', { classe: 'divisor-ref', texto: dv.dataset.ref }),
            el('span', { classe: 'divisor-n', texto: dv.dataset.n }),
            el('span', { classe: 'divisor-rot', texto: dv.dataset.rotulo }),
            el('i', { classe: 'divisor-led' })
        ]));
        dv.appendChild(trilha('d'));
        dv.appendChild(el('span', { classe: 'divisor-via divisor-via-d' }));
    });
    if ('IntersectionObserver' in window && !reduzido) {
        var ioDiv = new IntersectionObserver(function (ents) {
            ents.forEach(function (e) {
                if (e.isIntersecting) e.target.classList.add('ligado');
                e.target.classList.toggle('na-tela', e.isIntersecting);
            });
        }, { rootMargin: '0px 0px -12% 0px' });
        divisores.forEach(function (dv) { ioDiv.observe(dv); });
    } else divisores.forEach(function (dv) { dv.classList.add('ligado', 'na-tela'); });

    /* ---------- log de boot: [ .... ] → [  OK  ] ao rolar ---------- */
    var linhasBoot = $$('.bootlog li');
    linhasBoot.forEach(function (li) { var st = $('.st', li); if (st && !st.innerHTML) st.innerHTML = '[<em> .... </em><b>  OK  </b>]'; });

    /* ---------- rolagem ---------- */
    var topo = $('#topo'), barra = $('#progresso-barra');
    var links = menu ? $$('a[href^="#"]', menu) : [];
    var secoes = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
    var ultimoY = scrollY, agendado = false;
    function aoRolar() {
        agendado = false;
        var y = scrollY, vh = innerHeight, max = doc.scrollHeight - vh;
        if (barra) barra.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
        if (topo && !(menu && menu.classList.contains('aberto'))) topo.classList.toggle('escondido', y > ultimoY && y > 200);
        ultimoY = y;
        var atual = -1;
        secoes.forEach(function (s, i) {
            // um link pode representar várias seções (data-grupo="seletor")
            var g = links[i].dataset.grupo;
            var alvos = g ? $$(g) : (s ? [s] : []);
            alvos.forEach(function (a) { var r = a.getBoundingClientRect(); if (r.top < vh * 0.4 && r.bottom > vh * 0.4) atual = i; });
        });
        links.forEach(function (a, i) { if (i === atual) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
        linhasBoot.forEach(function (li) { li.classList.toggle('ok', reduzido || li.getBoundingClientRect().top < vh * 0.72); });
    }
    addEventListener('scroll', function () { if (!agendado) { agendado = true; requestAnimationFrame(aoRolar); } }, { passive: true });
    addEventListener('resize', aoRolar);
    aoRolar();

    /* luz dos palcos segue o ponteiro */
    $$('.palco-inner').forEach(function (p) {
        p.addEventListener('pointermove', function (e) {
            var r = p.getBoundingClientRect();
            p.style.setProperty('--mx', (e.clientX - r.left) + 'px');
            p.style.setProperty('--my', (e.clientY - r.top) + 'px');
        });
    });
})();
