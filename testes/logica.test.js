// node --test testes/logica.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../logica.js');

function montar(ids) {
    let e = L.estadoInicial();
    for (const id of ids) {
        const r = L.instalar(e, id, L.COMPONENTES[id].slot);
        assert.ok(r.ok, `falhou ao instalar ${id}: ${r.msg}`);
        e = r.estado;
    }
    return e;
}
const COMPLETO = ['cpu', 'pasta', 'cooler', 'ram', 'ssd', 'gpu', 'eps', 'atx24'];

test('montagem completa inicia o sistema', () => {
    const r = L.ligar(montar(COMPLETO));
    assert.equal(r.resultado.codigo, 'ok');
    assert.equal(r.temperatura, 38);
});

test('instalar não altera o estado original', () => {
    const e = L.estadoInicial();
    L.instalar(e, 'cpu', 'soquete');
    assert.equal(e.instalados.length, 0);
});

test('componente no slot errado é recusado', () => {
    const r = L.instalar(L.estadoInicial(), 'ram', 'pcie');
    assert.equal(r.ok, false);
    assert.match(r.msg, /slots de memória/);
});

test('cooler e pasta exigem a CPU antes', () => {
    assert.equal(L.instalar(L.estadoInicial(), 'cooler', 'soquete').ok, false);
    assert.equal(L.instalar(L.estadoInicial(), 'pasta', 'soquete').ok, false);
});

test('pasta depois do cooler é recusada; cooler sem pasta gera aviso', () => {
    const e = montar(['cpu']);
    const c = L.instalar(e, 'cooler', 'soquete');
    assert.equal(c.ok, true);
    assert.equal(c.tipo, 'aviso');
    assert.equal(L.instalar(c.estado, 'pasta', 'soquete').ok, false);
});

test('sem ATX 24 nada acontece; sem EPS não há POST', () => {
    assert.equal(L.ligar(montar(COMPLETO.filter(i => i !== 'atx24'))).resultado.codigo, 'sem-energia');
    assert.equal(L.ligar(montar(COMPLETO.filter(i => i !== 'eps'))).resultado.codigo, 'sem-post');
});

test('cada peça faltando leva ao defeito certo', () => {
    const casos = { cooler: 'termico', ram: 'sem-memoria', gpu: 'sem-video', ssd: 'sem-boot' };
    for (const [peca, codigo] of Object.entries(casos)) {
        const ids = COMPLETO.filter(i => i !== peca && !(peca === 'cooler' && i === 'pasta'));
        assert.equal(L.ligar(montar(ids)).resultado.codigo, codigo, peca);
    }
    assert.equal(L.ligar(montar(COMPLETO.filter(i => i !== 'pasta'))).resultado.codigo, 'quente');
});

test('árvore de diagnóstico sem destinos quebrados, ciclos ou nós soltos', () => {
    const v = L.validarArvore();
    assert.deepEqual(v.problemas, []);
});

test('validarArvore detecta ciclo', () => {
    const v = L.validarArvore({ inicio: { pergunta: '?', opcoes: [{ txt: 'a', ir: 'b' }] }, b: { pergunta: '?', opcoes: [{ txt: 'x', ir: 'inicio' }] } });
    assert.equal(v.ok, false);
});

test('caminho do teste do clipe chega na fonte', () => {
    let id = 'inicio';
    for (const i of [0, 1, 0]) id = L.passo(id, i);
    assert.equal(id, 'f_fonte');
    assert.ok(L.eFolha(L.DIAGNOSTICO[id]));
});

test('1000 GB anunciados aparecem como ~931 GB no Windows', () => {
    assert.equal(L.capacidadeReal(1000), 931.3);
});

test('MBR: no máximo 4 entradas e uma estendida', () => {
    let d = L.discoInicial(1000, 'MBR', 'Legado');
    for (let i = 0; i < 3; i++) d = L.adicionarParticao(d, { tipo: 'primaria', tamanho: 100 }).disco;
    const est = L.adicionarParticao(d, { tipo: 'estendida', tamanho: 500 });
    assert.ok(est.ok);
    d = est.disco;
    assert.equal(L.adicionarParticao(d, { tipo: 'primaria', tamanho: 10 }).ok, false);
    assert.equal(L.adicionarParticao(d, { tipo: 'estendida', tamanho: 10 }).ok, false);
    assert.ok(L.adicionarParticao(d, { tipo: 'logica', tamanho: 200 }).ok);
});

