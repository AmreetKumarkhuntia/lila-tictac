# Testing

## Local Development Testing

### Prerequisites for Testing

1. Nakama server running: `docker compose up -d`
2. Frontend dev server running: `npm run dev`
3. Two separate browser contexts

### Test Setup

Open these in parallel:

- **Browser 1:** `http://localhost:5173` (regular Chrome)
- **Browser 2:** `http://localhost:5173` (Incognito window or different browser)

---

## Test Scenarios

### Phase 1: Authentication

| #   | Scenario              | Steps                            | Expected Result                              |
| --- | --------------------- | -------------------------------- | -------------------------------------------- |
| 1.1 | New user login        | Enter username → click Enter     | Authenticated, redirected to Home page       |
| 1.2 | Session persistence   | Login → refresh page             | Still logged in, no re-auth required         |
| 1.3 | Session expiry        | Clear localStorage → refresh     | Redirected to Auth page                      |
| 1.4 | Duplicate username    | Two browsers enter same username | Both get unique sessions (device ID differs) |
| 1.5 | Empty username        | Click Enter without typing       | Validation error shown                       |
| 1.6 | Re-login after logout | Logout → login again             | Previous stats preserved                     |

### Phase 2: Matchmaking

| #   | Scenario            | Steps                                   | Expected Result                                        |
| --- | ------------------- | --------------------------------------- | ------------------------------------------------------ |
| 2.1 | Quick Play match    | Both click "Classic Play"               | Both see matchmaking animation → matched → game starts |
| 2.2 | Mode separation     | Player A: Classic, Player B: Timed      | Not matched together (different mode)                  |
| 2.3 | Cancel matchmaking  | Click "Find Game" → click "Cancel"      | Search stops, no match created                         |
| 2.4 | Create private game | Click "Create Room" → copy match ID     | Match ID displayed, copy to clipboard works            |
| 2.5 | Join private game   | Enter match ID → click "Join"           | Connected to match, game starts                        |
| 2.6 | Invalid match ID    | Enter random string → "Join"            | Error toast: "Match not found"                         |
| 2.7 | Full private game   | Third player tries to join active match | Rejected: "Match is full"                              |

### Phase 3: Core Gameplay

| #    | Scenario            | Steps                                 | Expected Result                              |
| ---- | ------------------- | ------------------------------------- | -------------------------------------------- |
| 3.1  | Valid move          | Player X clicks empty cell            | X appears, turn switches to O                |
| 3.2  | Move sync           | Player X makes move                   | Player O sees the move in real-time          |
| 3.3  | Wrong turn          | Player O clicks during X's turn       | Error: "It is not your turn"                 |
| 3.4  | Occupied cell       | Player clicks cell with X/O           | Error: "Cell is already taken"               |
| 3.5  | Board disabled      | During opponent's turn                | All cells non-interactive                    |
| 3.6  | Win - row           | X fills top row [0,0][0,1][0,2]       | X wins, win line highlighted, result overlay |
| 3.7  | Win - column        | O fills middle column [0,1][1,1][2,1] | O wins, win line highlighted                 |
| 3.8  | Win - diagonal      | X fills [0,0][1,1][2,2]               | X wins, diagonal line highlighted            |
| 3.9  | Win - anti-diagonal | O fills [0,2][1,1][2,0]               | O wins, anti-diagonal highlighted            |
| 3.10 | Draw                | All cells filled, no winner           | Draw declared, result overlay shows "Draw!"  |
| 3.11 | Full game           | Play a complete game → "Play Again"   | Both return to Home, stats updated           |

### Phase 4: Disconnect & Reconnect

| #   | Scenario                  | Steps                                  | Expected Result                                  |
| --- | ------------------------- | -------------------------------------- | ------------------------------------------------ |
| 4.1 | Player leaves mid-game    | Player X closes browser tab            | Player O sees "Opponent disconnected — You win!" |
| 4.2 | Network recovery          | Briefly disconnect network → reconnect | Game continues, no state loss                    |
| 4.3 | Page refresh mid-game     | Player X refreshes page                | Reconnects to match, game state restored         |
| 4.4 | Both players leave        | Both close tabs                        | Match cleaned up on server                       |
| 4.5 | Reconnect timeout (timed) | Player X disconnects > 10s             | Auto-forfeit, Player O wins by timeout           |

### Phase 5: Timer Mode

