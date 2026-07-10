/**
 * Agência Senna: recebe os leads da landing page e grava numa planilha do Google Sheets.
 *
 * COMO USAR:
 * 1. Crie uma planilha nova no Google Sheets (acesse sheets.new).
 * 2. No menu: Extensões → Apps Script.
 * 3. Apague o código que estiver lá e cole TODO este arquivo. Salve (ícone de disquete).
 * 4. Clique em "Implantar" (Deploy) → "Nova implantação" (New deployment).
 *    - Tipo: "App da Web" (Web app)
 *    - Executar como: "Eu" (Me)
 *    - Quem tem acesso: "Qualquer pessoa" (Anyone)   ← importante!
 *    - Clique em Implantar e autorize (é normal aparecer aviso de "app não verificado";
 *      clique em "Avançado" → "Acessar projeto (não seguro)" → "Permitir". É o seu próprio script.)
 * 5. Copie a "URL do app da Web" (termina em /exec) e me envie.
 *
 * A aba "Leads" e o cabeçalho são criados automaticamente na primeira submissão.
 */

function doPost(e) {
  try {
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Leads');
    if (!sheet) {
      sheet = ss.insertSheet('Leads');
      sheet.appendRow(['Data/Hora', 'Nome', 'WhatsApp', 'Nicho', 'Origem']);
    }

    var p = (e && e.parameter) ? e.parameter : {};
    sheet.appendRow([
      new Date(),
      p.nome || '',
      p.whatsapp || '',
      p.nicho || '',
      p.origem || 'landing'
    ]);

    lock.releaseLock();
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput('Agência Senna: endpoint de leads ativo.');
}
