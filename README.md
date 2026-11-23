# 🛠️ Portal de Manutenção e Suporte de Computadores

Avisos, ordens de serviço (atividades), materiais e laboratórios interativos da disciplina de **Manutenção e Suporte de Computadores** (TIINF0955 · Técnico em Informática · Prof. Ábner Lucas · IFPA Campus Breves).

🌐 **Acesse o portal:** https://abner-lucas.github.io/manutencao-suporte-pc/

## O que tem no portal

| Seção | Conteúdo |
|---|---|
| **Abertura** | Bancada de montagem: encaixe as peças na placa-mãe (arrastando ou tocando) e aperte **Ligar** para ver o POST e o defeito que cada peça faltando provoca. |
| **Avisos** | Recados da turma no formato de log de eventos, o mais novo em cima, e as regras da bancada. |
| **Ordens de serviço** | As atividades e aulas práticas, com filtro. |
| **Laboratório** | **Diagnóstico** (roteiro de perguntas do sintoma até a causa) e **Particionador** (MBR × GPT, UEFI × BIOS legada). |
| **Termos** | Glossário de termos técnicos com busca que ignora acentos. |
| **Materiais** | Laboratórios e bibliografia do plano da disciplina. |
| **Trilha** | A ementa em etapas, como uma sequência de boot. |

## Como publicar conteúdo novo

O `index.html` tem comentários `COMO ADICIONAR...` antes de cada lista. Em resumo:

1. **Aviso**: copie um `<li class="aviso">` para o topo da lista e troque data, nível (`data-tipo="info"`, `"prazo"` ou `"ok"`), título e texto.
2. **Ordem de serviço (aula/atividade)**: copie um `<article class="os">`, troque número, título, texto, link e `data-categoria` (`laboratorio` ou `pratica`). Para tirar o "em breve", apague o `<span class="carimbo">` e a classe `os-breve`.
3. **Material em PDF**: coloque o arquivo em `docs/` e copie uma linha `<tr>` da tabela de materiais, apontando o link para `docs/arquivo.pdf`.
4. **Notebook do Colab** (se houver): use o link `https://colab.research.google.com/drive/ID` com compartilhamento "Qualquer pessoa com o link".

Ao alterar `style.css`, `script.js` ou `logica.js`, troque o `?v=` nos links do `index.html` (ex.: `?v=2026.11.23a` → `?v=2026.12.01a`) para o navegador não misturar arquivos velhos e novos.

## Testes

As regras dos laboratórios ficam em `logica.js`, separadas da página:

```bash
node --test testes/logica.test.js
```
