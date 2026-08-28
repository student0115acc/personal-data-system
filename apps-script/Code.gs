/**
 * 個人資料整理系統 — Apps Script API 層
 *
 * doGet：讀取（依 ?sheet=工作表名稱，回傳該工作表所有列，每列多帶一個
 *        _row 欄位＝這列在 Sheets 裡的實際列號，供編輯/刪除用）
 * doPost：新增／更新／軟刪除（依 action 參數）
 *
 * 部署方式：Extensions → Apps Script（從試算表打開，綁定同一份試算表）
 * → 貼上這份程式碼（整個檔案一起貼，不要只貼單一函式） → Deploy →
 *   Manage deployments → 編輯既有部署 → Version: New version → Deploy
 *   （第一次才用 New deployment；之後改程式碼都用「編輯既有部署」，
 *   這樣網址才不會變）
 *   → Execute as: Me
 *   → Who has access: Only myself
 *
 * 重要：Apps Script Web App 完全不支援 fetch()/XHR（連 mode:'no-cors'
 * 都會被 Google 擋掉回 503，這是已知限制，不是 CORS 問題）。前端讀取
 * 用 JSONP（<script> 標籤），寫入用隱藏表單送到隱藏 iframe，兩者都不
 * 是 fetch，才不會被擋。
 */

function doGet(e) {
  var callback = e.parameter && e.parameter.callback;
  try {
    var sheetName = (e.parameter && e.parameter.sheet) || '學習筆記';
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return respond({ error: '找不到工作表：' + sheetName }, callback);
    }

    var values = sheet.getDataRange().getValues();
    var headers = values[0];
    var rows = values.slice(1).map(function (row, i) {
      var obj = {};
      headers.forEach(function (header, j) {
        obj[header] = row[j];
      });
      obj._row = i + 2; // Sheets 實際列號（第 1 列是表頭）
      return obj;
    });

    return respond({ sheet: sheetName, rows: rows }, callback);
  } catch (err) {
    return respond({ error: String(err) }, callback);
  }
}

/**
 * 新增／更新／軟刪除。共用參數：sheet=工作表名稱、action=
 * 'append'(預設) | 'update' | 'delete'。
 *
 * append：fields=JSON字串（{ 子標籤①: '...', 標題: '...', ... }，用
 *   「實際欄位名稱」當 key，不用管順序）。ID／建立時間／更新時間／
 *   已刪除／來源／完成狀態如果沒帶就自動補預設值。
 *
 * update：另外要帶 row=列號（doGet 回傳的 _row），fields 只需帶要改
 *   的欄位，其餘欄位保持原值不變；有「更新時間」欄位的話會自動更新
 *   成現在時間。
 *
 * delete：另外要帶 row=列號。軟刪除——只是把「已刪除」欄位設成
 *   true，不會真的移除這一列。
 */
function doPost(e) {
  try {
    var action = e.parameter.action || 'append';
    if (action === 'update') return handleUpdate(e);
    if (action === 'delete') return handleDelete(e);
    return handleAppend(e);
  } catch (err) {
    return respond({ error: String(err) }, null);
  }
}

function handleAppend(e) {
  var sheetName = e.parameter.sheet;
  var fields = JSON.parse(e.parameter.fields || '{}');
  var sheet = requireSheet(sheetName);

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var id = Utilities.getUuid().slice(0, 8);
  var now = new Date();

  var row = headers.map(function (header) {
    if (fields[header] !== undefined) return fields[header];
    if (header === 'ID') return id;
    if (header === '建立時間' || header === '更新時間') return now;
    if (header === '已刪除') return false;
    if (header === '完成狀態') return false;
    if (header === '來源') return '手動新增';
    return '';
  });

  sheet.appendRow(row);
  return respond({ ok: true, id: id }, null);
}

function handleUpdate(e) {
  var sheetName = e.parameter.sheet;
  var rowNumber = Number(e.parameter.row);
  var fields = JSON.parse(e.parameter.fields || '{}');
  var sheet = requireSheet(sheetName);

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var range = sheet.getRange(rowNumber, 1, 1, headers.length);
  var current = range.getValues()[0];

  var updated = headers.map(function (header, i) {
    if (fields[header] !== undefined) return fields[header];
    if (header === '更新時間') return new Date();
    return current[i];
  });

  range.setValues([updated]);
  return respond({ ok: true }, null);
}

