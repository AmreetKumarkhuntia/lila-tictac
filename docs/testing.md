# Testing

## Prerequisites

- Nakama server running (`docker compose up -d`)
- Frontend dev server running (`npm run dev`)
- Two browser contexts (incognito window or separate browsers)

## Manual Test Scenarios

### Phase 1: Authentication

| #   | Scenario              | Steps                                        | Expected Result                                      |
| --- | --------------------- | -------------------------------------------- | ---------------------------------------------------- |
| 1.1 | New user registration | Enter email, username, password → Register   | Account created, redirected to Home                  |
| 1.2 | Existing user login   | Enter email, password → Login                | Authenticated, redirected to Home                    |
| 1.3 | Session persistence   | Login → close tab → reopen                   | Still logged in (session restored from localStorage) |
| 1.4 | Session expiry        | Wait for token expiry (2h)                   | Auto-refreshed via refresh token                     |
| 1.5 | Duplicate email       | Register with existing email                 | Error message shown                                  |
| 1.6 | Validation errors     | Empty fields, short password, short username | Inline validation errors shown                       |
| 1.7 | Re-login after logout | Logout → login again                         | Previous stats preserved                             |

### Phase 2: Matchmaking

| #   | Scenario            | Steps                                          | Expected Result                                        |
| --- | ------------------- | ---------------------------------------------- | ------------------------------------------------------ |
| 2.1 | Quick Play match    | Both click "Quick Play" (Classic)              | Both see matchmaking animation → matched → game starts |
| 2.2 | Mode separation     | Player A: Classic, Player B: Timed             | Not matched together (different mode)                  |
| 2.3 | Cancel matchmaking  | Click "Quick Play" → click "Cancel"            | Search stops, no match created                         |
| 2.4 | Create private game | Click "Private Match" → Create → copy match ID | Match ID displayed with copy button                    |
| 2.5 | Join private game   | Paste match ID → click "Join"                  | Connected to match, game starts                        |
| 2.6 | Invalid match ID    | Enter random string → "Join"                   | Error toast shown                                      |
| 2.7 | Full private game   | Third player tries to join active match        | Rejected: "Match is full"                              |

### Phase 3: Core Gameplay

| #    | Scenario            | Steps                                 | Expected Result                              |
| ---- | ------------------- | ------------------------------------- | -------------------------------------------- |
| 3.1  | Valid move          | Player X clicks empty cell            | X appears, turn switches to O                |
| 3.2  | Move sync           | Player X makes move                   | Player O sees the move in real-time          |
| 3.3  | Wrong turn          | Player O clicks during X's turn       | Error: "Not your turn"                       |
| 3.4  | Occupied cell       | Player clicks cell with X/O           | Error: "Cell already occupied"               |
| 3.5  | Board disabled      | During opponent's turn                | All cells non-interactive                    |
| 3.6  | Win - row           | X fills top row [0,0][0,1][0,2]       | X wins, win line highlighted, result overlay |
| 3.7  | Win - column        | O fills middle column [0,1][1,1][2,1] | O wins, win line highlighted                 |
| 3.8  | Win - diagonal      | X fills [0,0][1,1][2,2]               | X wins, diagonal line highlighted            |
| 3.9  | Win - anti-diagonal | O fills [0,2][1,1][2,0]               | O wins, anti-diagonal highlighted            |
| 3.10 | Draw                | All cells filled, no winner           | Draw declared, result overlay shows "Draw!"  |
| 3.11 | Full game           | Play a complete game → "Play Again"   | Both return to Home, stats updated           |

### Phase 4: Disconnect & Reconnect

| #   | Scenario                    | Steps                                  | Expected Result                                             |
| --- | --------------------------- | -------------------------------------- | ----------------------------------------------------------- |
| 4.1 | Player disconnects mid-game | Player X closes browser tab            | Player O sees "Opponent disconnected" indicator             |
| 4.2 | Grace period expiry         | Player X disconnects > 15s             | Player O wins by forfeit, GAME_OVER broadcast               |
| 4.3 | Reconnection within grace   | Player X refreshes page within 15s     | Reconnects to match, game state restored, opponent notified |
| 4.4 | Both players disconnect     | Both close tabs                        | Match cleaned up on server, no winner                       |
| 4.5 | Network recovery            | Briefly disconnect network → reconnect | Game continues, WebSocket re-established                    |
| 4.6 | Page refresh mid-game       | Player X refreshes page                | Match ID from URL + session restore → reconnects to game    |

### Phase 5: Timer Mode

| #   | Scenario              | Steps                       | Expected Result                                   |
| --- | --------------------- | --------------------------- | ------------------------------------------------- |
| 5.1 | Timer countdown       | Start timed game → wait     | Timer ticks down smoothly (client interpolation)  |
| 5.2 | Timer reset on move   | Player makes move           | Turn switches, new player's timer starts counting |
| 5.3 | Timer expires         | Let 30s elapse without move | Auto-forfeit, opponent wins by timeout            |
| 5.4 | Timer visual urgency  | Wait until < 5s             | Timer turns red with pulse animation              |
| 5.5 | Both timers tracked   | Play several moves          | Each player's time decrements independently       |
| 5.6 | Classic mode no timer | Start classic game          | No timers displayed                               |

