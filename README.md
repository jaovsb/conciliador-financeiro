# Conciliador Financeiro

Protótipo de portfólio: um simulador que compara dois arquivos CSV **fictícios** — transações registradas no sistema e pagamentos recebidos — e classifica cada ID encontrado.

Os arquivos são processados **localmente no navegador** e não são enviados a nenhum servidor. Não há backend, autenticação, banco de dados nem integração bancária.

## Decisões de Arquitetura e Regras de Negócio

- **Separação entre regras e componentes:** as regras de conciliação, validação e formatação são implementadas em funções puras (`src/lib/`), sem acoplamento com componentes visuais ou estado do React.
- **Valores monetários em centavos:** valores textuais são convertidos diretamente para inteiros em centavos usando `BigInt`, sem operações com números decimais em ponto flutuante. Arquivos cuja soma ultrapassa o inteiro seguro (`Number.MAX_SAFE_INTEGER`) são rejeitados.
- **Rejeição integral de arquivos inválidos:** validação estrita prévia. Havendo qualquer erro de formato, cabeçalho, tipo ou valor, o arquivo é integralmente rejeitado, indicando arquivo, linha e motivo. Dados válidos previamente carregados são preservados (sem importação parcial).
- **Prioridade da classificação de duplicidade:** IDs com múltiplos lançamentos em qualquer uma das fontes são classificados como `Duplicado`. Nenhum registro é escolhido automaticamente para conciliação, preservando e apresentando todos os registros envolvidos.

## Funcionalidades

- Importação independente dos dois CSVs com botão de seleção/substituição personalizado e acessível.
- Botão "Carregar exemplo", que utiliza exatamente o mesmo fluxo de leitura, validação e conciliação dos arquivos importados.
- Links para baixar os CSVs de exemplo (`public/exemplos/`).
- Resumo com valor registrado, valor recebido, diferença líquida e contagem por classificação.
- Busca por ID ou descrição (de qualquer fonte), filtro por classificação e paginação de 20 itens.
- Modal de detalhes com os registros originais (linha, descrição, data, valor) e a explicação da classificação.
- Ao substituir um arquivo válido, o resultado anterior é descartado e é necessário conciliar novamente.
- Botão "Limpar dados".

## Formato dos CSVs

UTF-8, separador `;`, cabeçalho obrigatório:

```
id;descricao;data;valor
TX001;Mensalidade cliente A;2026-10-15;150,00
```

| Campo       | Regra                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------- |
| `id`        | Obrigatório, texto; espaços externos são removidos.                                          |
| `descricao` | Obrigatória. Pode estar entre aspas (ex.: `"Serviço; design"`).                              |
| `data`      | `AAAA-MM-DD`, data existente no calendário.                                                  |
| `valor`     | Não negativo, sem separador de milhar, vírgula decimal e exatamente duas casas (`1500,00`). |

- Linhas vazias são ignoradas e BOM no início do arquivo é aceito.
- Limites: 1 MB e 2.000 registros por arquivo.

## Regras de conciliação

O cruzamento é feito por ID, com comparação exata (diferencia maiúsculas e minúsculas). Data e descrição servem apenas para contexto. Cada ID da união das duas fontes recebe uma classificação exclusiva:

| Classificação     | Regra                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| **Duplicado**     | Mais de um registro com o ID em qualquer fonte. Tem prioridade.         |
| **Conciliado**    | Exatamente um registro em cada fonte, com valores iguais.               |
| **Divergente**    | Exatamente um registro em cada fonte, com valores diferentes.           |
| **Sem pagamento** | Um registro no sistema e nenhum nos pagamentos.                         |
| **Sem transação** | Um pagamento e nenhum registro no sistema.                              |

- Diferença por ID = total de pagamentos do ID − total do sistema para o ID.
- Totais gerais somam **todas** as linhas importadas, inclusive duplicadas. Diferença líquida = recebido − registrado.
- O resumo sempre representa a conciliação completa; busca e filtro afetam apenas a tabela.

### Resultado esperado dos dados de exemplo

13 IDs únicos: 5 conciliados (TX001–TX004, TX013), 2 divergentes (TX005, TX006), 2 sem pagamento (TX007, TX008), 2 sem transação (TX011, TX012) e 2 duplicados (TX009 no sistema, TX010 nos pagamentos). Registrado: R$ 5.770,20 · Recebido: R$ 4.725,55 · Diferença líquida: -R$ 1.044,65.

## Comandos (Windows/PowerShell)

```powershell
npm.cmd install        # instala as dependências
npm.cmd run dev        # servidor de desenvolvimento (http://localhost:5173)
npm.cmd test           # testes (Vitest)
npm.cmd run lint       # ESLint
npm.cmd run build      # checagem de tipos + build de produção em dist/
npm.cmd run preview    # serve o build localmente
```

## Estrutura

```
public/exemplos/          CSVs de exemplo
src/lib/types.ts          tipos do domínio
src/lib/format.ts         conversão para centavos, formatação monetária e de datas
src/lib/csv.ts            leitura (Papa Parse) e validação dos arquivos
src/lib/reconcile.ts      funções puras de conciliação, filtro e explicações
src/lib/*.test.ts         testes das regras
src/App.tsx               estado da página e fluxo de importação/conciliação
src/components/           componentes visuais
src/styles.css            estilos com variáveis CSS
```

Stack: React, TypeScript, Vite, Papa Parse, Lucide React e Vitest.
