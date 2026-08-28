// 建立 Google Sheets 範本：7 張工作表＋1 目錄頁，欄位依照
// 個人資料整理系統-需求規格書.md（定案版 v2）第 4 節建立表頭。
// 執行一次即可；重複執行會再建一份新的試算表，不會覆蓋舊的。
import { google } from 'googleapis';
import { getAuthorizedClient } from '../src/google/authClient.js';

const UTILITY_FOLDER_ID = '1ed8wsZ7lfqEaHO1Yl6L9WKHNehecm74V'; // 「實用工具」資料夾（verdipeng@gmail.com）

const SHARED_RECORD_HEADERS = [
  'ID',
  '子標籤①',
  '子標籤②',
  '標題',
  '內容',
  '圖片連結',
  '建立時間',
  '更新時間',
  '來源',
  '已刪除',
];

const SHEETS = [
  {
    title: '目錄',
    headers: ['工作表名稱', '說明'],
  },
  {
    title: '備忘錄',
    headers: ['ID', '標題', '內容', '排序值', '完成狀態', '截止日期', '提醒設定'],
  },
  {
    title: '採購紀錄',
    headers: [
      'ID',
      '購買日期',
      '歸屬/請款單位',
      '使用單位/經手人',
      '採購類型',
      '物品名稱',
      '金額（台幣）',
      '支付卡別',
      '信用卡回饋金',
      '款項屬性',
      '到貨狀態',
      '請款狀態',
      '撥款狀態',
      '回饋金狀態',
      '已使用', // v2 補充定案：回饋金總覽面板扣除用（回饋金狀態=已存入回饋池 且 已使用≠true 才算進可用餘額）
      '發票附件連結',
      '來源網址',
      '備註',
      '已刪除',
    ],
  },
  {
    title: '帳密資料',
    headers: [
      'ID',
      '子標籤①（對象/系統）',
      '子標籤②（類型）',
      '網站/系統名稱',
      '帳號',
      '密碼',
      '網址',
      '備註',
      '建立時間',
      '更新時間',
      '已刪除',
    ],
  },
  { title: '工作紀錄', headers: SHARED_RECORD_HEADERS },
  { title: '環境疑難雜症', headers: SHARED_RECORD_HEADERS },
  { title: '學習筆記', headers: SHARED_RECORD_HEADERS },
  {
    title: '設定',
    headers: ['設定類型', '選項值', '所屬子標籤①', '備註'],
  },
];

const auth = await getAuthorizedClient();
const sheets = google.sheets({ version: 'v4', auth });
const drive = google.drive({ version: 'v3', auth });

console.log('=== 建立 Google Sheets 範本 ===');

// 1) 建立試算表本體，一次把所有分頁的標題都建好
const created = await sheets.spreadsheets.create({
  requestBody: {
    properties: { title: '個人資料整理系統' },
    sheets: SHEETS.map((s) => ({ properties: { title: s.title } })),
  },
  fields: 'spreadsheetId,sheets(properties(sheetId,title))',
});
const spreadsheetId = created.data.spreadsheetId;
const sheetIdByTitle = Object.fromEntries(
  created.data.sheets.map((s) => [s.properties.title, s.properties.sheetId])
);
console.log(`已建立試算表，ID：${spreadsheetId}`);

// 2) 寫入每張表的表頭列
await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId,
  requestBody: {
    valueInputOption: 'RAW',
    data: SHEETS.map((s) => ({
      range: `${s.title}!A1`,
      values: [s.headers],
    })),
  },
});
console.log('已寫入所有工作表的表頭');

// 3) 表頭列加粗、凍結第一列，並把目錄頁的內容也填好
const formatRequests = SHEETS.map((s) => ({
  repeatCell: {
    range: {
      sheetId: sheetIdByTitle[s.title],
      startRowIndex: 0,
      endRowIndex: 1,
    },
    cell: { userEnteredFormat: { textFormat: { bold: true } } },
    fields: 'userEnteredFormat.textFormat.bold',
  },
}));
const freezeRequests = SHEETS.map((s) => ({
  updateSheetProperties: {
    properties: {
      sheetId: sheetIdByTitle[s.title],
      gridProperties: { frozenRowCount: 1 },
    },
    fields: 'gridProperties.frozenRowCount',
  },
}));
// 建立時間／更新時間欄位要顯示成日期時間，不然會顯示成一串序號數字
const dateTimeFormat = { numberFormat: { type: 'DATE_TIME', pattern: 'yyyy-mm-dd hh:mm:ss' } };
const dateFormat = { numberFormat: { type: 'DATE', pattern: 'yyyy-mm-dd' } };
const dateColumnRequests = [
  // 工作紀錄／環境疑難雜症／學習筆記：G欄(建立時間)~H欄(更新時間)
  ...['工作紀錄', '環境疑難雜症', '學習筆記'].map((title) => ({
    repeatCell: {
      range: { sheetId: sheetIdByTitle[title], startRowIndex: 1, startColumnIndex: 6, endColumnIndex: 8 },
      cell: { userEnteredFormat: dateTimeFormat },
      fields: 'userEnteredFormat.numberFormat',
    },
  })),
  // 帳密資料：H欄(建立時間)~I欄(更新時間)
  {
    repeatCell: {
      range: { sheetId: sheetIdByTitle['帳密資料'], startRowIndex: 1, startColumnIndex: 7, endColumnIndex: 9 },
      cell: { userEnteredFormat: dateTimeFormat },
      fields: 'userEnteredFormat.numberFormat',
    },
  },
  // 備忘錄：F欄(截止日期)
  {
    repeatCell: {
      range: { sheetId: sheetIdByTitle['備忘錄'], startRowIndex: 1, startColumnIndex: 5, endColumnIndex: 6 },
      cell: { userEnteredFormat: dateFormat },
      fields: 'userEnteredFormat.numberFormat',
    },
  },
];

await sheets.spreadsheets.batchUpdate({
  spreadsheetId,
  requestBody: { requests: [...formatRequests, ...freezeRequests, ...dateColumnRequests] },
});

const directoryRows = SHEETS.filter((s) => s.title !== '目錄').map((s) => [
  s.title,
]);
await sheets.spreadsheets.values.update({
  spreadsheetId,
  range: '目錄!A2',
  valueInputOption: 'RAW',
  requestBody: { values: directoryRows },
});
console.log('已加粗表頭、凍結首列，並填好目錄頁');

// 4) 把這份試算表搬進「實用工具」資料夾
const file = await drive.files.get({ fileId: spreadsheetId, fields: 'parents' });
await drive.files.update({
  fileId: spreadsheetId,
  addParents: UTILITY_FOLDER_ID,
  removeParents: (file.data.parents ?? []).join(','),
  fields: 'id,parents',
});
console.log('已搬移到「實用工具」資料夾');

console.log('✓ 完成');
console.log(`開啟連結：https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
