import { getDB } from '@/lib/db'
import { sendEmail } from '@/lib/email'

export type NotificationType =
  | 'application_approved'
  | 'application_rejected'
  | 'payment_success'
  | 'payment_received'
  | 'subdomain_expiring'
  | 'subdomain_expired'
  | 'abuse_resolved'
  | 'system'

export interface Notification {
  id: number
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  link: string | null
  is_read: number
  created_at: string
}

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body?: string,
  link?: string
): Promise<number> {
  const db = await getDB()
  const r = await db
    .prepare(
      `INSERT INTO notifications (user_id, type, title, body, link)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(userId, type, title, body || null, link || null)
    .run()
  return r.meta.last_row_id as number
}

export async function getUserNotifications(
  userId: string,
  limit = 20
): Promise<{ notifications: Notification[]; unread: number }> {
  const db = await getDB()

  const [rows, countRow] = await Promise.all([
    db
      .prepare(
        `SELECT id, user_id, type, title, body, link, is_read, created_at
         FROM notifications
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT ?`
      )
      .bind(userId, limit)
      .all<Notification>(),
    db
      .prepare(
        `SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = ? AND is_read = 0`
      )
      .bind(userId)
      .first<{ cnt: number }>(),
  ])

  return {
    notifications: rows.results || [],
    unread: countRow?.cnt || 0,
  }
}

export async function markNotificationRead(
  notificationId: number,
  userId: string
): Promise<void> {
  const db = await getDB()
  await db
    .prepare(
      `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`
    )
    .bind(notificationId, userId)
    .run()
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const db = await getDB()
  await db
    .prepare(`UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`)
    .bind(userId)
    .run()
}

/**
 * Create in-app notification + send email for a notification event.
 */
export async function notifyWithEmail(
  userId: string,
  userEmail: string,
  userName: string,
  type: NotificationType,
  title: string,
  body: string,
  link: string | undefined,
  emailSubject: string,
  emailHtml: string
): Promise<void> {
  await createNotification(userId, type, title, body, link)
  await sendEmail({ to: userEmail, subject: emailSubject, html: emailHtml }).catch(() => {
    console.warn(`[notify] email failed for ${userEmail}`)
  })
}
