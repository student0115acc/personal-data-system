// 把解壓縮後的 Keep 筆記，實際寫入 Google Sheets 範本對應的工作表。
// 這一版還不處理圖片／附件上傳，「圖片連結」欄位先留空，下一步再補。
//
// 用法：
//   node scripts/importKeepNotesToSheets.js <Keep 資料夾路徑> [--limit N]
//   --limit N：只處理前 N 篇（用來先小量測試格式對不對），省略則處理全部 546 篇。
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { google } from 'googleapis';
import { getAuthorizedClient } from '../src/google/authClient.js';
import { convertKeepNote } from '../src/keepImport/convertKeepNote.js';

const SPREADSHEET_ID = '1-DuamikZkuWuXDN7Lwysw39dGMrg0WYg2J1iu-GuCM0';

const args = process.argv.slice(2);
const keepDir = args[0];
const limitFlagIndex = args.indexOf('--limit');
const limit = limitFlagIndex !== -1 ? Number(args[limitFlagIndex + 1]) : Infinity;

if (!keepDir) {
  console.error('請提供 Keep 資料夾路徑');
  process.exit(1);
}

function formatTimestamp(usec) {
  if (!usec) return '';
  const date = new Date(Math.floor(Number(usec) / 1000));
  const parts = new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const m = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${m.year}-${m.month}-${m.day} ${m.hour}:${m.minute}:${m.second}`;
}

const jsonFiles = readdirSync(keepDir)
  .filter((f) => f.endsWith('.json'))
  .slice(0, limit);

// 依目標工作表分組要寫入的列
const rowsBySheet = {
  工作紀錄: [],
  環境疑難雜症: [],
  學習筆記: [],
  備忘錄: [],
};
let memoSortValue = 1;
let skippedTrashed = 0;

for (const file of jsonFiles) {
  const note = JSON.parse(readFileSync(join(keepDir, file), 'utf-8'));
  if (note.isTrashed) {
    skippedTrashed += 1;
    continue;
  }

  const { targetSheet, row } = convertKeepNote({
    title: note.title ?? '',
    textContent: note.textContent ?? '',
    labels: note.labels ?? [],
    annotations: note.annotations,
  });

  const createdAt = formatTimestamp(note.createdTimestampUsec);
  const updatedAt = formatTimestamp(note.userEditedTimestampUsec);

  if (targetSheet === '備忘錄') {
    rowsBySheet.備忘錄.push([
      '', // ID：交給 Sheets 之後再補（或使用列號），此處先留空
      row.title,
      row.content,
      memoSortValue++,
      row.completed ? 'TRUE' : 'FALSE',
      row.dueDate,
      row.reminder,
    ]);
  } else {
    rowsBySheet[targetSheet].push([
      '', // ID：同上，先留空
      row.subTag1,
      row.subTag2,
      row.title,
      row.content,
      '', // 圖片連結：下一步（圖片上傳）才會補上
      createdAt,
      updatedAt,
      row.source,
      'FALSE', // 已刪除
    ]);
  }
}

console.log('=== 準備寫入 Google Sheets（僅統計，不含筆記內容） ===');
console.log(`本次處理檔案數：${jsonFiles.length}（垃圾桶跳過 ${skippedTrashed}）`);
for (const [sheetName, rows] of Object.entries(rowsBySheet)) {
  console.log(`  ${sheetName}：${rows.length} 筆`);
}

const auth = await getAuthorizedClient();
const sheets = google.sheets({ version: 'v4', auth });

for (const [sheetName, rows] of Object.entries(rowsBySheet)) {
  if (rows.length === 0) continue;
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows },
  });
  console.log(`✓ 已寫入「${sheetName}」：${rows.length} 筆`);
}

console.log('✓ 完成');
