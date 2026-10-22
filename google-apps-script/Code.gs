/**
 * Paste this into Extensions → Apps Script on your Google Sheet.
 * Deploy → New deployment → Web app
 *   Execute as: Me
 *   Who has access: Anyone
 * Copy the /exec URL into GOOGLE_SHEETS_WEBHOOK_URL.
 */
const SECRET = 'change-me' // must match GOOGLE_SHEETS_SECRET
const SHEET_NAME = 'Responses'

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents)
    if (data.secret !== SECRET) return json({ ok: false, error: 'unauthorized' })

    const ss = SpreadsheetApp.getActiveSpreadsheet()
    let sheet = ss.getSheetByName(SHEET_NAME)
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME)
      sheet.appendRow(['Submitted at', 'Question', 'Answer'])
      sheet.setFrozenRows(1)
    }
    // plain-text format so answers starting with "=" are never run as formulas
    const row = sheet.getLastRow() + 1
    sheet.getRange(row, 1, 1, 3).setNumberFormat('@').setValues([[data.submittedAt, data.question, data.answer]])
    return json({ ok: true })
  } catch (err) {
    return json({ ok: false, error: String(err) })
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)
}
