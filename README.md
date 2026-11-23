# CalçadaCheck

Página web do **CalçadaCheck**, um kit de baixo custo para fazer a triagem preliminar da acessibilidade de calçadas no Gama (DF).

**Acesse:** https://calcadacheck.github.io/

## Como funciona

1. Escolha um trecho de calçada: um lado da rua, de uma esquina até a outra.
2. Responda aos 5 critérios: obstáculos, continuidade, superfície, rampas e largura livre.
3. Veja a prioridade do trecho (baixa, média ou alta) e o motivo de cada ponto.

A página funciona junto com a ficha impressa do kit. Quem não tem celular ou internet preenche a ficha de papel, e a equipe passa os dados para a página depois.

## Regra de pontuação

| Critério | 0 ponto | 1 ponto | 2 pontos |
|---|---|---|---|
| Obstáculos | Ausente | Pontual (1 ou 2) | Frequente (3 ou mais) |
| Continuidade do percurso | Contínua | Parcialmente interrompida | Interrompida (alerta) |
| Superfície (piso) | Regular | Irregular | Danos visíveis |
| Rampas e desníveis | Presentes | A verificar | Ausentes |
| Largura livre | 120 cm ou mais | 80 a 119 cm | Menos de 80 cm (alerta) |

| Total | Prioridade |
|---|---|
| 0 a 1 ponto | Baixa |
| 2 a 4 pontos | Média |
| 5 a 10 pontos | Alta |

**Alerta:** se o percurso estiver interrompido ou a largura livre for menor que 80 cm, a prioridade é alta mesmo com poucos pontos, porque esses problemas podem impedir a passagem.

As faixas de largura usam como referência a ABNT NBR 9050:2020: 120 cm é a faixa livre mínima, e 80 cm é a largura do módulo de referência de uma pessoa em cadeira de rodas.

## Acessibilidade e privacidade

- Cada categoria aparece com cor, símbolo e palavra, para que a cor nunca seja a única informação.
- Fonte Atkinson Hyperlegible Next, criada para pessoas com baixa visão.
- A página não pede nome, foto nem localização do celular.

## Para onde vão os dados

Cada avaliação enviada vira uma linha numa planilha do Google Sheets da equipe. O código que recebe os dados está em [`apps-script/Codigo.gs`](apps-script/Codigo.gs) e roda no Google Apps Script. Ele:

- recalcula a pontuação no servidor, com a mesma regra da ficha, para que ninguém grave uma prioridade diferente da regra;
- valida as respostas e limita o tamanho dos textos;
- impede que um texto digitado vire fórmula na planilha;
- mantém uma aba "Resumo" com a contagem de trechos por prioridade e de problemas graves por critério.

## Aviso

O CalçadaCheck é uma ferramenta de triagem educativa. O resultado não é laudo técnico e não certifica que a calçada cumpre as normas de acessibilidade.

---

Projeto acadêmico · UnB FCTE · Humanidades e Cidadania (FGA0164) · 2026.2 · Grupo 2
