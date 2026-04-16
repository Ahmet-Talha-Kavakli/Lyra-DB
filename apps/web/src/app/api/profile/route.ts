import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const API_URL = process.env['API_URL'] ?? 'http://localhost:3001';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const res = await fetch(`${API_URL}/user/profile`, {
    headers: { 'x-clerk-user-id': userId },
    cache: 'no-store',
  });

  if (!res.ok) return NextResponse.json({ error: 'Profile not found' }, { status: res.status });

  const data = await res.json() as unknown;
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json() as unknown;

  const res = await fetch(`${API_URL}/user/profile`, {
    method:  'PATCH',
    headers: {
      'Content-Type':     'application/json',
      'x-clerk-user-id':  userId,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) return NextResponse.json({ error: 'Update failed' }, { status: res.status });

  return NextResponse.json({ success: true });
}
