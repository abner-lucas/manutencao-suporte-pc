# 🛠️ Portal de Manutenção e Suporte de Computadores

Avisos, ordens de serviço, laboratórios interativos, plano da disciplina e o Laboratório de Benchmark de **Manutenção e Suporte de Computadores** (Técnico em Informática · Prof. Ábner Lucas · IFPA Campus Breves).

🌐 **Acesse o portal:** https://abner-lucas.github.io/manutencao-suporte-pc/

## Páginas

| Página | Endereço | O que tem |
|---|---|---|
| **Portal** | `/` | Vista explodida do gabinete, bancada de montagem com POST, avisos, ordens de serviço, diagnóstico e particionador, teclado de termos, inventário e trilha da ementa |
| **Plano da disciplina** | `/disciplina/` | Ementa, mapa das unidades, aulas com tópicos e materiais, instrumentos de avaliação e bibliografia. É um plano de **referência**: sem datas nem carga horária |
| **Laboratório de Benchmark** | `/laboratorio-benchmark/` | Roteiro completo da aula prática sem administrador: kit, protocolo, 5 estações passo a passo com comandos, hipóteses, entrega da planilha no SIGAA, siglas e quiz |
| **Apresentação do laboratório** | `/laboratorio-benchmark/apresentacao/` | Os slides da aula (setas para avançar, **O** visão geral, **F** tela cheia) |

## Estrutura

```text
index.html, style.css, script.js   # portal
logica.js                          # regras dos laboratórios (sem DOM), usada por todas as páginas
comum.js                           # tema, menu, divisores e animações das subpáginas
disciplina/                        # plano da disciplina (index.html, disciplina.css, disciplina.js)
laboratorio-benchmark/             # roteiro (index.html, lab.css, lab.js)
  ├── apresentacao/index.html      # slides
  └── kit/bench.zip                # kit do aluno: 7-Zip, DiskSpd, registrar e a planilha de entrega
testes/logica.test.js              # node --test testes/logica.test.js
```

## Como publicar conteúdo novo

Cada `index.html` tem comentários `COMO ADICIONAR...` antes das listas. Em resumo:

1. **Aviso** (portal): copie um `<li class="evento">` para o topo da lista e troque data, nível (`data-tipo="info"`, `"prazo"` ou `"ok"`), título e texto.
2. **Ordem de serviço** (portal): copie um `<li>` da lista do cupom e troque número, título, texto e link; atualize a linha TOTAL.
3. **Aula** (plano da disciplina): copie um `<li class="aula">` dentro da unidade. O número (A01, A02…) e as contagens do mapa são automáticos.
4. **PDF**: coloque o arquivo em `docs/` e aponte o link para ele.
5. **Kit do laboratório**: troque `laboratorio-benchmark/kit/bench.zip` e, se o conteúdo mudar, atualize a árvore de arquivos e o tamanho na seção "Prepare a máquina".

Ao alterar qualquer CSS ou JS, troque o `?v=` nos links das páginas (ex.: `?v=2026.11.24d` → `?v=2026.12.01a`) para o navegador não misturar arquivos velhos e novos.

## Testes

```bash
node --test testes/logica.test.js
```
