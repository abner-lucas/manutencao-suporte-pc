# 🛠️ Portal de Manutenção e Suporte de Computadores

Avisos, ordens de serviço (atividades), materiais e laboratórios interativos da disciplina de **Manutenção e Suporte de Computadores** (TIINF0955 · Técnico em Informática · Prof. Ábner Lucas · IFPA Campus Breves).

🌐 **Acesse o portal:** https://abner-lucas.github.io/manutencao-suporte-pc/

## O que tem no portal

| Seção | Conteúdo |
|---|---|
| **Abertura** | Vista explodida: ao rolar, o gabinete abre e as peças se separam, com os nomes de cada uma (Abra. → Entenda. → Conserte.). |
| **Bancada** | Montagem: encaixe as peças na placa-mãe (arrastando ou tocando) e aperte **Ligar** para ver o POST e o defeito que cada peça faltando provoca. |
| **Avisos** | Log de eventos da turma (o mais novo em cima) e o adesivo de advertência com as regras da bancada. |
| **Ordens de serviço** | As atividades impressas num cupom de impressora térmica. |
| **Laboratório** | **Diagnóstico** (roteiro de perguntas do sintoma até a causa) e **Particionador** (MBR × GPT, UEFI × BIOS legada). |
| **Termos** | Teclado mecânico: cada tecla é um termo técnico; a definição aparece no visor. |
| **Materiais** | Laboratórios e bibliografia do plano da disciplina. |
| **Trilha** | A ementa como um log de boot que dá `[ OK ]` conforme a rolagem. |

## Como publicar conteúdo novo

O `index.html` tem comentários `COMO ADICIONAR...` antes de cada lista. Em resumo:

1. **Aviso**: copie um `<li class="evento">` para o topo da lista e troque data, nível (`data-tipo="info"`, `"prazo"` ou `"ok"`), título e texto.
2. **Ordem de serviço (aula/atividade)**: copie um `<li>` da lista do cupom (`cupom-lista`) e troque número, título, texto e link; atualize a linha TOTAL.
3. **Material em PDF**: coloque o arquivo em `docs/` e copie uma linha `<tr>` da tabela de materiais, apontando o link para `docs/arquivo.pdf`.
4. **Notebook do Colab** (se houver): use o link `https://colab.research.google.com/drive/ID` com compartilhamento "Qualquer pessoa com o link".

Ao alterar `style.css`, `script.js` ou `logica.js`, troque o `?v=` nos links do `index.html` (ex.: `?v=2026.11.23c` → `?v=2026.12.01a`) para o navegador não misturar arquivos velhos e novos.

## Testes

As regras dos laboratórios ficam em `logica.js`, separadas da página:

```bash
node --test testes/logica.test.js
```
