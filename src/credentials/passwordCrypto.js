// 帳密資料表的密碼欄位加密。用固定金鑰（寫死在前端程式碼中，見規格書
// v2 定案 R2-Q3(a)）做 AES-GCM 加解密，只防「不小心分享 Sheets 檢視
// 權限」這種情境，不是防真正的攻擊者，所以不需要每次登入輸入密碼。

function toBase64(bytes) {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(str) {
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(str, 'base64'));
  const binary = atob(str);
  return new Uint8Array([...binary].map((c) => c.charCodeAt(0)));
}

async function deriveKey(passphrase) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(passphrase));
  return crypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptPassword(plainText, passphrase) {
  const key = await deriveKey(passphrase);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plainText)
  );
  const combined = new Uint8Array(iv.length + cipherBuf.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuf), iv.length);
  return toBase64(combined);
}

export async function decryptPassword(cipherTextBase64, passphrase) {
  const key = await deriveKey(passphrase);
  const combined = fromBase64(cipherTextBase64);
  const iv = combined.slice(0, 12);
  const cipherBuf = combined.slice(12);
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBuf);
  return new TextDecoder().decode(plainBuf);
}
