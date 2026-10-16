# Conciliador Financeiro

Aplicação em React e TypeScript para comparar transações registradas em um sistema com pagamentos recebidos, a partir de dois arquivos CSV.

O resultado identifica valores divergentes, registros sem correspondência e IDs duplicados, com resumo financeiro, busca, filtros e detalhes de cada ocorrência.

O processamento dos arquivos acontece no navegador. Os dados de exemplo são fictícios.

## Tecnologias

- React e TypeScript
- Vite
- CSS com variáveis para cores e espaçamentos
- Papa Parse para leitura dos CSVs
- Lucide React para ícones
- Vitest para testes automatizados
- ESLint para análise estática do código

## Como executar

É necessário ter Node.js e npm instalados em versões compatíveis com as dependências do projeto.

Clone o repositório e entre na pasta:

```powershell
git clone https://github.com/jaovsb/conciliador-financeiro.git
cd conciliador-financeiro
```

Instale as dependências e inicie o servidor de desenvolvimento:

```powershell
npm.cmd ci
npm.cmd run dev
```

Abra o endereço exibido no terminal, normalmente `http://localhost:5173`.

## Como usar

1. Clique em **Carregar exemplo** para explorar a aplicação com os arquivos disponíveis no projeto.
2. Para testar outros dados, selecione um CSV de transações e outro de pagamentos.
3. Clique em **Conciliar arquivos**.
4. Consulte o resumo e use a busca ou o filtro de classificação para investigar os resultados.
5. Abra **Detalhes** para visualizar os registros envolvidos e o motivo da classificação.

Ao substituir um arquivo por outro válido, o resultado anterior é descartado e uma nova conciliação deve ser executada. Se o novo arquivo for inválido, os dados válidos anteriores são preservados.

## Funcionalidades

- Importação e validação independente dos dois arquivos.
- Mensagens de erro com nome do arquivo, linha e motivo.
- Rejeição integral de arquivos inválidos, sem importação parcial.
- Resumo com valores registrados, recebidos e diferença líquida.
- Contagem de IDs por classificação.
- Busca por ID ou descrição de qualquer uma das fontes.
- Filtro por classificação e paginação de 20 resultados.
- Modal com registros originais, valores, datas e linhas dos arquivos.
- Download dos CSVs de exemplo.
- Limpeza dos dados carregados.

## Regras de conciliação

Os registros são agrupados pelo ID, diferenciando maiúsculas e minúsculas. Cada ID encontrado em pelo menos um dos arquivos gera um resultado.

Data e descrição são exibidas como contexto; não determinam a correspondência.

| Classificação | Condição |
| --- | --- |
| Duplicado | Mais de um registro com o mesmo ID em qualquer uma das fontes. |
| Conciliado | Um registro em cada fonte, com valores iguais. |
| Divergente | Um registro em cada fonte, com valores diferentes. |
| Sem pagamento | Um registro no sistema e nenhum nos pagamentos. |
| Sem transação | Um pagamento e nenhum registro no sistema. |

A classificação **Duplicado** tem prioridade, mesmo quando as somas dos valores coincidem. Todos os registros são preservados para análise.

A diferença é calculada como:

```text
Diferença = total recebido − total registrado
```

Os totais gerais incluem todas as linhas válidas, inclusive as de IDs duplicados. Busca, filtro e paginação afetam apenas a tabela; o resumo continua representando a conciliação completa.

## Formato dos arquivos

Os CSVs devem usar UTF-8, ponto e vírgula como separador e o seguinte cabeçalho:

```csv
id;descricao;data;valor
TX001;Mensalidade cliente A;2026-10-15;150,00
TX002;"Serviço; design";2026-10-16;350,50
```

| Campo | Formato |
| --- | --- |
| `id` | Texto obrigatório. Espaços nas extremidades são removidos. |
| `descricao` | Texto obrigatório. Campos com ponto e vírgula devem estar entre aspas. |
| `data` | Data existente no formato `AAAA-MM-DD`. |
| `valor` | Número não negativo, sem separador de milhar, com vírgula e duas casas decimais. Exemplo: `1500,00`. |

Cada arquivo aceita até **2.000 registros** e **1 MB (1.048.576 bytes)**. Linhas vazias são ignoradas e BOM no início do arquivo é aceito.

## Organização do código

As funções de conciliação ficam separadas dos componentes React, permitindo testar as regras sem depender da interface.

```text
public/exemplos/       Arquivos CSV de exemplo
src/lib/types.ts      Tipos dos registros, erros e resultados
src/lib/format.ts     Conversão de valores e formatação
src/lib/csv.ts        Leitura e validação dos CSVs
src/lib/reconcile.ts  Agrupamento, classificação, totais e filtros
src/lib/*.test.ts     Testes automatizados das regras
src/App.tsx           Estado e fluxo principal da aplicação
src/components/       Importação, resumo, tabela e modal
src/styles.css        Estilos e regras de responsividade
```

Os valores são convertidos do texto para centavos usando `BigInt` e armazenados como `number` inteiro após a verificação do limite seguro. A soma de cada arquivo também é validada para preservar a precisão dos cálculos.

O agrupamento usa `Map` para manter todos os registros de cada ID, incluindo duplicados. O estado da interface é gerenciado com hooks do React e compartilhado com os componentes por props.

## Testes e verificações

Os testes automatizados cobrem as classificações, a prioridade de duplicados, os totais, a busca, os filtros, a conversão monetária e a validação dos CSVs.

Execute os testes:

```powershell
npm test
```

Para acompanhar os testes durante alterações:

```powershell
npm run test:watch
```

Execute a análise estática:

```powershell
npm run lint
```

Gere o build de produção:

```powershell
npm run build
```

Para visualizar o build localmente:

```powershell
npm run preview
```

### Conferência dos exemplos

Os arquivos em `public/exemplos/` devem produzir:

| Classificação | Quantidade |
| --- | ---: |
| Conciliado | 5 |
| Divergente | 2 |
| Sem pagamento | 2 |
| Sem transação | 2 |
| Duplicado | 2 |
| **IDs únicos** | **13** |

| Total | Valor |
| --- | ---: |
| Registrado no sistema | R$ 5.770,20 |
| Recebido | R$ 4.725,55 |
| Diferença líquida | −R$ 1.044,65 |