| #   | Scenario              | Steps                       | Expected Result                             |
| --- | --------------------- | --------------------------- | ------------------------------------------- |
| 5.1 | Timer countdown       | Start timed game → wait     | Timer ticks down each second                |
| 5.2 | Timer reset on move   | Player makes move           | Their timer resets, opponent's starts       |
| 5.3 | Timer expires         | Let 30s elapse without move | Auto-forfeit, opponent wins                 |
| 5.4 | Timer visual urgency  | Wait until < 5s             | Timer turns red, pulses                     |
| 5.5 | Both timers tracked   | Play several moves          | Each player's time decrements independently |
| 5.6 | Classic mode no timer | Start classic game          | No timers displayed                         |

### Phase 6: Leaderboard

| #   | Scenario            | Steps                  | Expected Result                             |
| --- | ------------------- | ---------------------- | ------------------------------------------- |
| 6.1 | Score after win     | Win a game             | Score incremented (+3), leaderboard updated |
| 6.2 | Score after draw    | Draw a game            | Both players get +1                         |
| 6.3 | Score after loss    | Lose a game            | No score change                             |
| 6.4 | Leaderboard display | View leaderboard page  | All players ranked by score descending      |
| 6.5 | Player stats        | View home page         | Shows correct W/L/D, streak, win rate       |
| 6.6 | Win streak          | Win 3 games in a row   | currentStreak = 3, bestStreak updated       |
| 6.7 | Streak reset        | Win 2 → lose 1 → win 1 | currentStreak = 1, bestStreak = 2           |
| 6.8 | Pagination          | 50+ games played       | Leaderboard paginates correctly             |

### Phase 7: UI & Responsiveness

| #   | Scenario              | Steps                               | Expected Result                              |
| --- | --------------------- | ----------------------------------- | -------------------------------------------- |
| 7.1 | Mobile layout         | Open in Chrome DevTools → iPhone 14 | All elements visible, board fits screen      |
| 7.2 | Touch interaction     | Tap cells on mobile                 | Moves register correctly                     |
| 7.3 | Landscape orientation | Rotate phone to landscape           | Layout adjusts, board still visible          |
| 7.4 | Small screen (320px)  | Resize to 320px width               | No horizontal scroll, all content accessible |
| 7.5 | Desktop layout        | Open on 1440px screen               | Centered layout, max-width container         |
| 7.6 | Move animation        | Place X and O alternately           | Smooth scale-in animation                    |
| 7.7 | Win line animation    | Complete a winning line             | Line draws across winning cells              |
| 7.8 | Error toast display   | Make invalid move                   | Toast appears, auto-dismisses after 3s       |

### Phase 8: Edge Cases

| #   | Scenario           | Steps                                     | Expected Result                                |
| --- | ------------------ | ----------------------------------------- | ---------------------------------------------- |
| 8.1 | Rapid moves        | Click multiple cells very fast            | Only one move registered per turn              |
| 8.2 | Stale match ID     | Join with expired match ID                | Graceful error, redirect to Home               |
| 8.3 | Multiple tabs      | Open game in 2 tabs simultaneously        | Only one active connection per session         |
| 8.4 | Server restart     | Playing game → restart Nakama             | Match terminated message, redirect to Home     |
| 8.5 | No internet        | Disconnect network during game            | Toast: "Connection lost", reconnect on restore |
| 8.6 | Invalid move data  | Manually send malformed message           | Server ignores, no crash                       |
| 8.7 | Concurrent matches | Player A in game 1, tries to start game 2 | Either blocked or handled gracefully           |

---

## Manual Multiplayer Test Procedure

### Quick Play Test

```
1. Browser 1: Open http://localhost:5173
2. Browser 1: Enter username "PlayerA" → Enter
3. Browser 1: Click "Classic Play"
4. Browser 1: See "Searching for opponent..."

5. Browser 2: Open http://localhost:5173 (incognito)
6. Browser 2: Enter username "PlayerB" → Enter
7. Browser 2: Click "Classic Play"

8. Both: See game board appear
9. Verify PlayerA is X (first to search), PlayerB is O
10. Play a full game alternating moves
11. Verify winner/loser overlay appears on both
12. Both click "Play Again" → return to Home
13. Check leaderboard updated
```

### Private Game Test

```
1. Browser 1: Click "Create Room"
2. Browser 1: See match ID displayed
3. Browser 1: Copy match ID

4. Browser 2: Paste match ID → click "Join"
5. Both: Game starts
6. Play and verify all moves sync
```

---

## Automated Tests (Future)

### Unit Tests

Run with: `npm run test`

- Game logic (win detection, draw detection, move validation)
- State reducers (Zustand store actions)
- Utility functions

### Integration Tests

- Nakama match handler (using Nakama test framework)
- RPC function responses
- Leaderboard score calculation

### E2E Tests

- Playwright or Cypress
- Multi-browser testing
- Full game flow automation
