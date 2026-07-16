/**
 * Email transaksional via Resend.
 * Free tier: 3.000 email/bulan.
 * Domain tepi.my.id dikonfigurasi belakangan setelah live.
 */

const RESEND_API = 'https://api.resend.com/emails'
const FROM = 'tepi.my.id <onboarding@resend.dev>'

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn('[resend] RESEND_API_KEY missing — OTP logged for dev')
    console.warn(`[resend] to=${to} subject=${subject}`)
    return { id: 'dev-skip' }
  }

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Resend error: ${JSON.stringify(err)}`)
  }

  return res.json()
}

export function emailApplicationReceived(name: string, subdomain: string) {
  return {
    subject: `Permohonan ${subdomain}.tepi.my.id sedang direview`,
    html: `
      <p>Halo <strong>${name}</strong>,</p>
      <p>Kami telah menerima permohonan subdomain <strong>${subdomain}.tepi.my.id</strong> kamu.</p>
      <p>Tim kami akan mereview dalam 1×24 jam. Kamu akan mendapat email konfirmasi setelah selesai.</p>
      <p>Terima kasih sudah menggunakan tepi.my.id!</p>
    `,
  }
}

export function emailApplicationApproved(name: string, subdomain: string) {
  return {
    subject: `✅ Subdomain ${subdomain}.tepi.my.id kamu telah aktif!`,
    html: `
      <p>Halo <strong>${name}</strong>,</p>
      <p>Selamat! Subdomain <strong>${subdomain}.tepi.my.id</strong> kamu telah disetujui dan aktif.</p>
      <p>Login ke dashboard untuk mengatur DNS target kamu.</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">Buka Dashboard →</a></p>
    `,
  }
}

export function emailApplicationRejected(name: string, subdomain: string, reason: string) {
  return {
    subject: `Permohonan ${subdomain}.tepi.my.id tidak dapat disetujui`,
    html: `
      <p>Halo <strong>${name}</strong>,</p>
      <p>Maaf, permohonan subdomain <strong>${subdomain}.tepi.my.id</strong> tidak dapat kami setujui.</p>
      <p><strong>Alasan:</strong> ${reason}</p>
      <p>Kamu dapat mengajukan permohonan baru dengan subdomain yang berbeda.</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/apply">Ajukan Permohonan Baru →</a></p>
    `,
  }
}

export function emailExpiryWarning(name: string, subdomain: string, expiresAt: string) {
  return {
    subject: `⚠️ Subdomain ${subdomain}.tepi.my.id berakhir dalam 7 hari`,
    html: `
      <p>Halo <strong>${name}</strong>,</p>
      <p>Subdomain <strong>${subdomain}.tepi.my.id</strong> kamu akan berakhir pada <strong>${expiresAt}</strong>.</p>
      <p>Perpanjang sekarang agar subdomain tetap aktif.</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/${subdomain}/renew">Perpanjang Sekarang →</a></p>
    `,
  }
}

export function emailPaymentSuccess(name: string, subdomain: string, expiresAt: string) {
  return {
    subject: `✅ Pembayaran berhasil — ${subdomain}.tepi.my.id aktif 1 tahun`,
    html: `
      <p>Halo <strong>${name}</strong>,</p>
      <p>Pembayaran Rp5.000 untuk subdomain <strong>${subdomain}.tepi.my.id</strong> berhasil diterima.</p>
      <p>Subdomain kamu aktif hingga <strong>${expiresAt}</strong>.</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">Lihat Dashboard →</a></p>
    `,
  }
}
