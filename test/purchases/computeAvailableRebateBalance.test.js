import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeAvailableRebateBalance } from '../../src/purchases/computeAvailableRebateBalance.js';

test('sums 信用卡回饋金 for rows that are 已存入回饋池 and not yet 已使用', () => {
  const purchases = [
    { 回饋金狀態: '已存入回饋池', 信用卡回饋金: 100, 已使用: false },
    { 回饋金狀態: '已存入回饋池', 信用卡回饋金: 50, 已使用: false },
    { 回饋金狀態: '待處理', 信用卡回饋金: 999, 已使用: false },
    { 回饋金狀態: '已存入回饋池', 信用卡回饋金: 30, 已使用: true },
  ];
  assert.equal(computeAvailableRebateBalance(purchases), 150);
});
