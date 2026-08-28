import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeDisplayStatus } from '../../src/purchases/computeDisplayStatus.js';

test('款項屬性＝自用 顯示「自用」灰色', () => {
  assert.deepEqual(computeDisplayStatus({ 款項屬性: '自用' }), {
    text: '自用',
    color: 'gray',
  });
});

test('款項屬性＝回饋金已抵用 顯示「回饋金已抵用」藍色', () => {
  assert.deepEqual(computeDisplayStatus({ 款項屬性: '回饋金已抵用' }), {
    text: '回饋金已抵用',
    color: 'blue',
  });
});

test('款項屬性＝需請款撥款 且 到貨狀態＝未到貨 顯示「待到貨」紅色', () => {
  assert.deepEqual(
    computeDisplayStatus({ 款項屬性: '需請款撥款', 到貨狀態: '未到貨' }),
    { text: '待到貨', color: 'red' }
  );
});

test('到貨狀態＝已到貨 且 請款狀態＝未請款 顯示「待請款」橘色', () => {
  assert.deepEqual(
    computeDisplayStatus({
      款項屬性: '需請款撥款',
      到貨狀態: '已到貨',
      請款狀態: '未請款',
    }),
    { text: '待請款', color: 'orange' }
  );
});

test('請款狀態＝已請款 且 撥款狀態＝未撥款 顯示「待撥款」黃色', () => {
  assert.deepEqual(
    computeDisplayStatus({
      款項屬性: '需請款撥款',
      到貨狀態: '已到貨',
      請款狀態: '已請款',
      撥款狀態: '未撥款',
    }),
    { text: '待撥款', color: 'yellow' }
  );
});

test('撥款狀態＝已撥款 顯示「撥款完成」綠色', () => {
  assert.deepEqual(
    computeDisplayStatus({
      款項屬性: '需請款撥款',
      到貨狀態: '已到貨',
      請款狀態: '已請款',
      撥款狀態: '已撥款',
    }),
    { text: '撥款完成', color: 'green' }
  );
});
