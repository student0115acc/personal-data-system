// 把解壓縮後的 Keep 筆記，實際寫入 Google Sheets 範本對應的工作表，
// 並把附件圖片上傳到 Drive、把連結一起寫進「圖片連結」欄位。
// 圖片統一放進「實用工具」底下的「Keep圖片」子資料夾（帳號私有，不公開分享）。
//
// 用法：
//   node scripts/importKeepNotesToSheets.js <Keep 資料夾路徑> [--limit N]
//   --limit N：只處理前 N 篇（用來先小量測試格式對不對），省略則處理全部。
import { readdirSync, readFileSync, createReadStream } from 'node:fs';
import { join } from 'node:path';
import { google } from 'googleapis';
import { getAuthorizedClient } from '../src/google/authClient.js';
import { convertKeepNote } from '../src/keepImport/convertKeepNote.js';

const SPREADSHEET_ID = '1-DuamikZkuWuXDN7Lwysw39dGMrg0WYg2J1iu-GuCM0';
const UTILITY_FOLDER_ID = '1ed8wsZ7lfqEaHO1Yl6L9WKHNehecm74V';
const IMAGES_FOLDER_NAME = 'Keep圖片';

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

const auth = await getAuthorizedClient();
const sheets = google.sheets({ version: 'v4', auth });
const drive = google.drive({ version: 'v3', auth });

// 找到（或建立）「Keep圖片」子資料夾
async function getOrCreateImagesFolder() {
  const existing = await drive.files.list({
    q: `name = '${IMAGES_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and '${UTILITY_FOLDER_ID}' in parents and trashed = false`,
    fields: 'files(id,name)',
  });
  if (existing.data.files.length > 0) {
    return existing.data.files[0].id;
  }
  const created = await drive.files.create({
    requestBody: {
      name: IMAGES_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [UTILITY_FOLDER_ID],
    },
    fields: 'id',
  });
  return created.data.id;
}

async function uploadAttachment(keepDir, attachment, imagesFolderId) {
  const localPath = join(keepDir, attachment.filePath);
  const created = await drive.files.create({
    requestBody: {
      name: attachment.filePath,
      parents: [imagesFolderId],
    },
    media: {
      mimeType: attachment.mimetype,
      body: createReadStream(localPath),
    },
    fields: 'id',
  });
  return `https://drive.google.com/file/d/${created.data.id}/view`;
}

const imagesFolderId = await getOrCreateImagesFolder();
console.log(`圖片資料夾就緒，ID：${imagesFolderId}`);

const jsonFiles = readdirSync(keepDir)
  .filter((f) => f.endsWith('.json'))
  .slice(0, limit);

const rowsBySheet = {
  工作紀錄: [],
  環境疑難雜症: [],
  學習筆記: [],
  備忘錄: [],
};
let memoSortValue = 1;
let skippedTrashed = 0;
let uploadedCount = 0;
let processedCount = 0;

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

  const attachments = note.attachments ?? [];
  const imageLinks = [];
  for (const attachment of attachments) {
    const link = await uploadAttachment(keepDir, attachment, imagesFolderId);
    imageLinks.push(link);
    uploadedCount += 1;
  }

  const createdAt = formatTimestamp(note.createdTimestampUsec);
  const updatedAt = formatTimestamp(note.userEditedTimestampUsec);

  if (targetSheet === '備忘錄') {
    const content =
      imageLinks.length > 0
        ? `${row.content}\n〔附件〕\n${imageLinks.join('\n')}`
        : row.content;
    rowsBySheet.備忘錄.push([
      '',
      row.title,
      content,
      memoSortValue++,
      row.completed ? 'TRUE' : 'FALSE',
      row.dueDate,
      row.reminder,
    ]);
  } else {
    rowsBySheet[targetSheet].push([
      '',
      row.subTag1,
      row.subTag2,
      row.title,
      row.content,
      imageLinks.join('\n'),
      createdAt,
      updatedAt,
      row.source,
      'FALSE',
    ]);
  }

  processedCount += 1;
  if (processedCount % 50 === 0) {
    console.log(`已處理 ${processedCount}/${jsonFiles.length} 篇...`);
  }
}

console.log('=== 準備寫入 Google Sheets（僅統計，不含筆記內容） ===');
console.log(`本次處理檔案數：${jsonFiles.length}（垃圾桶跳過 ${skippedTrashed}）`);
console.log(`已上傳圖片：${uploadedCount} 個`);
for (const [sheetName, rows] of Object.entries(rowsBySheet)) {
  console.log(`  ${sheetName}：${rows.length} 筆`);
}

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
