import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTargetSheet } from '../../src/keepImport/resolveTargetSheet.js';

test('resolves a known subTag1/subTag2 pair to its target sheet', () => {
  assert.equal(resolveTargetSheet('湖山', '網路-pfSense'), '環境疑難雜症');
});

test('throws for a pair absent from the mapping table, instead of guessing', () => {
  assert.throws(
    () => resolveTargetSheet('未知標籤', ''),
    /未知標籤/
  );
});
