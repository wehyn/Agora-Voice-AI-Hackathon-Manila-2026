import { NextResponse } from 'next/server';
import type { SessionStopRequest } from '@/types/conversation';
import { getAgoraConfig, agoraAuthHeader } from '@/lib/agora-server-config';

export async function POST(request: Request) {
  try {
    const agora = getAgoraConfig();
    const body: SessionStopRequest = await request.json();

    if (!body.agent_id) {
      return NextResponse.json(
        { error: 'agent_id is required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${agora.baseUrl}/${agora.appId}/agents/${body.agent_id}/leave`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: agoraAuthHeader(agora),
        },
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Agent stop error:', { status: response.status, body: errText });
      throw new Error(`Failed to stop agent: ${response.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Session stop error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to stop session' },
      { status: 500 }
    );
  }
}
