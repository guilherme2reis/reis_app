# SOLLERS CODE

Lições diárias para colocar em prática, montadas a partir de 14 livros sobre manipulação,
persuasão, negociação, liderança e comportamento. Página única, instalável no celular e no
computador, sem servidor: os dados ficam salvos no próprio aparelho (`localStorage`).

## Trilhas

| Trilha | Áreas | Lições |
| --- | --- | --- |
| ◆ Profissional | Blindagem contra set-up · Postura do servidor equilibrado · Observação · Conversa e desescalada · Liderança da equipe | 36 |
| ● Pessoal | Prioridades e decisões · Emoções e estresse · Relações · Proteção contra manipulação · Negociação do dia a dia | 30 |

Cada lição tem: a ideia, a prática do dia, uma pergunta e um campo de registro.

## Telas

| Tela | O que faz |
| --- | --- |
| **Início** | Escolha da trilha, próxima lição, revisões do dia e progresso por área |
| **Revisar** | Lições que voltam 3, 10 e 30 dias depois de feitas (revisão espaçada) |
| **Diário** | Todos os registros, filtráveis por trilha |
| **Consulta** | Os 14 passos do set-up, os 12 protetores e 3 perguntas antes de atender um pedido |
| **Dados** | Progresso, backup (exportar/importar), trocar PIN, travar, apagar |

## Segurança

- PIN de 4 dígitos para abrir. O app trava de novo após 2 minutos fora dele.
- O PIN fica guardado como hash, nunca em texto.
- Esqueceu o PIN: só dá para criar outro apagando os dados do aparelho (o backup pode ser importado depois).
- O conteúdo das lições é público (repositório público). Os registros não saem do aparelho.
- Na trilha profissional, não registrar nome, matrícula ou qualquer dado que identifique interno.

## Celular e computador

O mesmo endereço funciona nos dois. No celular: abrir no Chrome e "Adicionar à tela inicial".
No computador: abrir no Chrome ou Edge e clicar no ícone de instalar na barra de endereço.
Os dados não sincronizam sozinhos entre aparelhos: use Exportar/Importar backup.

## Arquivos

| Arquivo | Conteúdo |
| --- | --- |
| `licoes.js` | Trilhas, áreas, as 66 lições, os 14 passos e os 12 protetores |
| `app.js` | Lógica: PIN, telas, revisão espaçada, diário, backup |
| `style.css` | Visual (azul = Profissional, âmbar = Pessoal, sempre com ◆ / ● junto) |
| `sw.js` | Funciona sem internet (rede primeiro, cache como reserva) |
