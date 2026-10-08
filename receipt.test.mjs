import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTestReceipt, writeInChunks } from './receipt.js';

test('receipt uses safe ESC/POS commands and fits 32-column paper', () => {
  const bytes = buildTestReceipt();
  assert.deepEqual([...bytes.slice(0, 2)], [0x1b, 0x40]);
  assert.equal(bytes.includes(0x1d), false, 'no GS cutter commands');
  assert.equal(bytes.includes(0x10), false, 'no DLE commands');
  assert.equal([...bytes].some((byte, i) => byte === 0x1b && bytes[i + 1] === 0x70), false, 'no cash drawer command');
  const text = new TextDecoder().decode(bytes);
  assert.match(text, /TOTAL/);
  assert.match(text, /Left aligned/);
  assert.match(text, /Center aligned/);
  assert.match(text, /Right aligned/);
  for (const line of text.replaceAll(/\x1b@|\x1ba[\x00-\x02]/g, '').split('\n')) {
    assert.ok(line.length <= 32, `line too long: ${line}`);
  }
  assert.match(text, /\n\n\n$/);
});

test('serial writes stay within 32 bytes and stop after disconnect', async () => {
  const chunks = [];
  const writer = { write: async (chunk) => chunks.push(chunk) };
  const bytes = Uint8Array.from({ length: 70 }, (_, i) => i);
  await writeInChunks(writer, bytes, () => false);
  assert.deepEqual(chunks.map((chunk) => chunk.length), [32, 32, 6]);
  let writes = 0;
  await assert.rejects(
    writeInChunks({ write: async () => { writes += 1; } }, bytes, () => writes > 0),
    /disconnected/i,
  );
  assert.equal(writes, 1);
});
