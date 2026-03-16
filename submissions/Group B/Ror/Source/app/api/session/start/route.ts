import { NextResponse } from 'next/server';
import type { SessionStartResponse, AgentResponse } from '@/types/conversation';
import {
  getAgoraConfig,
  getLLMConfig,
  getTTSConfig,
  getModalitiesConfig,
  generateChannelName,
  buildToken,
  agoraAuthHeader,
} from '@/lib/agora-server-config';

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

export async function POST() {
  try {
    const agora = getAgoraConfig();
    const llm = getLLMConfig();
    const tts = getTTSConfig();
    const modalities = getModalitiesConfig();

    const channel = generateChannelName();
    const userUid = 0;
    const userToken = buildToken(agora, channel, userUid);
    const agentToken = buildToken(agora, channel, agora.agentUid);

    const isStringUID = (str: string) => /[a-zA-Z]/.test(str);
    const uniqueName = `drivemate-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const requestBody: Record<string, unknown> = {
      name: uniqueName,
      properties: {
        channel,
        token: agentToken,
        agent_rtc_uid: agora.agentUid,
        remote_rtc_uids: [userUid.toString()],
        enable_string_uid: isStringUID(agora.agentUid),
        idle_timeout: 120,
        asr: { language: 'en-US', task: 'conversation' },
        llm: {
          url: llm.url,
          api_key: llm.apiKey,
          system_messages: [{ role: 'system', content: SYSTEM_PROMPT }],
          greeting_message: "Hi! I'm DriveMate AI. Where would you like to go?",
          failure_message: 'Give me a moment while I process that.',
          max_history: 10,
          params: {
            model: llm.model,
            max_tokens: 1024,
            temperature: 0.7,
            top_p: 0.95,
          },
          input_modalities: modalities.input,
          output_modalities: modalities.output,
        },
        vad: {
          silence_duration_ms: 480,
          speech_duration_ms: 15000,
          threshold: 0.5,
          interrupt_duration_ms: 160,
          prefix_padding_ms: 300,
        },
        ...(tts ? { tts } : {}),
      },
    };

    const agentRes = await fetch(
      `${agora.baseUrl}/${agora.appId}/join`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: agoraAuthHeader(agora),
        },
        body: JSON.stringify(requestBody),
      }
    );

    let agentId: string | undefined;
    if (agentRes.ok) {
      const agentData: AgentResponse = await agentRes.json();
      agentId = agentData.agent_id;
    } else {
      const errText = await agentRes.text();
      console.error('Agent start error:', { status: agentRes.status, body: errText });
    }

    const payload: SessionStartResponse = {
      token: userToken,
      uid: userUid.toString(),
      channel,
      agentId,
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Session start error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start session' },
      { status: 500 }
    );
  }
}
