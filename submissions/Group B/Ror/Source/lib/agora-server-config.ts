import { RtcTokenBuilder, RtcRole } from 'agora-token';

export interface AgoraServerConfig {
  appId: string;
  appCertificate: string;
  customerId: string;
  customerSecret: string;
  baseUrl: string;
  agentUid: string;
}

export interface LLMConfig {
  url: string;
  apiKey: string;
  model: string;
}

export interface TTSConfig {
  vendor: string;
  params: Record<string, unknown>;
}

export function getAgoraConfig(): AgoraServerConfig {
  const config: AgoraServerConfig = {
    appId: process.env.AGORA_APP_ID || process.env.NEXT_PUBLIC_AGORA_APP_ID || '',
    appCertificate: process.env.AGORA_APP_CERTIFICATE || process.env.NEXT_PUBLIC_AGORA_APP_CERTIFICATE || '',
    customerId: process.env.AGORA_CUSTOMER_ID || process.env.NEXT_PUBLIC_AGORA_CUSTOMER_ID || '',
    customerSecret: process.env.AGORA_CUSTOMER_SECRET || process.env.NEXT_PUBLIC_AGORA_CUSTOMER_SECRET || '',
    baseUrl: process.env.AGORA_CONVO_AI_BASE_URL || process.env.NEXT_PUBLIC_AGORA_CONVO_AI_BASE_URL || '',
    agentUid: process.env.AGORA_AGENT_UID || process.env.NEXT_PUBLIC_AGENT_UID || '333',
  };

  const missing = Object.entries(config)
    .filter(([k, v]) => k !== 'agentUid' && (!v || v.trim() === ''))
    .map(([k]) => k);

  if (missing.length > 0) {
    throw new Error(`Missing Agora server config: ${missing.join(', ')}. Check .env.local`);
  }

  return config;
}

export function getLLMConfig(): LLMConfig {
  return {
    url: process.env.LLM_URL || process.env.NEXT_PUBLIC_LLM_URL || '',
    apiKey: process.env.LLM_API_KEY || process.env.NEXT_PUBLIC_LLM_API_KEY || '',
    model: process.env.LLM_MODEL || process.env.NEXT_PUBLIC_LLM_MODEL || 'gpt-4o-mini',
  };
}

export function getTTSConfig(): TTSConfig | undefined {
  const vendor = process.env.TTS_VENDOR || process.env.NEXT_PUBLIC_TTS_VENDOR;
  if (!vendor) return undefined;

  if (vendor === 'microsoft') {
    const key = process.env.MICROSOFT_TTS_KEY || process.env.NEXT_PUBLIC_MICROSOFT_TTS_KEY;
    const region = process.env.MICROSOFT_TTS_REGION || process.env.NEXT_PUBLIC_MICROSOFT_TTS_REGION;
    if (!key || !region) return undefined;
    return {
      vendor: 'microsoft',
      params: {
        key,
        region,
        voice_name: process.env.MICROSOFT_TTS_VOICE_NAME || process.env.NEXT_PUBLIC_MICROSOFT_TTS_VOICE_NAME || 'en-US-AndrewMultilingualNeural',
        rate: parseFloat(process.env.MICROSOFT_TTS_RATE || process.env.NEXT_PUBLIC_MICROSOFT_TTS_RATE || '1.0'),
        volume: parseFloat(process.env.MICROSOFT_TTS_VOLUME || process.env.NEXT_PUBLIC_MICROSOFT_TTS_VOLUME || '70'),
      },
    };
  }

  return undefined;
}

export function getModalitiesConfig() {
  const raw = process.env.INPUT_MODALITIES || process.env.NEXT_PUBLIC_INPUT_MODALITIES;
  const rawOut = process.env.OUTPUT_MODALITIES || process.env.NEXT_PUBLIC_OUTPUT_MODALITIES;
  return {
    input: raw?.split(',') || ['text'],
    output: rawOut?.split(',') || ['text'],
  };
}

export function generateChannelName(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `drivemate-${timestamp}-${random}`;
}

export function buildToken(
  config: AgoraServerConfig,
  channel: string,
  uid: number | string,
  ttlSeconds = 3600
): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return RtcTokenBuilder.buildTokenWithUid(
    config.appId,
    config.appCertificate,
    channel,
    typeof uid === 'string' ? parseInt(uid, 10) : uid,
    RtcRole.PUBLISHER,
    exp,
    exp
  );
}

export function agoraAuthHeader(config: AgoraServerConfig): string {
  return `Basic ${Buffer.from(`${config.customerId}:${config.customerSecret}`).toString('base64')}`;
}
