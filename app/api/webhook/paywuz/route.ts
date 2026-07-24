import { NextRequest, NextResponse } from 'next/server'

/**
 * Alias URL — redirect ke canonical webhook handler.
 * Set di Paywuz: prefer https://tepi.my.id/api/payment/webhook
 * Alias: https://tepi.my.id/api/webhook/paywuz
 */
export async function POST(req: NextRequest) {
  const { POST: handle } = await import('@/app/api/payment/webhook/route')
  return handle(req)
}
