// 連線測試：只用來證明 OAuth 登入跟 Drive API 呼叫都能正常運作。
// 找不到「實用工具」資料夾就建立一個新的。只印出資料夾名稱/ID 確認連通，
// 不會印出任何個人資料內容。
import { google } from 'googleapis';
import { getAuthorizedClient } from '../src/google/authClient.js';

const FOLDER_NAME = '實用工具';

const auth = await getAuthorizedClient();
const drive = google.drive({ version: 'v3', auth });

const existing = await drive.files.list({
  q: `name = '${FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
  fields: 'files(id, name)',
});

console.log('=== 連線測試結果 ===');

let folder;
if (existing.data.files.length > 0) {
  folder = existing.data.files[0];
  console.log(`找到既有的「${FOLDER_NAME}」資料夾`);
} else {
  const created = await drive.files.create({
    requestBody: {
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id, name',
  });
  folder = created.data;
  console.log(`已建立新的「${FOLDER_NAME}」資料夾`);
}

console.log(`資料夾 ID：${folder.id}`);
console.log('✓ Drive API 連線成功（讀取／建立都正常）');
