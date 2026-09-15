import { q } from './db.js';

// Append a row to audit_logs for every sensitive admin/landlord write.
// Call this AFTER the write succeeds so the log never records failures.
export async function logAudit(actorId, actorRole, action, targetTable, targetId, detail = {}) {
  await q(
    'INSERT INTO audit_logs (actor_id, actor_role, action, target_table, target_id, detail) VALUES (?, ?, ?, ?, ?, ?)',
    [actorId, actorRole, action, targetTable, targetId, JSON.stringify(detail)]
  );
}