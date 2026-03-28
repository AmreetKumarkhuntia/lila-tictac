## Implementation Plan

| Phase | Description | Doc |
|-------|-------------|-----|
| 1 | Project Scaffolding | [setup.md](./setup.md) |
| 2 | Authentication & Player Identity | [api.md](./api.md) |
| 3 | Server-Authoritative Game Logic | [game-logic.md](./game-logic.md) |
| 4 | Matchmaking System | [matchmaking.md](./matchmaking.md) |
| 5 | Frontend Game UI | [frontend.md](./frontend.md) |
| 6 | Leaderboard System (Bonus) | [api.md](./api.md) |
| 7 | Timer-Based Mode (Bonus) | [game-logic.md](./game-logic.md) |
| 8 | Polish & Edge Cases | [testing.md](./testing.md) |
| 9 | Deployment & Documentation | [deployment.md](./deployment.md) |

### Cross-cutting Docs

- [architecture.md](./architecture.md) — System overview, tech stack, data flow, design decisions

### Dependency Flow

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 8 → Phase 9
                                        ↘ Phase 6 (Leaderboard)
                                        ↘ Phase 7 (Timer Mode)
```

Phases 6 and 7 are independent and can be done in parallel after Phase 5.

---

## Problem Statement

LILA Engineering culture is driven by ownership and problem solving. We
are a small team where every engineer contributes significantly. We are
working on a technically complex game (multiplayer shooters are one of
the most complex games to build). We focus on strong fundamentals and
ability to build solutions end to end.

We are looking for developers who are driven, ambitious and want to
build great products.

If you want to join our team, we have a small test for you below.

Good luck!

Multiplayer Tic-Tac-Toe Game with Nakama
Backend
Problem Statement
Build a production-ready, multiplayer Tic-Tac-Toe game with
server-authoritative architecture using Nakama as the backend
infrastructure.
Technical Requirements
Frontend
● Choose your preferred tech stack (React, React Native, Flutter, Unity, etc.)
● Implement responsive UI optimized for mobile devices
● Display real-time game state updates
● Show player information and match status
Backend (Nakama)
Core Requirements
❖ Server-Authoritative Game Logic
➢ Implement all game state management on the server side
➢ Validate all player moves server-side before applying them
➢ Prevent client-side manipulation or cheating
➢ Broadcast validated game state updates to connected clients
❖ Matchmaking System
➢ Enable players to create new game rooms
➢ Implement automatic matchmaking to pair players
➢ Support game room discovery and joining
➢ Handle player connections and disconnections gracefully
❖ Deployment
➢ Deploy Nakama server to a cloud provider (AWS, GCP, Azure, DigitalOcean,
etc.)
➢ Deploy the frontend application with public accessibility or share mobile
application with us
➢ Provide deployment documentation

Optional Features (Bonus Points)
❖ Concurrent Game Support
➢ Handle multiple simultaneous game sessions
➢ Implement proper game room isolation
➢ Ensure scalable architecture for multiple concurrent players
❖ Leaderboard System
➢ Track player wins, losses, and win streaks
➢ Implement global ranking system
➢ Display top players with statistics
➢ Persist player performance data
❖ Timer-Based Game Mode
➢ Add time limits for each player's turn (e.g., 30 seconds per move)
➢ Implement automatic forfeit on timeout
➢ Extend matchmaking to support mode selection (classic vs. timed)
➢ Display countdown timers in the UI

Sample Implementation

Deliverables
● Source code repository (GitHub/GitLab)
● Deployed and accessible game URL/ mobile application
● Deployed Nakama server endpoint
● README with:
    ○ Setup and installation instructions
    ○ Architecture and design decisions
    ○ Deployment process documentation
    ○ API/server configuration details
    ○ How to test the multiplayer functionality