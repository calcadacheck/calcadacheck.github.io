/**
 * @OnlyCurrentDoc  (o script só tem acesso a esta planilha, não ao resto do Drive)
 *
 * CalçadaCheck — recebe as avaliações da página web e grava nesta planilha.
 *
 * Como instalar (uma vez só):
 *  1. Na planilha: Extensões > Apps Script. Apague o que estiver lá e cole este código.
 *  2. Escolha a função "prepararPlanilha" no topo e clique em Executar. Autorize o acesso.
 *  3. Implantar > Nova implantação > tipo "App da Web".
 *     Executar como: Eu · Quem pode acessar: Qualquer pessoa.
 *  4. Copie a URL que termina em /exec e coloque na página (constante URL_PLANILHA).
 *
 * A pontuação é recalculada aqui, com a mesma regra da ficha impressa,
 * para que ninguém consiga gravar uma prioridade diferente da regra.
 */

const ABA = 'Avaliações';
const ABA_RESUMO = 'Resumo';

const CRITERIOS = [
  { id: 'obst',  nome: 'Obstáculos',   ops: ['Ausente', 'Pontual', 'Frequente'] },
  { id: 'cont',  nome: 'Continuidade', ops: ['Contínua', 'Parcialmente interrompida', 'Interrompida'], alerta: 2 },
  { id: 'sup',   nome: 'Superfície',   ops: ['Regular', 'Irregular', 'Danos visíveis'] },
  { id: 'rampa', nome: 'Rampas',       ops: ['Presentes', 'A verificar', 'Ausentes'] },
  { id: 'larg',  nome: 'Largura',      ops: ['120 cm ou mais', '80 a 119 cm', 'Menos de 80 cm'], alerta: 2 }
];

// Colunas: A Enviado em · B Data · C Setor · D Referência · E Ficha · F–I respostas · J cm · K faixa
//          L–P pontos · Q Total · R Alerta · S Prioridade · T Observações
const CABECALHO = [
  'Enviado em', 'Data da avaliação', 'Setor/quadra', 'Ponto de referência', 'Ficha nº',
  'Obstáculos', 'Continuidade', 'Superfície', 'Rampas', 'Largura (cm)', 'Largura (faixa)',
  'Pts obstáculos', 'Pts continuidade', 'Pts superfície', 'Pts rampas', 'Pts largura',
  'Total', 'Alerta', 'Prioridade', 'Observações'
];

/** Teste rápido: abrir a URL /exec no navegador mostra {"ok":true,"app":"CalçadaCheck"}. */
function doGet() {
  return json_({ ok: true, app: 'CalçadaCheck' });
}

/** Recebe uma avaliação (JSON) enviada pela página e grava uma linha. */
function doPost(e) {
  try {
    const dados = JSON.parse(e.postData.contents);
    const linha = montarLinha_(dados);
    const trava = LockService.getScriptLock();
    trava.waitLock(10000);
    try {
      aba_().appendRow(linha);
    } finally {
      trava.releaseLock();
    }
    return json_({ ok: true });
  } catch (erro) {
    return json_({ ok: false, erro: String((erro && erro.message) || erro) });
  }
}

/** Valida os dados e recalcula a pontuação. */
function montarLinha_(d) {
  const r = d && d.respostas;
  if (!r) throw new Error('Respostas ausentes.');

  const pts = CRITERIOS.map(function (c) {
    const v = Number(r[c.id]);
    if (v !== 0 && v !== 1 && v !== 2) throw new Error('Resposta inválida em ' + c.nome + '.');
    return v;
  });
  const setor = texto_(d.setor, 100);
  const referencia = texto_(d.referencia, 150);
  if (!setor || !referencia) throw new Error('Setor e ponto de referência são obrigatórios.');

  const total = pts.reduce(function (a, b) { return a + b; }, 0);
  const alerta = CRITERIOS.some(function (c, i) { return c.alerta === pts[i]; });
  const prioridade = alerta ? 'ALTA' : total <= 1 ? 'BAIXA' : total <= 4 ? 'MÉDIA' : 'ALTA';
  const rotulos = CRITERIOS.map(function (c, i) { return c.ops[pts[i]]; });
  const cm = Number(d.larguraCm);

  return [
    new Date(),
    data_(d.data),
    setor,
    referencia,
    texto_(d.ficha, 20),
    rotulos[0], rotulos[1], rotulos[2], rotulos[3],
    cm > 0 && cm < 5000 ? cm : '',
    rotulos[4],
    pts[0], pts[1], pts[2], pts[3], pts[4],
    total,
    alerta ? 'Sim' : 'Não',
    prioridade,
    texto_(d.observacoes, 1000)
  ];
}

