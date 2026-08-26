import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convertKeepNote } from '../../src/keepImport/convertKeepNote.js';

test('a single-labelled note with no annotations converts to its target sheet and row', () => {
  const note = {
    title: 'pfSense如何限流？',
    textContent: '設定步驟...',
    labels: [{ name: '湖山-網路-pfSense' }],
  };

  assert.deepEqual(convertKeepNote(note), {
    targetSheet: '環境疑難雜症',
    row: {
      subTag1: '湖山',
      subTag2: '網路-pfSense',
      title: 'pfSense如何限流？',
      content: '設定步驟...',
      source: 'Keep 匯入',
    },
  });
});

test('a note with no labels lands in 學習筆記 with both subtags blank', () => {
  const note = {
    title: '財務小信封',
    textContent: '120磅白牛皮紙歐12開',
    labels: [],
  };

  assert.deepEqual(convertKeepNote(note), {
    targetSheet: '學習筆記',
    row: {
      subTag1: '',
      subTag2: '',
      title: '財務小信封',
      content: '120磅白牛皮紙歐12開',
      source: 'Keep 匯入',
    },
  });
});

test('a note with a weblink annotation gets the link appended to content', () => {
  const note = {
    title: 'pfSense如何限流？',
    textContent: '設定步驟...',
    labels: [{ name: '湖山-網路-pfSense' }],
    annotations: [
      {
        source: 'WEBLINK',
        title: 'Limiters | pfSense Documentation',
        url: 'https://docs.netgate.com/pfsense/en/latest/trafficshaper/limiters.html',
      },
    ],
  };

  assert.deepEqual(convertKeepNote(note), {
    targetSheet: '環境疑難雜症',
    row: {
      subTag1: '湖山',
      subTag2: '網路-pfSense',
      title: 'pfSense如何限流？',
      content:
        '設定步驟...\n<a href="https://docs.netgate.com/pfsense/en/latest/trafficshaper/limiters.html">Limiters | pfSense Documentation</a>',
      source: 'Keep 匯入',
    },
  });
});

test('a multi-labelled note classifies by the first label and annotates the rest into content', () => {
  const note = {
    title: '備份指令',
    textContent: '每天凌晨備份',
    labels: [{ name: 'SQL' }, { name: '湖山-網路' }],
  };

  assert.deepEqual(convertKeepNote(note), {
    targetSheet: '環境疑難雜症',
    row: {
      subTag1: 'SQL',
      subTag2: '',
      title: '備份指令',
      content: '〔原標籤：湖山-網路〕\n每天凌晨備份',
      source: 'Keep 匯入',
    },
  });
});
