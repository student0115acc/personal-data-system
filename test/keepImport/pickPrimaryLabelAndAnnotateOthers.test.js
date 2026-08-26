import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickPrimaryLabelAndAnnotateOthers } from '../../src/keepImport/pickPrimaryLabelAndAnnotateOthers.js';

test('a single label becomes the primary label, content untouched', () => {
  assert.deepEqual(
    pickPrimaryLabelAndAnnotateOthers(['湖山-網路'], '設定 pfSense'),
    { primaryLabel: '湖山-網路', content: '設定 pfSense' }
  );
});

test('extra labels beyond the first are annotated onto the front of content', () => {
  assert.deepEqual(
    pickPrimaryLabelAndAnnotateOthers(['SQL', '湖山-網路'], '備份指令'),
    {
      primaryLabel: 'SQL',
      content: '〔原標籤：湖山-網路〕\n備份指令',
    }
  );
});
