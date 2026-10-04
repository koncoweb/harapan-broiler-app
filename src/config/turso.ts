// src/config/turso.ts
// Minimal Turso HTTP client (no native deps) using the /v2/pipeline API.
// Works on Expo Go, native, and web via plain fetch.
//
// SECURITY NOTE (by design for this project): the DB auth token is embedded in
// the client bundle (EXPO_PUBLIC_*) for maximum speed with no backend layer.
// Anyone who unpacks the app can extract this token and read/write all data.
// This is an accepted trade-off for this deployment; do not store real secrets
// in this database.

const TURSO_URL = process.env.EXPO_PUBLIC_TURSO_URL;
const TURSO_TOKEN = process.env.EXPO_PUBLIC_TURSO_AUTH_TOKEN;

if (!TURSO_URL || !TURSO_TOKEN) {
  // Fail loudly during development so misconfiguration is obvious.
  throw new Error(
    'Turso is not configured. Set EXPO_PUBLIC_TURSO_URL and EXPO_PUBLIC_TURSO_AUTH_TOKEN in .env'
  );
}

export type SqlValue = string | number | boolean | null | Uint8Array;

export interface ITursoRow {
  [column: string]: SqlValue;
}

interface IResult {
  cols: { name: string }[];
  rows: { type: string; value: string }[][] | null;
  affected_row_count?: number;
  last_insert_rowid?: number | null;
}

interface IPipelineResponseItem {
  type: string;
  error?: string;
  response?: {
    type: string;
    result?: IResult;
  };
}

interface IPipelineResponse {
  error?: string;
  results?: IPipelineResponseItem[];
}

function toArg(value: SqlValue): Record<string, unknown> {
  if (value === null || value === undefined) return { type: 'null' };
  if (typeof value === 'boolean') return { type: 'integer', value: value ? '1' : '0' };
  if (typeof value === 'number') {
    // libSQL HTTP API: integer value is a string, float value is a JSON number.
    return Number.isInteger(value) ? { type: 'integer', value: String(value) } : { type: 'float', value };
  }
  if (value instanceof Uint8Array) return { type: 'blob', value: base64FromBytes(value) };
  return { type: 'text', value: String(value) };
}

function base64FromBytes(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  // btoa is available in Hermes via react-native? Not reliably. Use fallback.
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  let i = 0;
  while (i < binary.length) {
    const c1 = binary.charCodeAt(i++);
    const c2 = binary.charCodeAt(i++);
    const c3 = binary.charCodeAt(i++);
    const e1 = c1 >> 2;
    let e2 = ((c1 & 3) << 4) | (c2 >> 4);
    let e3 = ((c2 & 15) << 2) | (c3 >> 6);
    let e4 = c3 & 63;
    if (Number.isNaN(c2)) { e3 = e4 = 64; }
    else if (Number.isNaN(c3)) { e4 = 64; }
    out += chars[e1] + chars[e2] + (chars[e3] || '=') + (chars[e4] || '=');
  }
  return out;
}

function fromCell(cell: { type: string; value: string } | null): SqlValue {
  if (cell === null || cell === undefined) return null;
  switch (cell.type) {
    case 'integer':
    case 'float':
      return cell.value === null ? null : Number(cell.value);
    case 'null':
      return null;
    default:
      return cell.value; // text / blob (base64)
  }
}

async function post(body: unknown): Promise<IPipelineResponse> {
  const res = await fetch(`${TURSO_URL}/v2/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TURSO_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Turso HTTP ${res.status}: ${text || res.statusText}`);
  }
  return (await res.json()) as IPipelineResponse;
}

function mapRows(result?: IResult): ITursoRow[] {
  if (!result || !result.rows) return [];
  const cols = result.cols.map((c) => c.name);
  return result.rows.map((row) => {
    const obj: ITursoRow = {};
    cols.forEach((name, idx) => {
      obj[name] = fromCell(row[idx]);
    });
    return obj;
  });
}

/** Run a single statement and return typed rows. */
export async function query(sql: string, args: SqlValue[] = []): Promise<ITursoRow[]> {
  const payload = {
    requests: [{ type: 'execute', stmt: { sql, args: args.map(toArg), want_rows: true } }],
  };
  const json = await post(payload);
  if (json.error) throw new Error(`Turso error: ${json.error}`);
  const first = json.results?.[0];
  if (first?.type === 'err') throw new Error(`Turso error: ${first.error}`);
  return mapRows(first?.response?.result);
}

/** Run a single statement that writes; returns affected row count. */
export async function execute(sql: string, args: SqlValue[] = []): Promise<number> {
  const payload = {
    requests: [{ type: 'execute', stmt: { sql, args: args.map(toArg), want_rows: false } }],
  };
  const json = await post(payload);
  if (json.error) throw new Error(`Turso error: ${json.error}`);
  const first = json.results?.[0];
  if (first?.type === 'err') throw new Error(`Turso error: ${first.error}`);
  return first?.response?.result?.affected_row_count ?? 0;
}

/**
 * Run many statements in one round trip. When `transactional` is true they run
 * inside a single write transaction (all-or-nothing) via the pipeline's
 * `transaction_type` field. NOTE: the legacy `{type:'close'}` marker must be
 * LAST in the sequence (and is not needed here); the field-based approach is
 * what the /v2/pipeline API actually accepts.
 */
export async function batch(
  statements: { sql: string; args?: SqlValue[] }[],
  transactional = true
): Promise<ITursoRow[][]> {
  const requests = statements.map((s) => ({
    type: 'execute',
    stmt: { sql: s.sql, args: (s.args ?? []).map(toArg), want_rows: true },
  }));
  const payload = transactional
    ? { requests, transaction_type: 'write' }
    : { requests };
  const json = await post(payload);
  if (json.error) throw new Error(`Turso error: ${json.error}`);
  const results = json.results ?? [];
  return results.map((r) => (r.type === 'err' ? [] : mapRows(r.response?.result)));
}
