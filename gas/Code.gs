/**
 * Google Apps Script — Web App backend สำหรับระบบแจ้งเตือน LINE
 *
 * Deploy:
 *   1. รัน setupSheet() ครั้งเดียวเพื่อสร้าง header + formula column
 *   2. ตั้ง API_SECRET ใน Project Settings → Script Properties (สำคัญ! เพื่อกัน abuse)
 *   3. Deploy → New deployment → Web app
 *      - Execute as: Me
 *      - Who has access: Anyone
 *   4. Copy URL ไปใส่ใน VITE_GAS_URL (frontend) และ GAS_WEB_APP_URL (notifier secret)
 */

const SHEET_NAME = 'Main_Data';
const HEADERS = ['Topic', 'Detail', 'Due Date', 'Recipient', 'Status', 'Notification Date', 'Is_Expired'];

function checkAuth(secret) {
  const expected = PropertiesService.getScriptProperties().getProperty('API_SECRET');
  if (!expected) return true; // ยังไม่ตั้ง = เปิดให้ใช้ (warn ใน setup)
  return secret === expected;
}

function unauthorized() {
  return jsonResponse({ ok: false, error: 'unauthorized' });
}

function doGet(e) {
  const params = (e && e.parameter) || {};
  if (!checkAuth(params.secret)) return unauthorized();

  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return jsonResponse({ data: [] });

  const headers = data[0];
  const rows = data.slice(1)
    .map((row, idx) => {
      const obj = { _row: idx + 2 };
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    })
    .filter(r => r.Topic);

  return jsonResponse({ data: rows });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (!checkAuth(body.secret)) return unauthorized();

    const action = body.action || 'add';
    if (action === 'add') return handleAdd(body);
    if (action === 'delete') return handleDelete(body);
    if (action === 'update') return handleUpdate(body);

    return jsonResponse({ ok: false, error: 'unknown action' });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

function handleAdd(body) {
  const sheet = getSheet();
  sheet.appendRow([
    body.topic || '',
    body.detail || '',
    body.dueDate ? new Date(body.dueDate) : '',
    body.recipient || '',
    body.status || 'Active',
    body.notificationDate ? new Date(body.notificationDate) : ''
  ]);
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow, 7).setFormula(`=IF(C${lastRow}<TODAY(),"Expired","Active")`);
  return jsonResponse({ ok: true, row: lastRow });
}

function handleDelete(body) {
  if (!body.row || body.row < 2) return jsonResponse({ ok: false, error: 'invalid row' });
  getSheet().deleteRow(body.row);
  return jsonResponse({ ok: true });
}

function handleUpdate(body) {
  if (!body.row || body.row < 2) return jsonResponse({ ok: false, error: 'invalid row' });
  const sheet = getSheet();
  const map = {
    topic: 1, detail: 2, dueDate: 3,
    recipient: 4, status: 5, notificationDate: 6
  };
  Object.keys(map).forEach(k => {
    if (body[k] !== undefined) {
      const val = (k === 'dueDate' || k === 'notificationDate') && body[k]
        ? new Date(body[k]) : body[k];
      sheet.getRange(body.row, map[k]).setValue(val);
    }
  });
  return jsonResponse({ ok: true });
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
  return sheet;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Run นี้ครั้งแรกสุดเพื่อ init header */
function setupSheet() {
  const sheet = getSheet();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.setFrozenRows(1);
  Logger.log('Sheet initialized');
}