function handleDelete(e) {
  var sheetName = e.parameter.sheet;
  var rowNumber = Number(e.parameter.row);
  var sheet = requireSheet(sheetName);

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var deletedCol = headers.indexOf('已刪除') + 1;
  var updatedCol = headers.indexOf('更新時間') + 1;

  if (deletedCol > 0) {
    sheet.getRange(rowNumber, deletedCol).setValue(true);
  }
  if (updatedCol > 0) {
    sheet.getRange(rowNumber, updatedCol).setValue(new Date());
  }

  return respond({ ok: true }, null);
}

function requireSheet(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('找不到工作表：' + sheetName);
  }
  return sheet;
}

// ─────────────────────────────────────────────────────────────────
// 備忘錄 Email 提醒（規格書 4.1 節定案：Email 提醒，時間驅動觸發器）
// ─────────────────────────────────────────────────────────────────

var REMINDER_DAYS_BEFORE = {
  準時: 0,
  提前1天: 1,
  提前3天: 3,
  提前1週: 7,
};

/**
 * 每天固定時間掃描一次「備忘錄」表：還沒完成、有填截止日期＋提醒設定
 * 的項目，若今天剛好是該提醒的日子，就寄一封 Email 到自己的 Gmail。
 * 由時間驅動觸發器呼叫（見 createDailyReminderTrigger），不用手動執行。
 */
function checkAndSendReminders() {
  var sheet = requireSheet('備忘錄');
  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var colIndex = {};
  headers.forEach(function (h, i) {
    colIndex[h] = i;
  });

  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var dueItems = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var completed = row[colIndex['完成狀態']];
    if (completed === true || completed === 'TRUE') continue;

    var dueDateRaw = row[colIndex['截止日期']];
    var reminderSetting = row[colIndex['提醒設定']];
    if (!dueDateRaw || !reminderSetting) continue; // 規格書：沒設截止日期就不啟用提醒

    var daysBefore = REMINDER_DAYS_BEFORE[reminderSetting];
    if (daysBefore === undefined) continue;

    var dueDate = new Date(dueDateRaw);
    dueDate.setHours(0, 0, 0, 0);
    var reminderDate = new Date(dueDate);
    reminderDate.setDate(reminderDate.getDate() - daysBefore);

    if (reminderDate.getTime() === today.getTime()) {
      dueItems.push({
        title: row[colIndex['標題']],
        dueDate: dueDate,
      });
    }
  }

  if (dueItems.length === 0) return;

  var timeZone = Session.getScriptTimeZone();
  var body = dueItems
    .map(function (item) {
      return '• ' + item.title + '（截止：' + Utilities.formatDate(item.dueDate, timeZone, 'yyyy-MM-dd') + '）';
    })
    .join('\n');

  MailApp.sendEmail({
    to: Session.getActiveUser().getEmail(),
    subject: '【個人資料整理系統】今日備忘錄提醒（' + dueItems.length + ' 筆）',
    body: body,
  });
}

/**
 * 一次性設定用：在 Apps Script 編輯器選這個函式、按「執行」一次，
 * 就會建立「每天早上 8 點自動跑 checkAndSendReminders」的觸發器。
 * 重複執行也沒關係，會先清掉同名的舊觸發器再建新的，不會重複寄信。
 */
function createDailyReminderTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'checkAndSendReminders') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('checkAndSendReminders').timeBased().everyDays(1).atHour(8).create();
}

/**
 * 統一回應格式。有帶 ?callback= 參數就包成 JSONP（callback(json)），
 * 因為 Apps Script Web App 不支援跨網域 fetch()，前端讀取一律走
 * JSONP（<script> 標籤載入，不受 CORS 限制）。沒帶 callback 就回傳
 * 一般 JSON，方便直接在瀏覽器打開網址除錯用。
 */
function respond(data, callback) {
  var json = JSON.stringify(data);
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}
