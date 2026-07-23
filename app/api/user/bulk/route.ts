import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { getDB } from '@/lib/db'
import { createSubdomainRenewalOrder } from '@/lib/paywuz'

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action, subdomainIds } = body

  if (!action || !Array.isArray(subdomainIds) || subdomainIds.length === 0) {
    return NextResponse.json({ error: 'Action dan subdomainIds wajib diisi' }, { status: 400 })
  }

  const validActions = ['renew']
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: 'Action tidak valid' }, { status: 400 })
  }

  const db = await getDB()

  // Fetch subdomains and verify ownership
  const placeholders = subdomainIds.map(() => '?').join(',')
  const subs = await db.prepare(
    `SELECT * FROM subdomains WHERE id IN (${placeholders}) AND user_id = ?`
  ).bind(...subdomainIds, user.id).all()

  if (!subs.results || subs.results.length === 0) {
    return NextResponse.json({ error: 'Subdomain tidak ditemukan' }, { status: 404 })
  }

  const results: Array<{ id: number; success: boolean; error?: string; orderId?: string }> = []

  for (const sub of subs.results as any[]) {
    try {
      if (action === 'renew') {
        if (sub.plan !== 'paid') {
          results.push({ id: sub.id, success: false, error: 'Hanya subdomain paid yang bisa diperpanjang' })
          continue
        }

        // Create renewal payment order
        const { orderId, paymentUrl } = await createSubdomainRenewalOrder(sub.id, sub.ns_addon === 1)
        results.push({ id: sub.id, success: true, orderId, paymentUrl })
      }
    } catch (err: any) {
      results.push({ id: sub.id, success: false, error: err.message })
    }
  }

  const successCount = results.filter(r => r.success).length
  return NextResponse.json({ results, successCount })
}