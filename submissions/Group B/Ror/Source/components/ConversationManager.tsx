'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  useRTCClient,
  useLocalMicrophoneTrack,
  useRemoteUsers,
  useClientEvent,
  useIsConnected,
  useJoin,
  usePublish,
  RemoteUser,
} from 'agora-rtc-react';
import type { UID } from 'agora-rtc-react';
import type { AgoraLocalUserInfo } from '@/types/conversation';
import type { AvatarState } from '@/types/conversation';
import { MessageEngine, EMessageEngineMode, EMessageStatus } from '@/lib/message';
import type { IMessageListItem } from '@/lib/message';

interface ConversationManagerProps {
  agoraLocalUserInfo: AgoraLocalUserInfo;
  onTokenWillExpire: (uid: string) => Promise<string>;
  onEndConversation: () => void;
  onMessageUpdate: (messages: IMessageListItem[]) => void;
  onAgentStatusChange: (connected: boolean) => void;
  onAvatarStateChange?: (state: AvatarState) => void;
}

export default function ConversationManager({
  agoraLocalUserInfo,
  onTokenWillExpire,
  onEndConversation,
  onMessageUpdate,
  onAgentStatusChange,
  onAvatarStateChange,
}: ConversationManagerProps) {
  const client = useRTCClient();
  const isConnected = useIsConnected();
  const remoteUsers = useRemoteUsers();
  const [isEnabled, setIsEnabled] = useState(true);
  const { localMicrophoneTrack } = useLocalMicrophoneTrack(isEnabled);
  const [isAgentConnected, setIsAgentConnected] = useState(false);
  const [joinedUID, setJoinedUID] = useState<UID>(0);
  const messageEngineRef = useRef<MessageEngine | null>(null);
  const lastAvatarStateRef = useRef<AvatarState>('connecting');
  const speakingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const agentUID = process.env.NEXT_PUBLIC_AGENT_UID;

  const emitAvatarState = useCallback(
    (state: AvatarState) => {
      if (state !== lastAvatarStateRef.current) {
        lastAvatarStateRef.current = state;
        onAvatarStateChange?.(state);
      }
    },
    [onAvatarStateChange]
  );

  const { isConnected: joinSuccess } = useJoin(
    {
      appid: process.env.NEXT_PUBLIC_AGORA_APP_ID!,
      channel: agoraLocalUserInfo.channel,
      token: agoraLocalUserInfo.token,
      uid: parseInt(agoraLocalUserInfo.uid),
    },
    true
  );

  usePublish([localMicrophoneTrack]);

  useEffect(() => {
    if (joinSuccess && client) {
      setJoinedUID(client.uid as UID);
    }
  }, [joinSuccess, client]);

  useEffect(() => {
    if (!client || !isConnected) return;

    if (messageEngineRef.current) {
      messageEngineRef.current.teardownInterval();
      messageEngineRef.current.cleanup();
      messageEngineRef.current = null;
    }

    const engine = new MessageEngine(
      client,
      EMessageEngineMode.TEXT,
      (messages: IMessageListItem[]) => {
        const sorted = [...messages].sort((a, b) => a.turn_id - b.turn_id);
        onMessageUpdate(sorted);

        if (sorted.length > 0) {
          const latest = sorted[sorted.length - 1];
          if (latest.status === EMessageStatus.END) {
            emitAvatarState('speaking');
            if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
            speakingTimeoutRef.current = setTimeout(() => {
              emitAvatarState('listening');
            }, 2000);
          } else if (latest.status === EMessageStatus.IN_PROGRESS) {
            emitAvatarState('thinking');
          }
        }
      }
    );
    messageEngineRef.current = engine;

    return () => {
      if (messageEngineRef.current) {
        messageEngineRef.current.teardownInterval();
        messageEngineRef.current.cleanup();
        messageEngineRef.current = null;
      }
    };
  }, [client, isConnected, onMessageUpdate, emitAvatarState]);

  useClientEvent(client, 'user-joined', (user) => {
    if (user.uid.toString() === agentUID) {
      setIsAgentConnected(true);
      onAgentStatusChange(true);
      emitAvatarState('listening');
    }
  });

  useClientEvent(client, 'user-left', (user) => {
    if (user.uid.toString() === agentUID) {
      setIsAgentConnected(false);
      onAgentStatusChange(false);
      emitAvatarState('disconnected');
    }
  });

  useEffect(() => {
    const agentPresent = remoteUsers.some(
      (user) => user.uid.toString() === agentUID
    );
    setIsAgentConnected(agentPresent);
    onAgentStatusChange(agentPresent);
    if (agentPresent) {
      emitAvatarState('listening');
    }
  }, [remoteUsers, agentUID, onAgentStatusChange, emitAvatarState]);

  const handleTokenWillExpire = useCallback(async () => {
    if (!onTokenWillExpire || !joinedUID) return;
    try {
      const newToken = await onTokenWillExpire(joinedUID.toString());
      await client?.renewToken(newToken);
    } catch (error) {
      console.error('Failed to renew token:', error);
    }
  }, [client, onTokenWillExpire, joinedUID]);

  useClientEvent(client, 'token-privilege-will-expire', handleTokenWillExpire);

  useEffect(() => {
    return () => {
      if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
      client?.leave();
    };
  }, [client]);

  return (
    <>
      {remoteUsers.map((user) => (
        <RemoteUser key={user.uid} user={user} />
      ))}
    </>
  );
}

export { EMessageStatus };
export type { IMessageListItem };
