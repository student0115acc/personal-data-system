// 驗證用腳本：只回報統計數字與出錯的「標籤名稱」，不印出任何一篇筆記的標題或內文。
// 用法：node scripts/validateKeepImport.js <解壓縮後的 Keep 資料夾路徑>

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { convertKeepNote } from '../src/keepImport/convertKeepNote.js';

const keepDir = process.argv[2];
if (!keepDir) {
  console.error('請提供 Keep 資料夾路徑，例如：node scripts/validateKeepImport.js "C:\\...\\Takeout\\Keep"');
  process.exit(1);
}

const jsonFiles = readdirSync(keepDir).filter((f) => f.endsWith('.json'));

let total = 0;
let skippedTrashed = 0;
let missingTextContent = 0;
let succeeded = 0;
const unmappedLabels = new Set();
const otherErrors = [];

for (const file of jsonFiles) {
  total += 1;
  const note = JSON.parse(readFileSync(join(keepDir, file), 'utf-8'));

  if (note.isTrashed) {
    skippedTrashed += 1;
    continue;
  }
  if (typeof note.textContent !== 'string') {
    missingTextContent += 1;
  }

  try {
    convertKeepNote({
      title: note.title ?? '',
      textContent: note.textContent ?? '',
      labels: note.labels ?? [],
      annotations: note.annotations,
    });
    succeeded += 1;
  } catch (err) {
    const match = /標籤「(.+)」不在對照表中/.exec(err.message);
    if (match) {
      unmappedLabels.add(match[1]);
    } else {
      otherErrors.push({ file, message: err.message });
    }
  }
}

console.log('=== Keep 匯入驗證結果（僅統計，不含任何筆記內容） ===');
console.log(`總檔案數：${total}`);
console.log(`已在垃圾桶而跳過：${skippedTrashed}`);
console.log(`缺少 textContent 欄位（以空字串代替）：${missingTextContent}`);
console.log(`成功轉換：${succeeded}`);
console.log(`標籤不在對照表中（需補上）：${unmappedLabels.size} 種`);
if (unmappedLabels.size > 0) {
  console.log('  →', [...unmappedLabels].join('、'));
}
if (otherErrors.length > 0) {
  console.log(`其他非預期錯誤：${otherErrors.length} 筆`);
  for (const e of otherErrors) {
    console.log(`  - ${e.file}: ${e.message}`);
  }
}
