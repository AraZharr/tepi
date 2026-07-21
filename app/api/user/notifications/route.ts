import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { getUserNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/notifications'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const data = await getUserNotifications(user.id, 20)
  return NextResponse.json(data)
}

export async function PUT(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (id) {
    await markNotificationRead(id, user.id)
  } else {
    await markAllNotificationsRead(user.id)
  }
  return NextResponse.json({ success: true })
}
