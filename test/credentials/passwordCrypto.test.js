import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encryptPassword, decryptPassword } from '../../src/credentials/passwordCrypto.js';

test('decrypting an encrypted password returns the original plaintext', async () => {
  const cipherText = await encryptPassword('hunter2', 'test-passphrase');
  const plainText = await decryptPassword(cipherText, 'test-passphrase');
  assert.equal(plainText, 'hunter2');
});

test('the stored ciphertext does not contain the plaintext password', async () => {
  const cipherText = await encryptPassword('hunter2', 'test-passphrase');
  assert.notEqual(cipherText, 'hunter2');
  assert.equal(cipherText.includes('hunter2'), false);
});

test('encrypting the same password twice produces different ciphertexts (random IV)', async () => {
  const a = await encryptPassword('hunter2', 'test-passphrase');
  const b = await encryptPassword('hunter2', 'test-passphrase');
  assert.notEqual(a, b);
});

test('decrypting with the wrong passphrase fails instead of returning wrong data', async () => {
  const cipherText = await encryptPassword('hunter2', 'test-passphrase');
  await assert.rejects(() => decryptPassword(cipherText, 'wrong-passphrase'));
});
