# OpenChat AI — Project Rules

## Permanent Language Rule (CRITICAL)
**NEVER use Bangla letters (Bengali script).** Always write Bangla using only English characters (Banglish). Example: "ami bangla bolchi" not "আমি বাংলা বলছি". This applies to ALL communication, all files, all comments, and all code. English words stay in English. This is a permanent core rule.

## Critical: Build Before Push
**ALWAYS run `npm run build` and verify zero errors before any `git push`.** Never push without building first.

## Versioning
- Bug fixes / small tweaks -> patch bump (1.x.x -> 1.x.x+1)
- New features -> minor bump (1.x.x -> 1.x+1.0)
- Update version in `package.json` before release commits

## Skills & Agents (Installed)

### Auto-Use Protocol (CRITICAL)
Ami automatically detect kore relevant skill load korbo based on task context. Tomake "use the X skill" bole bolte hobe na. Jokhon kono task match kore, ami nijei skill tool call kore instruction load kore niye kaj korbo.

### Skills (145 total in `skills/`)
Use any skill by name. Examples:
- `typescript`, `react`, `javascript` — language/framework skills
- `architect`, `developer`, `reviewer`, `infosec` — process skills
- `astro`, `vite`, `tailwindcss`, `next`, `nest`, `express`, `hono`, `bun` — framework skills
- `form-validation`, `ag-grid`, `mui`, `redux-toolkit` — library skills
- `a11y`, `html`, `css`, `code-conventions`, `code-quality` — quality skills
- `docker`, `cloud`, `infosec` — infra/security skills
- `firecrawl-*`, `mcp-setup` — tool integration skills
- `e2e-testing`, `unit-testing`, `playwright`, `jest`, `vitest` — testing skills
- `nodejs`, `nodejs-best-practices`, `backend-dev`, `frontend-dev` — dev practice skills
- `self-learning`, `self-reflection`, `brainstorming`, `writing-plans` — meta skills

### Agents (in `.opencode/agents/`)
- `architect` — system design & technical decisions
- `code-reviewer` — code review
- `debug` — systematic debugging
- `frontend-ui` — frontend UI development
- `security-auditor` — security audits
- `tdd-dev` — TDD-based development

### Prompts (in `.opencode/prompts/`)
Templates for: architect, backend-dev, build, code-reviewer, database-optimizer, debug, devops-engineer, explore, frontend-ui, general, performance-optimizer, plan, security-auditor, tdd-dev

### Knowledge (in `.opencode/knowledge/`)
- `cli-ecosystem-knowledge.md` — comprehensive CLI, Ink, TUI framework reference

### Project Templates (in `.opencode/`)
- `AGENTS.project-alpha.md` — React/MUI/Redux Toolkit stack template
- `AGENTS.project-beta.md` — Astro/Tailwind/SSG stack template
