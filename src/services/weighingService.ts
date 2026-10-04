// src/services/weighingService.ts
// Turso-backed data layer for weighing sessions.
// Replaces the previous Firestore `onSnapshot` (which loaded ALL rows) with
// server-side pagination and search pushdown — the main performance fix.
import { query, execute, batch, SqlValue, ITursoRow } from '../config/turso';
import { WeighingSession, WeighingItem } from '../types';

export interface ListParams {
  limit?: number;
  offset?: number;
  /** free-text search (buyer/driver/date/notes) pushed down to SQL via LIKE */
  search?: string;
  /** filter by payment status: 'Lunas' | 'Sebagian' | 'Belum Lunas' */
  paymentStatus?: string;
  /** inclusive date range (YYYY-MM-DD) */
  startDate?: string;
  endDate?: string;
}

export interface ListResult {
  sessions: WeighingSession[];
  total: number;
}

function parseItems(raw: SqlValue): WeighingItem[] {
  if (typeof raw !== 'string' || !raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function rowToSession(row: ITursoRow): WeighingSession {
  return {
    id: String(row.id ?? ''),
    date: String(row.date ?? ''),
    time: String(row.time ?? ''),
    buyer: String(row.buyer ?? ''),
    driver: String(row.driver ?? ''),
    basePrice: Number(row.base_price ?? 0),
    cnAmount: Number(row.cn_amount ?? 0),
    finalPrice: Number(row.final_price ?? 0),
    items: parseItems(row.items),
    totalNetWeight: Number(row.total_net_weight ?? 0),
    totalAmount: Number(row.total_amount ?? 0),
    totalColi: Number(row.total_coli ?? 0),
    amountPaid: Number(row.amount_paid ?? 0),
    paymentStatus: (row.payment_status as WeighingSession['paymentStatus']) ?? 'Belum Lunas',
    notes: String(row.notes ?? ''),
    createdBy: String(row.created_by ?? ''),
    createdAt: Number(row.created_at ?? 0),
  };
}

/** Build the shared WHERE clause + args from filters. */
function buildWhere(params: ListParams): { where: string; args: SqlValue[] } {
  const clauses: string[] = [];
  const args: SqlValue[] = [];

  if (params.search && params.search.trim()) {
    const like = `%${params.search.trim()}%`;
    clauses.push('(buyer LIKE ? OR driver LIKE ? OR date LIKE ? OR notes LIKE ?)');
    args.push(like, like, like, like);
  }
  if (params.paymentStatus) {
    clauses.push('payment_status = ?');
    args.push(params.paymentStatus);
  }
  if (params.startDate) {
    clauses.push('date >= ?');
    args.push(params.startDate);
  }
  if (params.endDate) {
    clauses.push('date <= ?');
    args.push(params.endDate);
  }

  const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
  return { where, args };
}

/** Paginated, filtered list + total count (two statements, one round trip). */
export async function listSessions(params: ListParams = {}): Promise<ListResult> {
  const limit = params.limit ?? 25;
  const offset = params.offset ?? 0;
  const { where, args } = buildWhere(params);

  const listSql = `SELECT * FROM weighing_sessions${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  const countSql = `SELECT COUNT(*) AS c FROM weighing_sessions${where}`;

  const [listRes, countRes] = await batch([
    { sql: listSql, args: [...args, limit, offset] },
    { sql: countSql, args: [...args] },
  ]);

  const sessions = listRes.map(rowToSession);
  const total = Number(countRes[0]?.c ?? 0);
  return { sessions, total };
}

export async function getSession(id: string): Promise<WeighingSession | null> {
  const rows = await query('SELECT * FROM weighing_sessions WHERE id = ?', [id]);
  return rows.length ? rowToSession(rows[0]) : null;
}

export async function createSession(
  session: Omit<WeighingSession, 'id'> & { id?: string }
): Promise<string> {
  const id = session.id || `ws_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  await execute(
    `INSERT INTO weighing_sessions
      (id, date, time, buyer, driver, base_price, cn_amount, final_price,
       total_net_weight, total_amount, total_coli, amount_paid, payment_status,
       notes, items, created_by, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      session.date,
      session.time,
      session.buyer,
      session.driver,
      session.basePrice,
      session.cnAmount,
      session.finalPrice,
      session.totalNetWeight,
      session.totalAmount,
      session.totalColi,
      session.amountPaid ?? 0,
      session.paymentStatus ?? 'Belum Lunas',
      session.notes ?? '',
      JSON.stringify(session.items ?? []),
      session.createdBy,
      session.createdAt ? Number(session.createdAt) : Date.now(),
    ]
  );
  return id;
}

export async function updateSession(
  id: string,
  session: Omit<WeighingSession, 'id'>
): Promise<void> {
  await execute(
    `UPDATE weighing_sessions SET
       date=?, time=?, buyer=?, driver=?, base_price=?, cn_amount=?, final_price=?,
       total_net_weight=?, total_amount=?, total_coli=?, amount_paid=?, payment_status=?,
       notes=?, items=?, created_by=?, created_at=?
     WHERE id=?`,
    [
      session.date,
      session.time,
      session.buyer,
      session.driver,
      session.basePrice,
      session.cnAmount,
      session.finalPrice,
      session.totalNetWeight,
      session.totalAmount,
      session.totalColi,
      session.amountPaid ?? 0,
      session.paymentStatus ?? 'Belum Lunas',
      session.notes ?? '',
      JSON.stringify(session.items ?? []),
      session.createdBy,
      session.createdAt ? Number(session.createdAt) : Date.now(),
      id,
    ]
  );
}

export async function deleteSession(id: string): Promise<void> {
  await execute('DELETE FROM weighing_sessions WHERE id = ?', [id]);
}

/** Batch delete (chunked). Turso has no 500-op batch cap like Firestore. */
export async function deleteMany(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const placeholders = ids.map(() => '?').join(',');
  await execute(`DELETE FROM weighing_sessions WHERE id IN (${placeholders})`, ids);
}
