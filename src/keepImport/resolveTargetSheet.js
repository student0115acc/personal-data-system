import { labelTargetSheetTable } from './labelTargetSheetTable.js';

export function resolveTargetSheet(subTag1, subTag2) {
  const entry = labelTargetSheetTable.find(
    (row) => row.subTag1 === subTag1 && row.subTag2 === subTag2
  );
  if (!entry) {
    const label = subTag2 ? `${subTag1}-${subTag2}` : subTag1;
    throw new Error(
      `resolveTargetSheet: 標籤「${label}」不在對照表中，需人工確認目標工作表`
    );
  }
  return entry.targetSheet;
}
