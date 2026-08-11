import pool from '../db/pool';

interface AuditUser {
  id: string;
  name: string;
  role: string;
}

export async function logAudit(
  user: AuditUser,
  action: string,
  entityType: string,
  entityId?: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO audit_log (user_id, user_name, user_role, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        user.id,
        user.name,
        user.role,
        action,
        entityType,
        entityId || null,
        details ? JSON.stringify(details) : null,
      ]
    );
  } catch (error) {
    console.error('Audit log error:', error);
  }
}
