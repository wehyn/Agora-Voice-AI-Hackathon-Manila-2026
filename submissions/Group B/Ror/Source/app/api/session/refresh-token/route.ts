import { NextRequest, NextResponse } from 'next/server';
import type { SessionRefreshResponse } from '@/types/conversation';
import { getAgoraConfig, buildToken } from '@/lib/agora-server-config';

export async function POST(request: NextRequest) {
  try {
    const agora = getAgoraConfig();
    const { channel, uid } = await request.json();

    if (!channel || uid === undefined) {
      return NextResponse.json(
        { error: 'channel and uid are required' },
        { status: 400 }
      );
    }

    const token = buildToken(agora, channel, parseInt(uid, 10));
    const payload: SessionRefreshResponse = { token };
    return NextResponse.json(payload);
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to refresh token' },
      { status: 500 }
    );
  }
}
