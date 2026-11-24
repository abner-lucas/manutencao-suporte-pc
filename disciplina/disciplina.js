/*
 * disciplina.js · peças próprias da página da disciplina (depois de ../comum.js).
 * Conta as aulas de cada unidade, monta o mapa (barramento) e enche os slots ao rolar.
 * Nada aqui depende de data: o plano é de referência.
 */
(function () {
    'use strict';
    var C = window.Comum, el = C.el;
    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

    var unidades = $$('.unidade');
    var totalAulas = 0;
    var regua = $('#regua');

    unidades.forEach(function (u) {
        var aulas = $$('.aula', u), aval = $$('.aula-avaliativa', u).length;
        totalAulas += aulas.length;
        $('.u-conta', u).textContent = aulas.length + ' aulas' + (aval ? ' · ' + aval + (aval === 1 ? ' avaliativa' : ' avaliativas') : '');
        var num = $('.u-num', u).textContent;
        var titulo = $('h2', u).textContent;
        var trecho = el('a', { classe: 'regua-u', href: '#' + u.id, 'aria-label': 'Unidade ' + num.slice(1) + ': ' + titulo + ', ' + aulas.length + ' aulas' }, [
            el('b', { texto: num }), el('span', { texto: titulo })
        ]);
        trecho.style.setProperty('--peso', aulas.length);
        regua.appendChild(trecho);
    });
    $('#spec-aulas').textContent = totalAulas;
    $('#spec-unidades').textContent = unidades.length;

    /* o barramento acende trecho por trecho; cada slot enche ao aparecer */
    C.aoVer([regua], function (r) {
        $$('.regua-u', r).forEach(function (t, i) { t.style.setProperty('--atraso', (i * 0.25) + 's'); });
        r.classList.add('ligada');
    });
    C.aoVer(unidades, function (u) { u.classList.add('encaixada'); }, { threshold: 0.08 });

    /* "Aulas" no menu fica marcado em qualquer unidade */
    var linkAulas = $('#menu a[href="#unidade-1"]');
    if (linkAulas) linkAulas.dataset.grupo = '.unidade';
})();
