# Claude Settings for GoalChok

Instructions and configurations for Claude Code and related agents.

## Build Commands
- Run linter: `pnpm run lint`
- Build production assets: `pnpm build`
- Run utility tests: `npx vitest run tests/utils`

## Agent skills

### Issue tracker

GitHub issues tracked directly in the repo via `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Standard triage label mapping (`needs-triage`, `needs-info`, `ready-for-agent`, etc.). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repository layout. See `docs/agents/domain.md`.

### Research

Trusted source list configured for React and Frontend development (prioritizing Vercel, React Dev, Vite, Tailwind CSS, etc.). See `docs/agents/research.md`.