### Phase 6: Leaderboard

| #   | Scenario              | Steps                            | Expected Result                             |
| --- | --------------------- | -------------------------------- | ------------------------------------------- |
| 6.1 | Score after win       | Win a game                       | Score incremented (+3), leaderboard updated |
| 6.2 | Score after draw      | Draw a game                      | Both players get +1                         |
| 6.3 | Score after loss      | Lose a game                      | No score change (+0)                        |
| 6.4 | Leaderboard display   | View leaderboard page            | All players ranked by score descending      |
| 6.5 | Player stats          | View "My Stats" tab              | Shows correct W/L/D, streak, win rate       |
| 6.6 | Win streak            | Win 3 games in a row             | currentStreak = 3, bestStreak updated       |
| 6.7 | Streak reset          | Win 2 → lose 1 → win 1           | currentStreak = 1, bestStreak = 2           |
| 6.8 | Auto-submitted scores | Win a game, check Nakama console | Score written server-side, not by client    |

### Phase 7: UI & Responsiveness

| #   | Scenario              | Steps                               | Expected Result                              |
| --- | --------------------- | ----------------------------------- | -------------------------------------------- |
| 7.1 | Mobile layout         | Open in Chrome DevTools → iPhone 14 | All elements visible, board fits screen      |
| 7.2 | Touch interaction     | Tap cells on mobile                 | Moves register correctly                     |
| 7.3 | Landscape orientation | Rotate phone to landscape           | Layout adjusts, board still visible          |
| 7.4 | Small screen (320px)  | Resize to 320px width               | No horizontal scroll, all content accessible |
| 7.5 | Desktop layout        | Open on 1440px screen               | Centered layout, max-width container         |
| 7.6 | Dark/light theme      | Toggle theme button                 | Theme switches, persisted across reloads     |
| 7.7 | Move animation        | Place X and O alternately           | Smooth scale-in animation                    |
| 7.8 | Error toast display   | Make invalid move                   | Toast appears, auto-dismisses after 4s       |

### Phase 8: Edge Cases

| #   | Scenario           | Steps                                     | Expected Result                              |
| --- | ------------------ | ----------------------------------------- | -------------------------------------------- |
| 8.1 | Rapid moves        | Click multiple cells very fast            | Only one move registered per turn            |
| 8.2 | Stale match ID     | Join with expired match ID                | Graceful error, redirect to Home             |
| 8.3 | Multiple tabs      | Open game in 2 tabs simultaneously        | Only one active connection per session       |
| 8.4 | Server restart     | Playing game → restart Nakama             | Match terminated message, redirect to Home   |
| 8.5 | No internet        | Disconnect network during game            | Toast: connection lost, reconnect on restore |
| 8.6 | Invalid move data  | Manually send malformed message           | Server ignores, no crash                     |
| 8.7 | Concurrent matches | Player A in game 1, tries to start game 2 | Either blocked or handled gracefully         |

---

## Manual Multiplayer Test Procedure

### Quick Play Test

```
1. Browser 1: Open http://localhost:5173
2. Browser 1: Register account "PlayerA" with email
3. Browser 1: Select mode → Click "Quick Play"
4. Browser 1: See "Searching for opponent..."

5. Browser 2: Open http://localhost:5173 (incognito)
6. Browser 2: Register account "PlayerB" with email
7. Browser 2: Select same mode → Click "Quick Play"

8. Both: See game board appear
9. Verify PlayerA is X (first to join), PlayerB is O
10. Play a full game alternating moves
11. Verify winner/loser overlay appears on both
12. Verify post-game stats (points, rank, streaks)
13. Both click "Play Again" → return to Home
14. Check leaderboard updated
```

### Private Game Test

```
1. Browser 1: Click "Private Match"
2. Browser 1: Select mode → Click "Create"
3. Browser 1: See match ID displayed
4. Browser 1: Copy match ID

5. Browser 2: Click "Private Match"
6. Browser 2: Switch to "Join" tab
7. Browser 2: Paste match ID → click "Join"
8. Both: Game starts
9. Play and verify all moves sync
10. Verify result overlay and stats
```

---

## Automated Tests (Future)

### Unit Tests

Run with: `npm run test`

- Game logic (win detection, draw detection, move validation)
- State reducers (Zustand store actions)
- Utility functions (board helpers, stats calculations)

### Integration Tests

- Nakama match handler (using Nakama test framework)
- RPC function responses
- Leaderboard score calculation
- Reconnection flow (grace period, forfeit)

### E2E Tests

- Playwright or Cypress
- Multi-browser testing
- Full game flow automation
- Multiplayer simulation (two browser contexts)
