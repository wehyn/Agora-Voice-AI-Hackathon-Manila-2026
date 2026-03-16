import { NextResponse } from 'next/server';
import { RtcTokenBuilder, RtcRole } from 'agora-token';
import type { ClientStartRequest, AgentResponse } from '@/types/conversation';

const SYSTEM_PROMPT = `You are DriveMate AI, a voice-first navigation assistant. You help users navigate by giving concise directions and finding places.

RULES:
- Keep responses short (1-2 sentences) since they will be displayed as text.
- Always include an ACTION tag when the user requests navigation, POI search, or route changes.
- Format: <<ACTION:{"type":"...","params":{...}}>>
- Action types: "navigate" (destination search), "search_poi" (nearby places), "adjust_route" (avoid highways, fastest route), "trip_status" (ETA/distance)
- Place the ACTION tag at the END of your response, after the conversational text.
- If the user is just chatting or greeting, respond normally without an ACTION tag.

EXAMPLES:
User: "Find a coffee shop nearby"
Response: "I found a great cafe about 4 minutes away. Want me to navigate there? <<ACTION:{"type":"search_poi","params":{"query":"coffee shop","limit":3}}>>"

User: "Yes, take me there"
Response: "Starting navigation now. You should arrive in about 4 minutes. <<ACTION:{"type":"navigate","params":{"query":"coffee shop"}}>>"

User: "Avoid highways"
Response: "Got it, rerouting to avoid highways. Your new ETA is 18 minutes. <<ACTION:{"type":"adjust_route","params":{"avoid":"highways"}}>>"

User: "How long until I arrive?"
Response: "You're about 12 minutes away, with 5.3 km remaining. <<ACTION:{"type":"trip_status","params":{}}>>"}`;

function getValidatedConfig() {
  const agoraConfig = {
    baseUrl: process.env.NEXT_PUBLIC_AGORA_CONVO_AI_BASE_URL || '',
    appId: process.env.NEXT_PUBLIC_AGORA_APP_ID || '',
    appCertificate: process.env.NEXT_PUBLIC_AGORA_APP_CERTIFICATE || '',
    customerId: process.env.NEXT_PUBLIC_AGORA_CUSTOMER_ID || '',
    customerSecret: process.env.NEXT_PUBLIC_AGORA_CUSTOMER_SECRET || '',
    agentUid: process.env.NEXT_PUBLIC_AGENT_UID || '333',
  };

  if (Object.values(agoraConfig).some((v) => v === '')) {
    throw new Error('Missing Agora configuration. Check your .env.local file');
  }

  const llmConfig = {
    url: process.env.NEXT_PUBLIC_LLM_URL,
    api_key: process.env.NEXT_PUBLIC_LLM_API_KEY,
    model: process.env.NEXT_PUBLIC_LLM_MODEL,
  };

  const modalitiesConfig = {
    input: process.env.NEXT_PUBLIC_INPUT_MODALITIES?.split(',') || ['text'],
    output: process.env.NEXT_PUBLIC_OUTPUT_MODALITIES?.split(',') || ['text'],
  };

  return { agora: agoraConfig, llm: llmConfig, modalities: modalitiesConfig };
}

function getTTSConfig() {
  const vendor = process.env.NEXT_PUBLIC_TTS_VENDOR;
  if (!vendor) return undefined;

  if (vendor === 'microsoft') {
    const key = process.env.NEXT_PUBLIC_MICROSOFT_TTS_KEY;
    const region = process.env.NEXT_PUBLIC_MICROSOFT_TTS_REGION;
    if (!key || !region) return undefined;
    return {
      vendor: 'microsoft',
      params: {
        key,
        region,
        voice_name:
          process.env.NEXT_PUBLIC_MICROSOFT_TTS_VOICE_NAME ||
          'en-US-AndrewMultilingualNeural',
        rate: parseFloat(process.env.NEXT_PUBLIC_MICROSOFT_TTS_RATE || '1.0'),
        volume: parseFloat(process.env.NEXT_PUBLIC_MICROSOFT_TTS_VOLUME || '70'),
      },
    };
  }

  return undefined;
}

export async function POST(request: Request) {
  try {
    const config = getValidatedConfig();
    const body: ClientStartRequest = await request.json();
    const { requester_id, channel_name, input_modalities, output_modalities } =
      body;

    const timestamp = Date.now();
    const expirationTime = Math.floor(timestamp / 1000) + 3600;

    const token = RtcTokenBuilder.buildTokenWithUid(
      config.agora.appId,
      config.agora.appCertificate,
      channel_name,
      config.agora.agentUid,
      RtcRole.PUBLISHER,
      expirationTime,
      expirationTime
    );

    const isStringUID = (str: string) => /[a-zA-Z]/.test(str);
    const uniqueName = `drivemate-${timestamp}-${Math.random().toString(36).substring(2, 8)}`;

    const ttsConfig = getTTSConfig();

    const requestBody: Record<string, unknown> = {
      name: uniqueName,
      properties: {
        channel: channel_name,
        token,
        agent_rtc_uid: config.agora.agentUid,
        remote_rtc_uids: [requester_id],
        enable_string_uid: isStringUID(config.agora.agentUid),
        idle_timeout: 120,
        asr: {
          language: 'en-US',
          task: 'conversation',
        },
        llm: {
          url: config.llm.url,
          api_key: config.llm.api_key,
          system_messages: [{ role: 'system', content: SYSTEM_PROMPT }],
          greeting_message:
            "Hi! I'm DriveMate AI. Where would you like to go?",
          failure_message: 'Give me a moment while I process that.',
          max_history: 10,
          params: {
            model: config.llm.model || 'gpt-4o-mini',
            max_tokens: 1024,
            temperature: 0.7,
            top_p: 0.95,
          },
          input_modalities: input_modalities || config.modalities.input,
          output_modalities: output_modalities || config.modalities.output,
        },
        vad: {
          silence_duration_ms: 480,
          speech_duration_ms: 15000,
          threshold: 0.5,
          interrupt_duration_ms: 160,
          prefix_padding_ms: 300,
        },
        ...(ttsConfig ? { tts: ttsConfig } : {}),
      },
    };

    const response = await fetch(
      `${config.agora.baseUrl}/${config.agora.appId}/join`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(
            `${config.agora.customerId}:${config.agora.customerSecret}`
          ).toString('base64')}`,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Agent start error:', { status: response.status, body: errorText });
      throw new Error(`Failed to start agent: ${response.status} ${errorText}`);
    }

    const data: AgentResponse = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error starting conversation:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to start conversation',
      },
      { status: 500 }
    );
  }
}
