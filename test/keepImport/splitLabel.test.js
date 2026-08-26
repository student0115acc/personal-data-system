import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitLabel } from '../../src/keepImport/splitLabel.js';

test('splits a dash-separated label on the first dash', () => {
  assert.deepEqual(splitLabel('湖山-網路-pfSense'), {
    subTag1: '湖山',
    subTag2: '網路-pfSense',
  });
});

test('a label with no dash becomes subTag1 only, subTag2 empty', () => {
  assert.deepEqual(splitLabel('法寶'), {
    subTag1: '法寶',
    subTag2: '',
  });
});
