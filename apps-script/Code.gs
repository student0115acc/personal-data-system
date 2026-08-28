/**
 * 個人資料整理系統 — Apps Script API 層
 *
 * 這是「第一刀」的最小版本：只做讀取（doGet），依 ?sheet=工作表名稱
 * 回傳該工作表所有列（不含表頭），轉成陣列物件（key 用表頭）。
 * 寫入、搜尋、跨表查詢留到下一輪再加。
 *
 * 部署方式：Extensions → Apps Script（從試算表打開，綁定同一份試算表）
 * → 貼上這份程式碼 → Deploy → New deployment → Web app
 *   → Execute as: Me
 *   → Who has access: Only myself
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
    var rows = values.slice(1).map(function (row) {
      var obj = {};
      headers.forEach(function (header, i) {
        obj[header] = row[i];
      });
      return obj;
    });

    return respond({ sheet: sheetName, rows: rows }, callback);
  } catch (err) {
    return respond({ error: String(err) }, callback);
  }
}

/**
 * 新增一列資料。參數：sheet=工作表名稱、fields=JSON字串
 * （{ 子標籤①: '...', 標題: '...', ... }，用「實際欄位名稱」當 key，
 * 不用管欄位順序，程式會自動依照該工作表目前的表頭順序組成正確的
 * 列。ID／建立時間／更新時間／已刪除／來源如果沒帶就自動補上預設值。
 *
 * 前端呼叫方式：**不能用 fetch()**（連 no-cors 模式都會被 Google
 * 擋掉，回 503——這是 Apps Script Web App 對 fetch/XHR 類請求的已知
 * 限制，只有 <script> 標籤／表單送出／瀏覽器導覽不會被擋）。要用隱藏
 * 表單送出（method=POST，送到隱藏 iframe），Apps Script 這邊收到的
 * 會是表單參數（e.parameter），不是 JSON body。
 */
function doPost(e) {
  try {
    var sheetName = e.parameter.sheet;
    var fields = JSON.parse(e.parameter.fields || '{}');
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return respond({ error: '找不到工作表：' + sheetName }, null);
    }

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
  } catch (err) {
    return respond({ error: String(err) }, null);
  }
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