/** Limita o tamanho e impede que um texto digitado vire fórmula na planilha. */
function texto_(v, max) {
  let s = String(v == null ? '' : v).replace(/[\r\n]+/g, ' ').trim().slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

/** Converte "AAAA-MM-DD" em data. */
function data_(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : '';
}

function aba_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let aba = ss.getSheetByName(ABA);
  if (!aba) aba = ss.insertSheet(ABA, 0);
  if (aba.getLastRow() === 0) aba.appendRow(CABECALHO);
  return aba;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Rode uma vez: cria o cabeçalho, as cores da prioridade e a aba de resumo. */
function prepararPlanilha() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Aba de avaliações (reaproveita a primeira aba se estiver vazia)
  let aba = ss.getSheetByName(ABA);
  if (!aba) {
    const primeira = ss.getSheets()[0];
    if (primeira.getLastRow() === 0) { primeira.setName(ABA); aba = primeira; }
    else aba = ss.insertSheet(ABA, 0);
  }
  if (aba.getLastRow() === 0) aba.appendRow(CABECALHO);

  const n = CABECALHO.length;
  aba.setFrozenRows(1);
  aba.getRange(1, 1, 1, n)
    .setFontWeight('bold').setBackground('#1E3A5F').setFontColor('#FFFFFF')
    .setWrap(true).setVerticalAlignment('middle');
  aba.setRowHeight(1, 40);
  aba.getRange('A2:A').setNumberFormat('dd/mm/yyyy hh:mm');
  aba.getRange('B2:B').setNumberFormat('dd/mm/yyyy');
  aba.setColumnWidths(1, n, 120);
  aba.setColumnWidth(4, 220);
  aba.setColumnWidth(20, 320);

  // Prioridade com cor + palavra (como na ficha), e alerta em vermelho
  const prio = aba.getRange('S2:S');
  const alerta = aba.getRange('R2:R');
  const regra = SpreadsheetApp.newConditionalFormatRule;
  aba.setConditionalFormatRules([
    regra().whenTextEqualTo('BAIXA').setBackground('#E3F4E8').setFontColor('#145F2D').setBold(true).setRanges([prio]).build(),
    regra().whenTextEqualTo('MÉDIA').setBackground('#FFF4CC').setFontColor('#6B4E00').setBold(true).setRanges([prio]).build(),
    regra().whenTextEqualTo('ALTA').setBackground('#FBE3E3').setFontColor('#9E1C1C').setBold(true).setRanges([prio]).build(),
    regra().whenTextEqualTo('Sim').setFontColor('#9E1C1C').setBold(true).setRanges([alerta]).build()
  ]);

  // Aba de resumo
  const resumo = ss.getSheetByName(ABA_RESUMO) || ss.insertSheet(ABA_RESUMO);
  resumo.clear();
  const A = "'" + ABA + "'!";
  const linhas = [
    ['CalçadaCheck · Resumo das avaliações', ''],
    ['', ''],
    ['Trechos avaliados', '=COUNTA(' + A + 'A2:A)'],
    ['Prioridade ALTA', '=COUNTIF(' + A + 'S2:S,"ALTA")'],
    ['Prioridade MÉDIA', '=COUNTIF(' + A + 'S2:S,"MÉDIA")'],
    ['Prioridade BAIXA', '=COUNTIF(' + A + 'S2:S,"BAIXA")'],
    ['Trechos com alerta', '=COUNTIF(' + A + 'R2:R,"Sim")'],
    ['', ''],
    ['Problemas graves (2 pontos) por critério', ''],
    ['Obstáculos frequentes', '=COUNTIF(' + A + 'L2:L,2)'],
    ['Percurso interrompido', '=COUNTIF(' + A + 'M2:M,2)'],
    ['Piso com danos visíveis', '=COUNTIF(' + A + 'N2:N,2)'],
    ['Rampas ausentes', '=COUNTIF(' + A + 'O2:O,2)'],
    ['Largura menor que 80 cm', '=COUNTIF(' + A + 'P2:P,2)'],
    ['', ''],
    ['Triagem educativa: os resultados não são laudo técnico.', '']
  ];
  resumo.getRange(1, 1, linhas.length, 2).setValues(linhas);
  resumo.getRange('A1').setFontSize(14).setFontWeight('bold').setFontColor('#1E3A5F');
  resumo.getRange('A9').setFontWeight('bold').setFontColor('#1E3A5F');
  resumo.getRange('B3:B14').setFontWeight('bold').setHorizontalAlignment('center');
  resumo.getRange('A16').setFontStyle('italic').setFontColor('#4F5862');
  resumo.setColumnWidth(1, 340);
  resumo.setColumnWidth(2, 90);

  ss.setActiveSheet(aba);
  SpreadsheetApp.flush();
  Logger.log('Planilha pronta. Agora faça a implantação como App da Web.');
}
