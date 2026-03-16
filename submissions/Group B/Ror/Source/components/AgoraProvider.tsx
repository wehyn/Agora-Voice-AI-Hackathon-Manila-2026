'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';

const AgoraProviderInner = dynamic(
  async () => {
    const { AgoraRTCProvider, default: AgoraRTC } = await import(
      'agora-rtc-react'
    );

    return {
      default: ({ children }: { children: React.ReactNode }) => {
        const client = useMemo(
          () => AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' }),
          []
        );
        return <AgoraRTCProvider client={client}>{children}</AgoraRTCProvider>;
      },
    };
  },
  { ssr: false }
);

export default function AgoraProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AgoraProviderInner>{children}</AgoraProviderInner>;
}
