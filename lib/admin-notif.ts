/**
 * Admin push notifikasi via email — dikirim ke ADMIN_NOTIF_EMAIL.
 * Template profesional mirip email VPS maintenance.
 */

const base = process.env.NEXT_PUBLIC_APP_URL || 'https://tepi.my.id'

const HEAD = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:system-ui,-apple-system,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
`

const FOOT = `
<tr><td style="padding:24px;text-align:center;background:#f8f9fb;color:#6b7280;font-size:12px">
<p style="margin:0 0 4px">tepi.my.id — Free subdomain for developers Indonesia</p>
<p style="margin:0">© ${new Date().getFullYear()} tepi.my.id. All rights reserved.</p>
</td></tr></table></td></tr></table></body></html>
`

function wrap(title: string, body: string, action?: { label: string; url: string }) {
  return `${HEAD}
<tr><td style="padding:32px 32px 0">
<img src="${base}/logo.png" alt="tepi.my.id" width="36" height="36" style="border-radius:8px" />
</td></tr>
<tr><td style="padding:24px 32px">
<h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827">${title}</h1>
${body}
${action ? `<a href="${action.url}" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">${action.label}</a>` : ''}
<p style="margin:20px 0 0;font-size:13px;color:#6b7280">— tepi.my.id Team</p>
</td></tr>${FOOT}`
}

/** Kirim notif ke admin via Resend */
export async function adminNotif(subject: string, html: string) {
  const to = process.env.ADMIN_NOTIF_EMAIL || process.env.NEXT_PUBLIC_EMAIL_ADDR || 'rizalrahmadi13@gmail.com'
  const { sendEmail } = await import('./resend')
  return sendEmail({ to, subject, html }).catch(() => null)
}

// ─── Event Templates ──────────────────────────────────────────────────────────

export function notifNewApplication(userName: string, email: string, subdomain: string, desc: string, appId: number) {
  return adminNotif(
    `📋 Aplikasi Baru: ${subdomain}.tepi.my.id`,
    wrap('Aplikasi Baru Menunggu Review', `
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px 12px;background:#f9fafb;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb">Subdomain</td>
            <td style="padding:8px 12px;font-size:14px;font-weight:600;border-bottom:1px solid #e5e7eb">${subdomain}.tepi.my.id</td></tr>
        <tr><td style="padding:8px 12px;background:#f9fafb;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb">Nama</td>
            <td style="padding:8px 12px;font-size:14px;border-bottom:1px solid #e5e7eb">${userName}</td></tr>
        <tr><td style="padding:8px 12px;background:#f9fafb;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb">Email</td>
            <td style="padding:8px 12px;font-size:14px;border-bottom:1px solid #e5e7eb">${email}</td></tr>
        <tr><td style="padding:8px 12px;background:#f9fafb;font-size:13px;color:#6b7280">Deskripsi</td>
            <td style="padding:8px 12px;font-size:14px;color:#6b7280">${desc.slice(0, 200)}</td></tr>
      </table>
    `, { label: 'Review di Admin →', url: `${base}/admin` })
  )
}

export function notifAbuseReport(subdomain: string, reporter: string, reason: string) {
  return adminNotif(
    `🚨 Abuse Report: ${subdomain}.tepi.my.id`,
    wrap('Laporan Abuse Diterima', `
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px 12px;background:#f9fafb;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb">Subdomain</td>
            <td style="padding:8px 12px;font-size:14px;font-weight:600;border-bottom:1px solid #e5e7eb">${subdomain}.tepi.my.id</td></tr>
        <tr><td style="padding:8px 12px;background:#f9fafb;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb">Pelapor</td>
            <td style="padding:8px 12px;font-size:14px;border-bottom:1px solid #e5e7eb">${reporter}</td></tr>
        <tr><td style="padding:8px 12px;background:#f9fafb;font-size:13px;color:#6b7280">Alasan</td>
            <td style="padding:8px 12px;font-size:14px;color:#6b7280">${reason.slice(0, 300)}</td></tr>
      </table>
      <p style="font-size:13px;color:#dc2626;background:#fef2f2;padding:12px;border-radius:6px">⚠️ Subdomain akan tetap aktif sampai lo review dan ambil tindakan.</p>
    `, { label: 'Review Abuse →', url: `${base}/admin/abuse` })
  )
}

export function notifNewContact(name: string, email: string, subject: string, message: string) {
  return adminNotif(
    `✉️ Pesan Baru dari ${name}`,
    wrap('Pesan Kontak Baru', `
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px 12px;background:#f9fafb;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb">Nama</td>
            <td style="padding:8px 12px;font-size:14px;border-bottom:1px solid #e5e7eb">${name}</td></tr>
        <tr><td style="padding:8px 12px;background:#f9fafb;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb">Email</td>
            <td style="padding:8px 12px;font-size:14px;border-bottom:1px solid #e5e7eb">${email}</td></tr>
        ${subject ? `<tr><td style="padding:8px 12px;background:#f9fafb;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb">Subjek</td>
            <td style="padding:8px 12px;font-size:14px;border-bottom:1px solid #e5e7eb">${subject}</td></tr>` : ''}
        <tr><td style="padding:8px 12px;background:#f9fafb;font-size:13px;color:#6b7280">Pesan</td>
            <td style="padding:8px 12px;font-size:14px;color:#6b7280;line-height:1.5">${message.slice(0, 500)}</td></tr>
      </table>
    `, { label: 'Balas Pesan →', url: `mailto:${email}` })
  )
}

export function notifPaymentSuccess(subdomain: string, userName: string, amount: number, invoice: string, expiresAt: string) {
  return adminNotif(
    `💰 Pembayaran Berhasil: ${subdomain}.tepi.my.id — Rp${amount.toLocaleString()}`,
    wrap('Pembayaran Berhasil Diterima', `
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px 12px;background:#f9fafb;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb">Subdomain</td>
            <td style="padding:8px 12px;font-size:14px;font-weight:600;border-bottom:1px solid #e5e7eb">${subdomain}.tepi.my.id</td></tr>
        <tr><td style="padding:8px 12px;background:#f9fafb;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb">Pelanggan</td>
            <td style="padding:8px 12px;font-size:14px;border-bottom:1px solid #e5e7eb">${userName}</td></tr>
        <tr><td style="padding:8px 12px;background:#f9fafb;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb">Invoice</td>
            <td style="padding:8px 12px;font-size:14px;border-bottom:1px solid #e5e7eb">${invoice}</td></tr>
        <tr><td style="padding:8px 12px;background:#f9fafb;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb">Jumlah</td>
            <td style="padding:8px 12px;font-size:14px;font-weight:700;border-bottom:1px solid #e5e7eb">Rp${amount.toLocaleString()}</td></tr>
        <tr><td style="padding:8px 12px;background:#f9fafb;font-size:13px;color:#6b7280">Aktif Hingga</td>
            <td style="padding:8px 12px;font-size:14px">${expiresAt}</td></tr>
      </table>
    `, { label: 'Lihat Invoice →', url: `${base}/dashboard/invoices/${invoice}` })
  )
}

export function notifSubdomainExpired(subdomain: string, userName: string) {
  return adminNotif(
    `⏰ Subdomain Expired: ${subdomain}.tepi.my.id — ${userName}`,
    wrap('Subdomain Memasuki Grace Period', `
      <p style="font-size:14px;color:#374151;line-height:1.6">Subdomain <strong>${subdomain}.tepi.my.id</strong> milik <strong>${userName}</strong> sudah expired.</p>
      <p style="font-size:14px;color:#374151;line-height:1.6">Grace period 14 hari — akan direlease otomatis jika tidak diperpanjang.</p>
    `)
  )
}
