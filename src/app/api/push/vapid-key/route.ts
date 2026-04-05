import { NextResponse } from 'next/server';
import { getVapidPublicKey, isPushAvailable } from '@/lib/push';

export async function GET() {
  if (!isPushAvailable()) {
    return NextResponse.json(
      { error: 'Push notifications are not configured' },
      { status: 503 }
    );
  }

  return NextResponse.json({
    publicKey: getVapidPublicKey(),
  });
}
