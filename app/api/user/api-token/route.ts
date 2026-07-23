import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { getDB } from '@/lib/db'
import { generateApiToken, revokeApiToken, getApiTokenInfo } from '@/lib/api-tokens'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const info = await getApiTokenInfo(user.id)
  return NextResponse.json({ token: info })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name } = body

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Token name required' }, { status: 400 })
  }

  const { token, tokenHash } = await generateApiToken(user.id, name)

  return NextResponse.json({
    token, // Only shown once!
    name,
    createdAt: new Date().toISOString(),
  })
}

export async function DELETE() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await revokeApiToken(user.id)
  return NextResponse.json({ success: true })
}