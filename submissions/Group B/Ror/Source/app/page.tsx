'use client';

import { useState, useCallback, Suspense, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Search, X, Navigation } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useNavigationState } from '@/hooks/useNavigationState';
import { parseAction } from '@/lib/actionParser';
import type { LatLng } from '@/types/navigation';
import type { AgoraLocalUserInfo, SessionStartResponse, AvatarState } from '@/types/conversation';
import type { IMessageListItem } from '@/lib/message';
import { EMessageStatus } from '@/lib/message';

import MapWrapper from '@/components/MapWrapper';
import ResponseIsland from '@/components/islands/ResponseIsland';
import NavigationIsland from '@/components/islands/NavigationIsland';
import POISuggestionIsland from '@/components/islands/POISuggestionIsland';
import VoiceControlIsland from '@/components/islands/VoiceControlIsland';
import type { VoiceState } from '@/components/islands/VoiceControlIsland';
import AvatarIsland from '@/components/islands/AvatarIsland';

const AgoraProvider = dynamic(() => import('@/components/AgoraProvider'), {
  ssr: false,
});
const ConversationManager = dynamic(
  () => import('@/components/ConversationManager'),
  { ssr: false }
);

export default function Home() {
  const { location } = useGeolocation();
  const nav = useNavigationState();
  const [agoraInfo, setAgoraInfo] = useState<AgoraLocalUserInfo | null>(null);
  const [showConversation, setShowConversation] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [agentConnected, setAgentConnected] = useState(false);
  const [responseText, setResponseText] = useState<string | null>(null);
  const [responseVisible, setResponseVisible] = useState(false);
  const [showPOIs, setShowPOIs] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [micEnabled, setMicEnabled] = useState(true);
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const lastProcessedRef = useRef<string>('');
  const [demoQuery, setDemoQuery] = useState('');
  const [demoLoading, setDemoLoading] = useState(false);

  const handleDemoSearch = useCallback(async () => {
    if (!demoQuery.trim()) return;
    setDemoLoading(true);
    setResponseText(`Searching for "${demoQuery}"...`);
    setResponseVisible(true);

    const fallback: LatLng = { lat: 14.5995, lng: 120.9842 };
    const origin = location ?? fallback;

    try {
      await nav.handleAction(
        { type: 'navigate', params: { query: demoQuery.trim() } },
        origin
      );
      setResponseText(`Route to ${demoQuery} calculated.`);
      setResponseVisible(true);
    } catch {
      setResponseText('Could not find that location. Try another search.');
      setResponseVisible(true);
    } finally {
      setDemoLoading(false);
      setDemoQuery('');
    }
  }, [demoQuery, location, nav]);

  useEffect(() => {
    if (location) {
      nav.setUserLocation(location);
    }
  }, [location, nav.setUserLocation]);

  const startConversation = useCallback(async () => {
    setIsStarting(true);
    setAvatarState('connecting');
    try {
      const res = await fetch('/api/session/start', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to start session');
      const data: SessionStartResponse = await res.json();

      setAgoraInfo({
        token: data.token,
        uid: data.uid,
        channel: data.channel,
        agentId: data.agentId,
      });
      setShowConversation(true);
      setVoiceState('listening');
      setMicEnabled(true);
    } catch (err) {
      console.error('Failed to start conversation:', err);
      setAvatarState('idle');
    } finally {
      setIsStarting(false);
    }
  }, []);

  const handleTokenWillExpire = useCallback(
    async (uid: string) => {
      const res = await fetch('/api/session/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: agoraInfo?.channel, uid }),
      });
      const data = await res.json();
      return data.token;
    },
    [agoraInfo?.channel]
  );

  const handleEndConversation = useCallback(async () => {
    if (agoraInfo?.agentId) {
      await fetch('/api/session/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agoraInfo.agentId }),
      }).catch(() => {});
    }
    setShowConversation(false);
    setAgoraInfo(null);
    setAgentConnected(false);
    setVoiceState('idle');
    setAvatarState('idle');
    setResponseText(null);
    setResponseVisible(false);
    setShowPOIs(false);
    nav.clearNavigation();
  }, [agoraInfo, nav]);

  const handleMessageUpdate = useCallback(
    (messages: IMessageListItem[]) => {
      if (messages.length === 0) return;

      const latest = messages[messages.length - 1];
      if (!latest.text || latest.text.trim().length === 0) return;

      const msgKey = `${latest.turn_id}-${latest.text.length}`;
      if (msgKey === lastProcessedRef.current) return;
      lastProcessedRef.current = msgKey;

      const { cleanText, action } = parseAction(latest.text);

      if (cleanText) {
        setResponseText(cleanText);
        setResponseVisible(true);
      }

      if (action && latest.status === EMessageStatus.END) {
        nav.handleAction(action, location).then(() => {
          if (action.type === 'search_poi') {
            setShowPOIs(true);
          }
        });
      }
    },
    [location, nav]
  );

  const handleAgentStatusChange = useCallback((connected: boolean) => {
    setAgentConnected(connected);
  }, []);

  const handleAvatarStateChange = useCallback((state: AvatarState) => {
    setAvatarState(state);
  }, []);

  const handleVoiceToggle = useCallback(() => {
    if (!showConversation) {
      startConversation();
      return;
    }
    setMicEnabled((prev) => !prev);
    setVoiceState((prev) =>
      prev === 'listening' ? 'idle' : 'listening'
    );
  }, [showConversation, startConversation]);

  return (
    <main className="relative w-screen h-screen overflow-hidden">
      {/* Full-screen map */}
      <MapWrapper
        userLocation={location}
        route={nav.route}
        pois={nav.pois}
        flyTo={nav.flyTo}
        avatarState={showConversation ? avatarState : 'idle'}
      />

      {/* Agora conversation (invisible -- just audio + message handling) */}
      {showConversation && agoraInfo && (
        <Suspense fallback={null}>
          <AgoraProvider>
            <ConversationManager
              agoraLocalUserInfo={agoraInfo}
              onTokenWillExpire={handleTokenWillExpire}
              onEndConversation={handleEndConversation}
              onMessageUpdate={handleMessageUpdate}
              onAgentStatusChange={handleAgentStatusChange}
              onAvatarStateChange={handleAvatarStateChange}
            />
          </AgoraProvider>
        </Suspense>
      )}

      {/* Navigation island -- top left */}
      <div className="absolute top-6 left-6 z-10 pointer-events-auto">
        <NavigationIsland
          isNavigating={nav.isNavigating}
          eta={nav.eta}
          distance={nav.distance}
          destinationName={nav.destination?.name ?? null}
        />
      </div>

      {/* POI suggestions -- top right */}
      <div className="absolute top-6 right-6 z-10 pointer-events-auto">
        <POISuggestionIsland
          pois={nav.pois}
          visible={showPOIs && !nav.isNavigating}
          onNavigate={(poi) => {
            nav.navigateToPOI(poi, location);
            setShowPOIs(false);
          }}
          onDismiss={() => {
            setShowPOIs(false);
            nav.clearPOIs();
          }}
        />
      </div>

      {/* Floating avatar island -- bottom right */}
      <div className="absolute bottom-28 right-6 z-15 pointer-events-auto">
        <AvatarIsland
          state={showConversation ? avatarState : 'idle'}
          visible={showConversation}
          responseText={responseText}
          onEndConversation={handleEndConversation}
        />
      </div>

      {/* Response island -- center bottom area */}
      <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <ResponseIsland
          text={responseText}
          visible={responseVisible}
          onDismiss={() => setResponseVisible(false)}
        />
      </div>

      {/* Voice control -- fixed bottom center */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
        <VoiceControlIsland
          state={showConversation ? (micEnabled ? 'listening' : 'idle') : 'idle'}
          onToggle={handleVoiceToggle}
          agentConnected={agentConnected}
        />
      </div>

      {/* App title + demo search */}
      {!showConversation && !nav.isNavigating && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3">
          <div className="glass-panel px-5 py-2.5 text-center">
            <h1 className="text-[15px] font-medium tracking-widest text-white/80">
              DRIVEMATE AI
            </h1>
            <p className="text-[11px] text-white/40 mt-0.5 tracking-wide">
              {isStarting ? 'Connecting...' : 'Type a destination or tap the mic'}
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleDemoSearch();
            }}
            className="glass-panel flex items-center gap-2 px-4 py-2 w-[320px]"
          >
            <Search size={16} className="text-white/40 shrink-0" />
            <input
              type="text"
              value={demoQuery}
              onChange={(e) => setDemoQuery(e.target.value)}
              placeholder="Search destination..."
              className="bg-transparent text-[14px] text-white/90 placeholder:text-white/30 outline-none flex-1 tracking-wide"
            />
            {demoQuery && (
              <button
                type="button"
                onClick={() => setDemoQuery('')}
                className="p-0.5 rounded-full hover:bg-white/10 transition-colors"
              >
                <X size={14} className="text-white/40" />
              </button>
            )}
            <button
              type="submit"
              disabled={demoLoading || !demoQuery.trim()}
              className="p-1.5 rounded-full bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-30 transition-colors shrink-0"
            >
              <Navigation size={14} className="text-blue-400" />
            </button>
          </form>
        </div>
      )}

      {/* Clear navigation button -- visible during active navigation */}
      {nav.isNavigating && (
        <div className="absolute top-20 right-6 z-10 pointer-events-auto">
          <button
            onClick={() => {
              nav.clearNavigation();
              setResponseVisible(false);
            }}
            className="glass-panel px-4 py-2 flex items-center gap-2 text-[12px] text-white/60 hover:text-white/90 tracking-wide transition-colors"
          >
            <X size={14} />
            End Route
          </button>
        </div>
      )}
    </main>
  );
}
