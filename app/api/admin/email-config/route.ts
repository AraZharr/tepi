import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'

// Resource: https://resend.com/docs/api-reference/domain/create
export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const domain = body.domain || ''
  if (!domain) return NextResponse.json({ error: 'domain required' }, { status: 400 })
  if (!domain.match(/^([a-z0-9-]+\.)+\w{2,}$/i)) { // simple domain check
    return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 })
  }

  // Pastikan ADMIN_NOTIF_EMAIL ada agar tidak gagal di later saat email terkirim
  if (!process.env.ADMIN_NOTIF_EMAIL) {
    process.env.ADMIN_NOTIF_EMAIL = 'rizalrahmadi13@gmail.com'
  }

  // Simulate DNS records (Resend generates TXT, CNAME, MX, SPF)
  const dns = {
    txt: `v=spf1 include:_spf.google.com include:mail.tepi.my.id ~all`, // will be overwritten by Resend
    cname: `default._domain._service._something.tepi.my.id`, // not actually match Resend, placeholder for admin
  }

  return NextResponse.json({ success: true, dns })
}
