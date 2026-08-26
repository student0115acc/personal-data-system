import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendWeblinksToContent } from '../../src/keepImport/appendWeblinksToContent.js';

test('no annotations leaves content untouched', () => {
  assert.equal(appendWeblinksToContent('筆記內容', []), '筆記內容');
});

test('a weblink annotation is appended as an HTML link after the content', () => {
  assert.equal(
    appendWeblinksToContent('pfSense如何限流？', [
      {
        source: 'WEBLINK',
        title: 'Traffic Shaper — Limiters | pfSense Documentation',
        url: 'https://docs.netgate.com/pfsense/en/latest/trafficshaper/limiters.html',
      },
    ]),
    'pfSense如何限流？\n<a href="https://docs.netgate.com/pfsense/en/latest/trafficshaper/limiters.html">Traffic Shaper — Limiters | pfSense Documentation</a>'
  );
});
