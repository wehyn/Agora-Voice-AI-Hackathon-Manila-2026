import { NextResponse } from 'next/server';
import type { StopConversationRequest } from '@/types/conversation';

function getValidatedConfig() {
  const config = {
    baseUrl: process.env.NEXT_PUBLIC_AGORA_CONVO_AI_BASE_URL || '',
    appId: process.env.NEXT_PUBLIC_AGORA_APP_ID || '',
    customerId: process.env.NEXT_PUBLIC_AGORA_CUSTOMER_ID || '',
    customerSecret: process.env.NEXT_PUBLIC_AGORA_CUSTOMER_SECRET || '',
  };

  if (Object.values(config).some((v) => !v || v.trim() === '')) {
    throw new Error('Missing Agora configuration. Check your .env.local file');
  }

  return config;
}

export async function POST(request: Request) {
  try {
    const config = getValidatedConfig();
    const body: StopConversationRequest = await request.json();
    const { agent_id } = body;

    if (!agent_id) {
      throw new Error('agent_id is required');
    }

    const authHeader = `Basic ${Buffer.from(
      `${config.customerId}:${config.customerSecret}`
    ).toString('base64')}`;

    const response = await fetch(
      `${config.baseUrl}/${config.appId}/agents/${agent_id}/leave`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Agent stop error:', { status: response.status, body: errorText });
      throw new Error(`Failed to stop agent: ${response.status} ${errorText}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error stopping conversation:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to stop conversation',
      },
      { status: 500 }
    );
  }
}
