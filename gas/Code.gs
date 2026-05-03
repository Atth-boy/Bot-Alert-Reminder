/**
 * Google Apps Script — Web App backend สำหรับระบบแจ้งเตือน LINE
 *
 * Deploy:
 *   1. รัน setupSheet() ครั้งเดียวเพื่อสร้าง header + formula column
 *   2. ตั้ง Script Properties (Project Settings → Script Properties):
 *      - API_SECRET — passcode ของระบบ (frontend + notifier ใช้)
 *      - LINE_CHANNEL_ACCESS_TOKEN — token จาก LINE Console (สำหรับเรียก Profile API)
 *   3. Deploy → New deployment → Web app
 *      - Execute as: Me
 *      - Who has access: Anyone
 *   4. ตั้ง LINE Webhook URL ใน LINE Console = URL ของ Web App นี้
 */

const SHEET_NAME = 'Main_Data';
const HEADERS = ['Topic', 'Detail', 'Due Date', 'Recipient', 'Status', 'Notification Date', 'Is_Expired', 'Recurrence'];

const RECIPIENTS_SHEET = 'Recipients';
const RECIPIENT_HEADERS = ['Type', 'ID', 'Name', 'LastSeen'];
const MAX_RECIPIENTS = 20;

function checkAuth(secret) {
  const expected = PropertiesService.getScriptProperties().getProperty('API_SECRET');
  if (!expected) return true;
  return secret === expected;
}

function unauthorized() {
  return jsonResponse({ ok: false, error: 'unauthorized' });
}

function doGet(e) {
  const params = (e && e.parameter) || {};
  if (!checkAuth(params.secret)) return unauthorized();

  if (params.action === 'recipients') return handleGetRecipients();

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

    // LINE webhook detection — webhooks มี events array, ไม่มี secret
    if (Array.isArray(body.events)) {
      return handleLineWebhook(body);
    }

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
    body.notificationDate ? new Date(body.notificationDate) : '',
    '',
    body.recurrence || 'none'
  ]);
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow, 7).setFormula(
    `=IF(OR(C${lastRow}="",C${lastRow}>=TODAY()),"Active","Expired")`
  );
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
    recipient: 4, status: 5, notificationDate: 6,
    recurrence: 8
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

// ============================================================
// LINE Webhook Handler
// ============================================================

function handleLineWebhook(body) {
  const token = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  if (!token) {
    return jsonResponse({ ok: false, error: 'LINE_CHANNEL_ACCESS_TOKEN not set in Script Properties' });
  }

  const sheet = getRecipientsSheet();

  body.events.forEach(event => {
    const source = event.source || {};
    let type, id, name;

    if (source.type === 'user' && source.userId) {
      type = 'user';
      id = source.userId;
      name = fetchLineUserName(id, token) || ('User ' + id.slice(0, 8));
    } else if (source.type === 'group' && source.groupId) {
      type = 'group';
      id = source.groupId;
      name = fetchLineGroupName(id, token) || ('Group ' + id.slice(0, 8));
    } else {
      return;
    }

    upsertRecipient(sheet, type, id, name);
  });

  return jsonResponse({ ok: true });
}

function fetchLineUserName(userId, token) {
  try {
    const r = UrlFetchApp.fetch('https://api.line.me/v2/bot/profile/' + userId, {
      headers: { Authorization: 'Bearer ' + token },
      muteHttpExceptions: true
    });
    if (r.getResponseCode() === 200) {
      return JSON.parse(r.getContentText()).displayName;
    }
  } catch (e) {}
  return null;
}

function fetchLineGroupName(groupId, token) {
  try {
    const r = UrlFetchApp.fetch('https://api.line.me/v2/bot/group/' + groupId + '/summary', {
      headers: { Authorization: 'Bearer ' + token },
      muteHttpExceptions: true
    });
    if (r.getResponseCode() === 200) {
      return JSON.parse(r.getContentText()).groupName;
    }
  } catch (e) {}
  return null;
}

function upsertRecipient(sheet, type, id, name) {
  const data = sheet.getDataRange().getValues();
  const now = new Date();

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === id) {
      sheet.getRange(i + 1, 3).setValue(name);
      sheet.getRange(i + 1, 4).setValue(now);
      return;
    }
  }

  sheet.appendRow([type, id, name, now]);

  // Trim เหลือ MAX_RECIPIENTS ล่าสุด
  const all = sheet.getDataRange().getValues();
  if (all.length - 1 > MAX_RECIPIENTS) {
    const rows = all.slice(1).sort((a, b) => new Date(b[3]) - new Date(a[3]));
    const keep = rows.slice(0, MAX_RECIPIENTS);
    sheet.getRange(2, 1, all.length - 1, RECIPIENT_HEADERS.length).clearContent();
    sheet.getRange(2, 1, keep.length, RECIPIENT_HEADERS.length).setValues(keep);
  }
}

function handleGetRecipients() {
  const sheet = getRecipientsSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return jsonResponse({ recipients: [] });

  const recipients = data.slice(1)
    .filter(r => r[1])
    .map(r => ({ type: r[0], id: r[1], name: r[2], lastSeen: r[3] }))
    .sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));

  return jsonResponse({ recipients });
}

// ============================================================
// Helpers
// ============================================================

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
  return sheet;
}

function getRecipientsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(RECIPIENTS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(RECIPIENTS_SHEET);
    sheet.getRange(1, 1, 1, RECIPIENT_HEADERS.length).setValues([RECIPIENT_HEADERS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function setupSheet() {
  const main = getSheet();
  main.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  main.setFrozenRows(1);

  const rec = getRecipientsSheet();
  rec.getRange(1, 1, 1, RECIPIENT_HEADERS.length).setValues([RECIPIENT_HEADERS]);
  rec.setFrozenRows(1);

  Logger.log('Sheets initialized: Main_Data + Recipients');
}
