import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { getDB } from '@/lib/db'
import { createVercelVerifyTXT } from '@/lib/cloudflare-dns'

/**
 * POST — user paste Vercel domain-verify TXT (is-a.dev style).
 * Body: { subdomain_id: number, value: "vc-domain-verify=name.tepi.my.id,token" }
 * Creates TXT at _vercel.tepi.my.id (parent zone ownership proof).
 */
export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const subdomainId = Number(body.subdomain_id)
  const raw = String(body.value || '').trim().replace(/^"|"$/g, '')

  if (!subdomainId || !raw) {
    return NextResponse.json({ error: 'subdomain_id dan value wajib' }, { status: 400 })
  }

  // Format: vc-domain-verify=<host>,<token>
  const m = raw.match(/^vc-domain-verify=([a-z0-9-]+(?:\.[a-z0-9-]+)+),([a-zA-Z0-9]+)$/i)
  if (!m) {
    return NextResponse.json({
      error: 'Format salah. Paste value dari Vercel, contoh: vc-domain-verify=nama.tepi.my.id,abc123',
    }, { status: 400 })
  }

  const host = m[1].toLowerCase()
  if (!host.endsWith('.tepi.my.id')) {
    return NextResponse.json({ error: 'Host harus *.tepi.my.id' }, { status: 400 })
  }

  const name = host.replace(/\.tepi\.my\.id$/, '')
  if (name.includes('.')) {
    // multi-level like foo.bar.tepi.my.id — still ok if user owns parent claim; we only support single label
    return NextResponse.json({ error: 'Hanya subdomain level-1 (nama.tepi.my.id)' }, { status: 400 })
  }

  const db = await getDB()
  const sub = await db.prepare(
    `SELECT id, name, status, user_id FROM subdomains WHERE id = ? AND user_id = ?`
  ).bind(subdomainId, user.id).first() as { id: number; name: string; status: string } | null

  if (!sub) return NextResponse.json({ error: 'Subdomain tidak ditemukan' }, { status: 404 })
  if (sub.status !== 'active') {
    return NextResponse.json({ error: 'Subdomain harus status aktif' }, { status: 400 })
  }
  if (sub.name.toLowerCase() !== name) {
    return NextResponse.json({
      error: `Value untuk ${host}, tapi subdomain kamu ${sub.name}.tepi.my.id`,
    }, { status: 400 })
  }

  const content = `vc-domain-verify=${host},${m[2]}`
  const result = await createVercelVerifyTXT(content)

  if (!result.success) {
    return NextResponse.json({ error: result.error || 'Gagal buat TXT di Cloudflare' }, { status: 500 })
  }

  // activity log (best-effort)
  try {
    await db.prepare(
      `INSERT INTO activity_logs (user_id, action, detail, ip_address) VALUES (?, 'vercel_verify', ?, ?)`
    ).bind(
      user.id,
      JSON.stringify({ subdomain: sub.name, content, record_id: result.result?.id }),
      req.headers.get('cf-connecting-ip') || 'unknown'
    ).run()
  } catch { /* ignore */ }

  return NextResponse.json({
    success: true,
    already_exists: !!result.alreadyExists,
    message: result.alreadyExists
      ? 'TXT verify sudah ada. Klik Refresh di Vercel.'
      : 'TXT _vercel.tepi.my.id dibuat. Tunggu 1–5 menit, lalu Refresh di Vercel.',
    dns: {
      type: 'TXT',
      name: '_vercel',
      content,
    },
  })
}
