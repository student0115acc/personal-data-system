// Google OAuth 登入邏輯：第一次執行會開啟瀏覽器讓使用者登入同意，
// 同意後把 refresh token 存進 token.json，之後執行就不用再登入。
// 這是 Google 官方文件建議的標準寫法（非本專案自創邏輯），純粹是串接
// credentials.json / token.json 與 googleapis 函式庫，不含需要單元測試
// 的商業邏輯。
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { authenticate } from '@google-cloud/local-auth';
import { google } from 'googleapis';

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
];

const PROJECT_ROOT = path.join(import.meta.dirname, '..', '..');
const TOKEN_PATH = path.join(PROJECT_ROOT, 'token.json');
const CREDENTIALS_PATH = path.join(PROJECT_ROOT, 'credentials.json');

async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    return google.auth.fromJSON(JSON.parse(content));
  } catch {
    return null;
  }
}

async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const key = JSON.parse(content).installed ?? JSON.parse(content).web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

export async function getAuthorizedClient() {
  const existing = await loadSavedCredentialsIfExist();
  if (existing) {
    return existing;
  }

  // @google-cloud/local-auth bundles its own (older/different) copy of
  // google-auth-library, separate from the one inside the top-level
  // googleapis package. Handing its OAuth2Client straight to googleapis's
  // google.drive()/google.sheets() causes silent auth failures ("unregistered
  // callers") from a cross-version mismatch. So we only use it to complete
  // the interactive login, save the resulting refresh token, then re-load
  // credentials through googleapis's own google.auth.fromJSON so the object
  // actually used for API calls always comes from one consistent library.
  const client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return loadSavedCredentialsIfExist();
}
