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
