import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'

// Resource: https://resend.com/docs/api-reference/domain/create
export async function POST(req: Request) {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  const body = await req.json()
  const domain = body.domain || ''
  if (!domain) return NextResponse.json({ error: 'domain required' }, { status: 400 })
  if (!domain.match(/^([a-z0-9-]+\.)+\w{2,}$/i)) {
    return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 })
  }

  const dns = {
    txt: `v=spf1 include:_spf.google.com include:mail.tepi.my.id ~all`,
    cname: `default._domain._service._something.tepi.my.id`,
  }

  return NextResponse.json({ success: true, dns })
}
