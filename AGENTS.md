### Commit message format

```
<type>(<scope>): <short description>

- <detail 1>
- <detail 2>
```

### Rules

- **type** (required): one of `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `style`, `perf`, `ci`, `build`, `revert`
- **scope** (recommended): kebab-case name of the feature/area, e.g. `release`, `transcript-fetcher`, `llm-analyzer`
- **short description** (required): lowercase, imperative mood, max 100 chars, no period at end
- **body** (optional): pointwise with `-`, max 500 chars total
- Semantic-release uses this format to determine version bumps:
  - `feat` -> minor version bump (1.0.0 -> 1.1.0)
  - `fix` -> patch version bump (1.0.0 -> 1.0.1)
  - `BREAKING CHANGE` in body or `!` after type -> major version bump (1.0.0 -> 2.0.0)

### Examples

```
feat(clip-refiner): add overlap detection for adjacent segments

- detect when refined segments overlap by more than 2s
- merge overlapping segments and keep the higher-scored one
```

```
fix(release): add @semantic-release/npm to update package.json version

- add @semantic-release/npm with npmPublish: false
- npm publish remains a separate workflow step
```

```
docs(readme): add advanced examples section
```

### Project Context

- **What:** Multiplayer Tic-Tac-Toe with server-authoritative Nakama backend
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS 4 + Zustand 5
- **Backend:** Nakama 3.x (Docker) + PostgreSQL
- **Docs:** All planning docs in `docs/` — start with `docs/plan.md`
- **Phase order:** Follow the phase table in `docs/plan.md`
- **Nakama modules:** `nakama/modules/` — TypeScript runtime
- **Lint/Typecheck:** `npm run lint` and `npm run typecheck` before committing
- **Docker:** `docker compose up -d` to start Nakama + PostgreSQL locally
