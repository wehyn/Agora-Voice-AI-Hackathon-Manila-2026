export interface AgoraLocalUserInfo {
  token: string;
  uid: string;
  channel: string;
  agentId?: string;
}

export interface ConversationComponentProps {
  agoraLocalUserInfo: AgoraLocalUserInfo;
  onTokenWillExpire: (uid: string) => Promise<string>;
  onEndConversation: () => void;
}

export interface ClientStartRequest {
  requester_id: string;
  channel_name: string;
  rtc_codec?: number;
  input_modalities?: string[];
  output_modalities?: string[];
}

export interface StopConversationRequest {
  agent_id: string;
}

export interface AgentResponse {
  agent_id: string;
  create_ts: number;
  state: string;
}

export interface SessionStartResponse {
  token: string;
  uid: string;
  channel: string;
  agentId?: string;
}

export interface SessionRefreshRequest {
  channel: string;
  uid: string;
}

export interface SessionRefreshResponse {
  token: string;
}

export interface SessionStopRequest {
  agent_id: string;
}

export type AvatarState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'disconnected';
