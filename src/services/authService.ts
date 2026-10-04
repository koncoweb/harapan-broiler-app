// src/services/authService.ts
// Turso-backed authentication. Replaces Firebase Auth entirely.
//
// Password scheme (must stay byte-for-byte identical to scripts/seed-users.js):
//   password_hash = `${salt}$${SHA256_HEX(salt + ":" + password)}`
//   - salt: 16 random bytes, hex-encoded (32 chars), generated per user
//   - SHA-256 over the UTF-8 bytes of `salt + ":" + password`, lowercase hex
// expo-crypto's digestStringAsync and Node's crypto.createHash('sha256') both
// produce the same lowercase hex for the same UTF-8 input, so seed rows created
// offline verify correctly in-app. No plaintext is ever stored.
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { query, execute } from '../config/turso';
import { ITursoRow } from '../config/turso';

const SESSION_KEY = '@harapan/auth_user';

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
}

export interface LoginResult {
  user: AuthUser;
  /** true when this is the account's very first login (default password still in use) */
  mustChangePassword: boolean;
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

async function sha256Hex(input: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);
}

/** Generate a random 16-byte hex salt. */
async function generateSalt(): Promise<string> {
  return bytesToHex(Crypto.getRandomBytes(16));
}

/** Build the stored `salt$hash` string for a plaintext password. */
export async function hashPassword(password: string): Promise<string> {
  const salt = await generateSalt();
  const hash = await sha256Hex(`${salt}:${password}`);
  return `${salt}$${hash}`;
}

/** Verify a plaintext password against a stored `salt$hash` string. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = (stored || '').split('$');
  if (!salt || !hash) return false;
  const computed = await sha256Hex(`${salt}:${password}`);
  // Constant-ish compare (lengths already equal for SHA-256 hex).
  if (computed.length !== hash.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ hash.charCodeAt(i);
  }
  return diff === 0;
}

function rowToUser(row: ITursoRow): AuthUser {
  return {
    uid: String(row.id),
    email: String(row.email),
    displayName: String(row.display_name ?? ''),
    role: (row.role === 'admin' ? 'admin' : 'user') as AuthUser['role'],
  };
}

/** Look up a user row by email (case-insensitive) with its hash + first-login flag. */
async function findByName(email: string) {
  const rows = await query(
    `SELECT id, email, display_name, password_hash, role, disabled, last_login
     FROM users WHERE lower(email) = lower(?) LIMIT 1`,
    [email]
  );
  return rows[0] ?? null;
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const row = await findByName(email);
  if (!row) throw new Error('EMAIL_NOT_FOUND');
  if (Number(row.disabled ?? 0) === 1) throw new Error('ACCOUNT_DISABLED');

  const ok = await verifyPassword(password, String(row.password_hash ?? ''));
  if (!ok) throw new Error('INVALID_PASSWORD');

  const mustChangePassword = row.last_login === null || row.last_login === undefined;
  await execute('UPDATE users SET last_login = ? WHERE id = ?', [Date.now(), String(row.id)]);

  const user = rowToUser(row);
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return { user, mustChangePassword };
}

export async function register(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<AuthUser> {
  const existing = await findByName(input.email);
  if (existing) throw new Error('EMAIL_IN_USE');

  const id = `usr_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const passwordHash = await hashPassword(input.password);
  const now = Date.now();

  await execute(
    `INSERT INTO users (id, email, display_name, password_hash, role, disabled, created_at, last_login)
     VALUES (?, ?, ?, ?, 'user', 0, ?, ?)`,
    [id, input.email.trim(), input.displayName.trim(), passwordHash, now, now]
  );

  const user: AuthUser = {
    uid: id,
    email: input.email.trim(),
    displayName: input.displayName.trim(),
    role: 'user',
  };
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
}

/** Change the current user's password (used for the forced first-login change). */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error('NOT_AUTHENTICATED');
  const row = await findByName(user.email);
  if (!row) throw new Error('NOT_AUTHENTICATED');

  const ok = await verifyPassword(currentPassword, String(row.password_hash ?? ''));
  if (!ok) throw new Error('INVALID_PASSWORD');

  const passwordHash = await hashPassword(newPassword);
  await execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, user.uid]);
}

export async function signOut(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

/** Read the persisted session (restores login across app restarts). */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    return parsed && parsed.uid ? parsed : null;
  } catch {
    return null;
  }
}

/** Refresh role/displayName from the DB (source of truth) for the signed-in user. */
export async function refreshCurrentUser(): Promise<AuthUser | null> {
  const current = await getCurrentUser();
  if (!current) return null;
  const row = await findByName(current.email);
  if (!row || Number(row.disabled ?? 0) === 1) {
    await signOut();
    return null;
  }
  const user = rowToUser(row);
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
}
