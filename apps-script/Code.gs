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
  try {
    var sheetName = (e.parameter && e.parameter.sheet) || '學習筆記';
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return jsonResponse({ error: '找不到工作表：' + sheetName });
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

    return jsonResponse({ sheet: sheetName, rows: rows });
  } catch (err) {
    return jsonResponse({ error: String(err) });
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
