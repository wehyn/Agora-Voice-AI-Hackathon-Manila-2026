# DriveMate AI -- Project TODO

> Roadmap and progress tracker based on the [PRD](docs/PRD.md).

---

## Completed

- [x] Next.js 16 app with App Router, Tailwind CSS v4, TypeScript
- [x] Full-screen Leaflet map with user geolocation tracking
- [x] Route polyline rendering and POI markers on map
- [x] Agora RTC voice channel (STT -> LLM -> TTS pipeline)
- [x] API routes: token generation, agent invite, agent stop
- [x] Action parser for `<<ACTION:...>>` format from LLM
- [x] Navigation state management hook
- [x] Conversational navigation (PRD 5.1) -- voice command to route
- [x] POI discovery (PRD 5.3) -- "Find coffee nearby" -> suggestions
- [x] Dynamic UI islands (PRD 5.6) -- Response, Navigation, POI, Voice
- [x] Voice interaction (PRD 5.5) -- Agora-based full pipeline
- [x] Text search fallback for typed destinations
- [x] Framer Motion animations on all islands

---

## In Progress

- [ ] **Glassmorphism update** (PRD 7)
  - Update `glass-panel` CSS vars to frosted white glass
  - Switch text colors from white to dark slate across all islands
  - Files: `app/globals.css`, `app/page.tsx`, all `components/islands/*.tsx`

---

## MVP -- Must Do

### Features

- [ ] **Route adjustments** (PRD 5.2)
  - Wire OSRM `exclude` param so "avoid highways" / "avoid tolls" works
  - Files: `lib/mapCommands.ts`, `hooks/useNavigationState.ts`

- [ ] **Trip status** (PRD 5.4)
  - Make `trip_status` action return current ETA/distance to the AI
  - AI should answer "How long until I arrive?" with real data
  - Files: `hooks/useNavigationState.ts`, `app/api/invite-agent/route.ts`

- [ ] **AI context awareness**
  - Pass current nav state (destination, ETA, distance, active POIs) into the LLM system prompt
  - Files: `app/api/invite-agent/route.ts`, `components/ConversationManager.tsx`

- [ ] **Multi-stop routing**
  - Support waypoints ("add a gas station stop") via OSRM waypoint routing
  - Files: `lib/mapCommands.ts`, `hooks/useNavigationState.ts`, `components/Map.tsx`

### UI / UX

- [ ] **End conversation button**
  - Add explicit UI to end the Agora voice session (currently requires refresh)
  - Files: `app/page.tsx`, wire to `/api/stop-conversation`

- [ ] **Voice UX polish** (PRD 11)
  - Integrate AudioVisualizer / pulse animation into VoiceControlIsland
  - Listening state: pulsing ring + waveform
  - Files: `components/islands/VoiceControlIsland.tsx`, `components/AudioVisualizer.tsx`

- [ ] **Map tile style**
  - Evaluate switching from CARTO dark tiles to a light/minimal style matching the PRD aesthetic
  - Files: `components/Map.tsx`

### Quality

- [ ] **Performance audit**
  - End-to-end voice-to-response latency must be under 2 seconds (PRD 16)
  - Voice recognition accuracy above 90%

---

## Post-MVP -- Future

- [ ] Supabase integration (session logs, saved destinations, navigation history)
- [ ] User accounts and authentication
- [ ] Multi-language support
- [ ] Driver fatigue detection
- [ ] Location-aware storytelling
- [ ] Group trip coordination
- [ ] Advanced trip planning

---

## Architecture

```
User Voice
    |
    v
Agora Voice SDK (STT)
    |
    v
LLM (Intent Parsing + Response)
    |
    v
Map APIs (OSRM routing, Nominatim geocoding)
    |
    v
Dynamic UI Islands + TTS Playback
```

## Key Files

| Area | Files |
|------|-------|
| Main page | `app/page.tsx` |
| Map | `components/Map.tsx`, `components/MapWrapper.tsx` |
| Islands | `components/islands/NavigationIsland.tsx`, `ResponseIsland.tsx`, `POISuggestionIsland.tsx`, `VoiceControlIsland.tsx` |
| Voice | `components/AgoraProvider.tsx`, `components/ConversationManager.tsx` |
| API routes | `app/api/generate-agora-token/`, `invite-agent/`, `stop-conversation/` |
| Logic | `lib/actionParser.ts`, `lib/mapCommands.ts`, `lib/message.ts` |
| Hooks | `hooks/useGeolocation.ts`, `hooks/useNavigationState.ts` |
| Types | `types/conversation.ts`, `types/navigation.ts` |
| Styles | `app/globals.css` |