test('lógica exige estendida e cabe dentro dela', () => {
    let d = L.discoInicial(500, 'MBR', 'Legado');
    assert.equal(L.adicionarParticao(d, { tipo: 'logica', tamanho: 10 }).ok, false);
    d = L.adicionarParticao(d, { tipo: 'estendida', tamanho: 100 }).disco;
    d = L.adicionarParticao(d, { tipo: 'logica', tamanho: 80 }).disco;
    assert.equal(L.adicionarParticao(d, { tipo: 'logica', tamanho: 30 }).ok, false);
    assert.equal(L.analisarDisco(d).usado, 100);
});

test('GPT ignora tipo e respeita o espaço livre', () => {
    let d = L.discoInicial(256, 'GPT', 'UEFI');
    d = L.adicionarParticao(d, { tipo: 'estendida', tamanho: 200 }).disco;
    assert.equal(d.particoes[0].tipo, 'gpt');
    assert.equal(L.adicionarParticao(d, { tamanho: 100 }).ok, false);
});

test('MBR em disco de 4 TB desperdiça espaço', () => {
    const a = L.analisarDisco(L.discoInicial(4000, 'MBR', 'Legado'));
    assert.equal(a.limite, L.LIMITE_MBR_GB);
    assert.ok(a.alertas.some(x => /GPT/.test(x.msg)));
});

test('compatibilidade de boot do Windows', () => {
    assert.equal(L.analisarDisco(L.discoInicial(512, 'GPT', 'UEFI')).boot.ok, true);
    assert.equal(L.analisarDisco(L.discoInicial(512, 'MBR', 'Legado')).boot.ok, true);
    assert.equal(L.analisarDisco(L.discoInicial(512, 'MBR', 'UEFI')).boot.ok, false);
    assert.equal(L.analisarDisco(L.discoInicial(512, 'GPT', 'Legado')).boot.ok, false);
});

test('tamanho inválido é recusado', () => {
    const d = L.discoInicial(512, 'GPT', 'UEFI');
    assert.equal(L.adicionarParticao(d, { tamanho: 0 }).ok, false);
    assert.equal(L.adicionarParticao(d, { tamanho: 'abc' }).ok, false);
});

test('removerUltima tira a estendida e as lógicas dela', () => {
    let d = L.discoInicial(500, 'MBR', 'Legado');
    d = L.adicionarParticao(d, { tipo: 'estendida', tamanho: 100 }).disco;
    d = L.adicionarParticao(d, { tipo: 'logica', tamanho: 50 }).disco;
    d = L.removerUltima(L.removerUltima(d));
    assert.equal(d.particoes.length, 0);
});

test('busca de termos ignora acentos e filtra categoria', () => {
    assert.ok(L.buscarTermos('eletrostatica').some(t => t.termo === 'ESD'));
    assert.ok(L.buscarTermos('', 'armazenamento').every(t => t.cat === 'armazenamento'));
    assert.equal(L.buscarTermos('xyzxyz').length, 0);
});

test('toda tecla tem rótulo curto e único', () => {
    const teclas = L.TERMOS.map(t => t.tecla);
    assert.ok(teclas.every(t => t.length <= 8), teclas.filter(t => t.length > 8).join(', '));
    assert.equal(new Set(teclas).size, teclas.length);
});


test('mediana usa o valor do meio, não o melhor', () => {
    assert.equal(L.mediana([1212, 1180, 1195]), 1195);
    assert.equal(L.mediana([4, 1, 3, 2]), 2.5);
    assert.equal(L.mediana([]), null);
    assert.equal(L.mediana([7, NaN, 5, 9]), 7);
});

test('diferença percentual', () => {
    assert.equal(L.diferencaPct(100, 110).toFixed(1), '10.0');
    assert.equal(L.diferencaPct(0, 5), null);
});
