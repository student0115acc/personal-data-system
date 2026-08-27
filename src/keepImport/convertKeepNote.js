import { splitLabel } from './splitLabel.js';
import { resolveTargetSheet } from './resolveTargetSheet.js';
import { pickPrimaryLabelAndAnnotateOthers } from './pickPrimaryLabelAndAnnotateOthers.js';
import { appendWeblinksToContent } from './appendWeblinksToContent.js';

export function convertKeepNote(note) {
  let subTag1 = '';
  let subTag2 = '';
  let targetSheet = '學習筆記';
  let content = appendWeblinksToContent(note.textContent, note.annotations ?? []);

  if (note.labels.length > 0) {
    const labelNames = note.labels.map((l) => l.name);
    const picked = pickPrimaryLabelAndAnnotateOthers(labelNames, content);
    content = picked.content;
    ({ subTag1, subTag2 } = splitLabel(picked.primaryLabel));
    targetSheet = resolveTargetSheet(subTag1, subTag2);
  }

  if (targetSheet === '備忘錄') {
    return {
      targetSheet,
      row: {
        title: note.title,
        content,
        completed: false,
        dueDate: '',
        reminder: '',
      },
    };
  }

  return {
    targetSheet,
    row: {
      subTag1,
      subTag2,
      title: note.title,
      content,
      source: 'Keep 匯入',
    },
  };
}
