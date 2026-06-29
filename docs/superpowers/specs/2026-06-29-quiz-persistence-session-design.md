# ISO 9001 Quiz — Persistence, Session Control & Timer Animation

**Date:** 2026-06-29  
**Status:** Approved (pending implementation)  
**Scope:** Single-file app (`index.html`) + Firebase Realtime Database

---

## Goals

1. Player data survives refresh and browser close (reconnect & resume).
2. Mid-quiz refresh restores the same 20 questions at the same progress point; player must finish.
3. Admin retains partial and complete results even if players leave early.
4. New players cannot start until admin explicitly starts the current session.
5. Reset session archives data and opens a clean room (Option C).
6. Remove visible password hint; PIN `9001` remains functional (hidden).
7. No limit on number of players.
8. Super Mario–style urgency animation when timer is almost out.

---

## Root Causes (Current Bugs)

| Bug | Cause |
|-----|-------|
| Data lost on refresh | `pRef.onDisconnect().remove()` deletes Firebase player record |
| Cannot resume quiz | Progress (`cur`, questions, scores) stored only in memory |
| Play without admin start | `quiz/game.started` stays `true` after previous session |
| Early leavers vanish | Disconnect handler + minimal `push()` payload |

---

## Architecture: Session System

### Firebase structure

```
quiz/
  game/
    sessionId: string      // e.g. timestamp-base36
    started: boolean
    startedAt: number | null
  players/
    {uid}/
      name, avatar, level, sessionId
      status: "waiting" | "playing" | "done" | "left"
      cur, score, correct, wrong, timeouts, streak, maxStreak
      sesC, sesT
      questions: array     // full 20-question set for resume
      joined, lastSeen
  history/
    {sessionId}/
      archivedAt, playerCount
      players: { ...same shape as live players... }
```

### Session rules

- On first load (no game node): create `sessionId`, `started: false`.
- `joinGame()`: assign player to current `sessionId`; status `waiting`.
- `adminStart()`: set `started: true`, `startedAt: now` for **current** `sessionId` only.
- Waiting room listener: start quiz only if `started && game.sessionId === player.sessionId`.
- `resetGame()`:
  1. Copy `quiz/players` → `quiz/history/{sessionId}/players`
  2. Write metadata (`archivedAt`, `playerCount`)
  3. Remove `quiz/players`
  4. New `sessionId`, `started: false`, `startedAt: null`
- Player with stale `sessionId` after reset: show “Session ended — contact trainer” (not auto-start).

### localStorage

```json
{ "uid": "...", "sessionId": "..." }
```

Key: `yhy_quiz_player`

On `load`: if entry exists, fetch Firebase player; restore screen by `status` and `sessionId` match.

---

## Player Persistence & Resume

### Remove

- `pRef.onDisconnect().remove()`

### Replace with

- `onDisconnect().update({ status: "left", lastSeen: now })` — keeps record, marks departure
- Expanded `push()` after every answer: all progress fields + `questions` + `cur` + `status: "playing"`
- Final `push(true)` on result: `status: "done"`

### Resume flow

| Firebase state | Action on reload |
|----------------|------------------|
| `waiting`, game not started | Waiting room |
| `waiting`, game started (same session) | Start quiz at `cur` |
| `playing` | Restore `G` from Firebase → `renderQ()` at `cur` |
| `done` | Results screen |
| `left` + same session + game started | Resume as `playing` (same questions) |
| Wrong / old `sessionId` | Session ended message |

### Must-finish rule

- Same `questions` array stored in Firebase at join/start — never regenerate on reconnect.
- `playAgain()` clears localStorage and returns to splash; does not auto-enter live session.

---

## Admin Dashboard

### Live view

- Player rows show status: **Done**, **Playing (Q n/20)**, **Left early (Q n/20)**.
- Stats include in-progress partial scores in averages (configurable: count partial as in-progress only in export).

### History

- After reset, previous session appears in collapsible “Past sessions” list.
- Export CSV/HTML from current **or** selected history session.

### UI

- Remove login hint: `PIN: 9001 or add ?trainer=9001 to URL`
- Keep PIN validation and `?trainer=9001` URL access (not displayed).
- Admin copy link unchanged; no password on screen.

---

## Super Mario Timer Animation (≤8 seconds)

Triggered when `timeLeft <= 8` (extends existing `urgent` ring state).

### Visual

- Timer container: subtle horizontal bounce (`@keyframes mario-bounce`).
- Timer number: scale pulse 1.0 → 1.15, red `#E52521` (Mario red).
- Progress ring: faster stroke animation; color shifts blue → red.
- Optional: small 🍄 or ⭐ sprite slides left–right above timer (CSS only, no copyrighted assets).
- App background: very subtle red vignette pulse (low opacity).

### Audio

- Replace simple tick with chiptune “hurry” pattern via Web Audio (original 4-note ascending motif, not Nintendo IP).
- Play once when entering ≤8s; repeat every 2s until answer or timeout.
- Respect future mute toggle (see suggestions).

### Performance

- CSS transforms only; no layout thrash.
- Clear animation classes when question ends or timer reset.

---

## Out of Scope (This Phase)

- Separate backend server
- User authentication beyond trainer PIN
- Player limit caps
- Full Malay UI translation (suggested for later)

---

## Future Suggestions (Not in This Build)

See product backlog in brainstorming response; prioritize after core persistence ships.

---

## Testing Checklist

- [ ] Join → refresh in waiting room → still listed, same name
- [ ] Quiz Q7 → refresh → resume Q7, same options
- [ ] Close tab mid-quiz → admin sees partial progress
- [ ] Complete quiz → refresh → results screen
- [ ] Admin reset → new join waits; old player sees session ended
- [ ] Without reset, `started` true → new sessionId blocks auto-start for old players
- [ ] Export includes partial players
- [ ] History export after reset
- [ ] Timer ≤8s: animation + sound; stops on next question
- [ ] Admin login shows no password hint; PIN 9001 still works
- [ ] 50+ players join (no artificial cap)

---

## Implementation Notes

- All changes in `index.html` (HTML/CSS/JS).
- Firebase rules should allow read/write on `quiz/**` for anonymous clients (document separately).
- Question payload size ~10–15 KB per player acceptable for RTDB.
