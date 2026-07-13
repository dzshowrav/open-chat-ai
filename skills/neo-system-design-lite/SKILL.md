---
name: neo-system-design-lite
description: "Opinionated system design for small-scale projects (1-10 engineers, <100K users, pre-Series A). Concrete defaults, not 'it depends'. Use when building MVPs, indie SaaS, small team projects, or any time you need to ship fast without over-engineering. Covers database, auth, deployment, caching, security, monitoring, and architecture — all tailored for simplicity and cost-efficiency."
allowed-tools:
  - Read
  - Grep
  - Glob
  - AskUserQuestion
---

# Neo System Design Lite

Opinionated system design for small teams that ship. No "it depends" — concrete defaults backed by production evidence.

**Audience**: 1-10 engineers, <100K users, pre-Series A startups, indie SaaS, side projects scaling up.

**Philosophy**: Complexity is a tax on velocity. Pay it only when data proves you must.

## When to Use

- Building an MVP or early-stage product
- Making tech stack decisions for a small team
- Wondering "do I need X?" (the answer is usually no)
- Reviewing architecture for over-engineering
- Cost-optimizing infrastructure

## When to Use `neo-system-design` (Full Version) Instead

- >10 engineers needing independent deployment
- >100K DAU with measured bottlenecks
- System design interview preparation
- Enterprise-scale architecture decisions
- Multi-region, compliance-driven requirements

---

# The Golden Rules

## Rule 1: Innovation Token Budget

> Every team gets about 3 innovation tokens. Spend them on what makes your product unique, not infrastructure. — Dan McKinley, "Choose Boring Technology"

- Your core product differentiator — **worth a token**
- Your database — **not worth a token** (use PostgreSQL)
- Your deployment pipeline — **not worth a token** (use a PaaS)
- Your message queue — **not worth a token** (use a database-backed queue or cron)
- Your frontend framework — **not worth a token** (use what your team knows)

## Rule 2: The Anti-Complexity Checklist

Before adding ANY infrastructure component, answer:

1. Do I have a performance problem **right now**? (measured, not imagined)
2. Have I confirmed the **actual bottleneck**?
3. Can I solve this with a **bigger instance** instead?
4. Is this the **simplest solution** that works?
5. Will I regret this complexity in **6 months** when priorities change?

If you can't answer YES to #1 and #2, stop. You're over-engineering.

## Rule 3: The Stack Doesn't Matter

Pieter Levels runs multiple $2-3M/year businesses on PHP + jQuery + SQLite on a single $40/mo VPS. Photo AI makes $132K/month on 14,000 lines of PHP. Stack Overflow serves ALL traffic on 9 on-premise servers running a monolith.

**Your customers don't care about your architecture.** Ship fast with what you know.

---

# The Default Stack

## For Solo / 1-3 Engineers

| Layer | Default | Cost | Alternative |
|---|---|---|---|
| **Frontend** | Next.js + Tailwind | $0 (Vercel free) | Whatever you know (Nuxt, SvelteKit, Rails+Hotwire) |
| **Backend** | API routes / same framework | $0-5 | Express, FastAPI, Laravel, Rails |
| **Database** | PostgreSQL (Supabase or Neon) | $0 | SQLite (if single-server) |
| **Auth** | Clerk or Supabase Auth | $0 | Better Auth (self-hosted, free forever) |
| **Payments** | Stripe | Pay-as-you-go | Lemon Squeezy (if MoR needed) |
| **Email** | Resend | $0 (3K/mo free) | Postmark |
| **Errors** | Sentry | $0 (5K events/mo) | |
| **Uptime** | BetterStack or UptimeRobot | $0 | |
| **Analytics** | PostHog | $0 (1M events/mo) | Plausible ($9/mo) |
| **CDN** | Cloudflare | $0 | Included in Vercel |
| **Total** | | **$0-5/month** | |

## For 4-10 Engineers

Same stack, just upgrade to paid tiers as usage grows:

| Stage | Monthly Infra Cost | What Changes |
|---|---|---|
| MVP (0 users) | $0 | All free tiers |
| PMF (<1K users) | $0-25 | Maybe upgrade Supabase |
| Early traction (1-10K) | $25-75 | Supabase Pro + Vercel Pro |
| Growth (10-100K users) | $75-200 | Same stack, paid tiers |
| Scale ($100K+ ARR) | $150-300 | Same stack. <1% of revenue |

**Real example**: An API monitoring SaaS making $120K ARR with 180 customers runs on $45/month infrastructure (Vercel Pro $20 + Supabase Pro $25 + BetterStack free tier).

---

# The Decisions (Opinionated)

## Decision 1: Database

### The Answer: PostgreSQL. Done.

Don't think about it. Don't evaluate alternatives. PostgreSQL handles your use case.

**Evidence:**
- OpenAI serves 800 million users on an unsharded PostgreSQL (1 primary + ~50 read replicas)
- A single 4-vCPU Postgres handles 1,000-10,000 QPS with proper indexing
- 100 million rows per table before partitioning becomes necessary
- Photo AI ($132K/mo) runs on SQLite — Postgres is more than enough for you

**Where to host it:**

| Stage | Host | Cost |
|---|---|---|
| MVP | Supabase free (500MB) or Neon free (0.5GB) | $0 |
| Growth | Supabase Pro or Railway Postgres | $25/mo |
| Scale | Same instance + indexes. Still fine. | $25-50/mo |

### PostgreSQL Scaling Ladder (exhaust each step before moving to the next)

| Step | QPS Range | What to Do | Cost |
|---|---|---|---|
| 1 | 0-1,000 | Tune config (`shared_buffers`, `work_mem`). 5-10x throughput gain. | $0 |
| 2 | 1,000-10,000 | Add indexes. Run `EXPLAIN ANALYZE`. Fix N+1 queries. | $0 |
| 3 | 10,000-100,000 | Connection pooling (PgBouncer) + read replica | $50/mo |
| 4 | 100,000+ | **Graduate to `neo-system-design` full version** | |

**Most apps never leave Step 2.**

### What You Don't Need

- **MongoDB**: Your data has consistent structure. Postgres handles it better.
- **Redis**: Optimize queries first. Postgres with indexes gives <10ms reads.
- **DynamoDB**: You don't have unpredictable traffic at 100K+ QPS.
- **Cassandra**: You don't have >100K writes/sec of time-series data.
- **Sharding**: OpenAI serves 800M users without it. You don't need it.
- **Read replicas**: Not until your optimized workload saturates the CPU (>60% sustained at peak).

### PostgreSQL Can Replace (so you don't add infra)

| Instead of... | Use PostgreSQL... |
|---|---|
| Redis (caching) | Materialized views, UNLOGGED tables |
| Redis (pub/sub) | LISTEN/NOTIFY |
| Redis (job queue) | SKIP LOCKED, or pg_boss / graphile-worker |
| Elasticsearch (basic search) | Full-text search with `tsvector` + GIN index |
| MongoDB (documents) | JSONB columns |
| Time-series DB (basic) | Partitioned tables by time range |

---

## Decision 2: Auth

### The Answer: Use a Managed Service. Never Roll Your Own.

> Authentication is the wrong place to demonstrate engineering creativity. A mistake in your auth implementation is a security incident.

| Your Stack | Use This | Cost |
|---|---|---|
| Next.js / React | **Clerk** | $0 (up to 50K MRU) |
| Already on Supabase | **Supabase Auth** | $0 (up to 50K MAU) |
| Self-host / cost-sensitive | **Better Auth** | $0 forever (MIT, self-hosted) |
| Enterprise SSO needed NOW | **Auth0** | $0 (up to 25K MAU) |

**Note**: Auth.js (NextAuth) is in maintenance mode — the core team joined Better Auth in Sep 2025. Auth.js v5 never left beta. For new projects, use Better Auth or Clerk.

### What You Don't Need

- **Rolling your own auth**: Never. Ever.
- **OAuth complexity**: Your managed service handles it transparently.
- **SAML/SSO**: Skip until an enterprise customer demands it.
- **Multi-factor auth**: Clerk/Better Auth include it. Don't build it.

### Auth Decision by Scenario

| Scenario | Choose |
|---|---|
| B2C SaaS, email + password + social login | **Clerk** or **Better Auth** |
| B2B SaaS, will need team/org features | **Clerk** (organizations built-in) |
| API-only, machine-to-machine | **API keys** (simple, rotatable) |
| Internal tool, small team | **Better Auth** with email/password |
| Enterprise customer demands SSO | Add **WorkOS** or **Auth0** when the deal requires it |

### Revisit Threshold
- **50K MAU**: Evaluate cost. Clerk ~$0.02/MRU after free tier. Supabase ~$0.00325/MAU.
- **First enterprise SSO demand**: Add WorkOS (1M free MAU for basic, SSO is paid add-on).

---

## Decision 3: Deployment

### The Answer: PaaS First. VPS When Cost Matters. Never Kubernetes.

| Your Needs | Use This | Cost |
|---|---|---|
| Next.js frontend | **Vercel** | $0-20/mo |
| Full-stack (web + workers + DB) | **Railway** | $5-50/mo |
| Maximum cost control | **Hetzner VPS + Coolify** | $7-20/mo |
| Docker-native, no PaaS | **Fly.io** | $5-30/mo |

### Cost Reality at Small Scale

| Platform | At 1K users | At 10K users | At 100K users |
|---|---|---|---|
| Vercel | $0 | $20 | $150-400 |
| Railway | $5 | $20-50 | $100-400 |
| Hetzner + Coolify | $7 | $11 | $20 |
| AWS (with K8s) | $3,432 (incl. DevOps time) | $3,432+ | $5,000+ |

### What You Don't Need

- **Kubernetes**: A team of 3 spent $14,850/mo on K8s. Moved to Fly.io for $680/mo. "We were cosplaying as Google." K8s requires 3+ dedicated platform engineers to be manageable. You don't have that.
- **AWS directly**: $0 bill becomes $80 overnight. Use a PaaS until you outgrow it.
- **Microservices deployment**: You have one service. Deploy it.
- **Blue-green / canary deployments**: Nice in theory. At your scale, "deploy and watch Sentry" is your canary.

### Revisit Threshold
- **PaaS bill > $200/mo**: Consider Hetzner VPS + Coolify ($7-20/mo equivalent).
- **Need persistent processes** (WebSockets, workers, cron): Railway or Fly.io (not Vercel).
- **PaaS bill > $500/mo AND you have ops knowledge**: Self-host (37signals saved $7M over 5 years leaving AWS, but they had dedicated ops staff).

---

## Decision 4: Architecture

### The Answer: Monolith. Extract Services Only With Proof.

| Team Size | Architecture |
|---|---|
| 1-5 engineers | **Monolith** — everyone works on everything |
| 5-15 engineers | **Modular monolith** — clear module boundaries, same deployment |
| 15+ engineers with deploy conflicts | **Selective extraction** — split only what has proven scaling need |

### The Over-Engineering Traps (Don't Fall In)

**Trap 1: Premature Microservices**
> I watched a startup burn $500K building: 12 microservices (for a todo app), a 5-node K8s cluster (handling 50 requests/day), event sourcing with Kafka (for a CRUD app), a dedicated DevOps team (for 3 developers).

**Trap 2: Kafka for CRUD**
- If you have < 1,000 events/day → database-backed queue (pg_boss, BullMQ, Solid Queue)
- If you have < 100,000 events/day → still probably a database-backed queue
- Kafka is for millions of events/day with multiple independent consumers

**Trap 3: Event Sourcing / CQRS**
- 90%+ of applications need traditional CRUD
- Event sourcing is for financial/audit-critical workflows with regulatory requirements
- "Just use a database" is the right answer almost always

**Trap 4: Premature Sharding**
- OpenAI: 800M users, unsharded Postgres
- If you're planning to shard at 5M users, you're making an expensive mistake

### The Modular Monolith Pattern

Structure your monolith well from day one — makes future extraction trivial:

```
src/
  modules/
    auth/          # Clear boundary
    billing/       # Own models, own services
    notifications/ # Explicit interface
    core/          # Shared utilities
```

- Separate packages/folders per domain
- Define explicit interfaces between modules
- Keep database schemas logically separate (same DB is fine)
- You get all organizational benefits of microservices with zero operational overhead

### When to Actually Extract a Service (all must be true)

- [ ] You have **measured evidence** of a scaling bottleneck in that specific module
- [ ] The module has **dramatically different** scaling needs (e.g., 100x CPU for video processing)
- [ ] You have **>10 engineers** and deployment is blocking multiple teams
- [ ] You have the **operational capacity** to manage a distributed system (monitoring, tracing, debugging)

If you can't check ALL four, keep the monolith.

---

## Decision 5: Caching

### The Answer: You Probably Don't Need a Cache Layer. Optimize Queries First.

```sql
-- This query takes 5-20ms with proper indexes.
-- Redis would save 4-18ms. Not worth the complexity.
-- Add an index instead.
CREATE INDEX idx_posts_published_created ON posts (published, created_at DESC);
```

### The Caching Ladder

| Step | What to Do | When |
|---|---|---|
| 1 | Add database indexes | Always (free, massive impact) |
| 2 | Use PostgreSQL materialized views | For expensive aggregation queries |
| 3 | Add HTTP caching headers (`Cache-Control`) | For static/semi-static API responses |
| 4 | Use CDN (Cloudflare free) | For static assets, public pages |
| 5 | Add in-process cache (LRU, 60s TTL) | For config/feature flags read thousands of times |
| 6 | **Add Redis** | Only when Steps 1-5 aren't enough |

### Concrete Thresholds Before Adding Redis

You need **2+ of these simultaneously** to justify Redis:

| Signal | Still Optimize Postgres | Add Redis |
|---|---|---|
| Hot table query volume | <10K calls/min | >10K calls/min |
| DB connection utilization | <60% at peak | >60% at peak |
| Key-value lookup latency | <10ms | >10ms consistently |
| Buffer cache hit ratio | >95% | <95% for lookup tables |

### When Redis Actually Helps (if you do add it, use Upstash — serverless)

- Rate limiting in serverless environments (no persistent process for counters)
- Session storage across stateless function instances
- Background job queues (BullMQ) beyond what `SKIP LOCKED` provides
- Shared ephemeral state across multiple app servers

---

## Decision 6: Security (Non-Negotiable Minimum)

### Day 1 — Even at 0 Users

| Measure | Why | Cost |
|---|---|---|
| **HTTPS everywhere** | Table stakes. Let's Encrypt or PaaS auto-SSL. | Free |
| **MFA on all admin/infra accounts** | GitHub, cloud provider, DNS, domain registrar. Prefer passkeys or hardware keys. | Free |
| **Secrets scanning** | Run TruffleHog or GitLeaks on your repo | Free |
| **Database not publicly accessible** | Single most common critical vulnerability in startups | Free |
| **httpOnly + Secure + SameSite cookies** | Prevents XSS from stealing sessions | Free |
| **Server-side input validation** | Zod (TS), Pydantic (Python). Never trust client input. | Free |
| **Security headers** | `Strict-Transport-Security`, `X-Frame-Options`, `Content-Security-Policy` | Free |

### At 100+ Users (Month 1)

| Measure | Details |
|---|---|
| **Rate limiting on auth endpoints** | 5-10 attempts/min on `/login`, `/reset-password`, `/verify-otp` |
| **CORS: explicit allowlist** | Never `*` with credentials |
| **Webhook signature verification** | Before any side effects (Stripe, GitHub, etc.) |
| **Basic logging** | Auth attempts, authorization failures, rate limit violations |
| **1-page incident response plan** | Who gets called. Who has access. What gets shut down. |

### Skip Until Enterprise Customer / Series A

- **SOC 2 / ISO 27001 audit**: Implement good practices now, pay for the audit later ($15-40K)
- **Penetration testing**: Get one before Series A ($6-12K)
- **WAF**: Cloudflare free tier covers basics
- **Bug bounty program**: After you have a security team
- **CSRF tokens**: SameSite cookies handle most cases in modern browsers

### Password Rules (if not using managed auth)

- Prefer passkeys (WebAuthn/FIDO2) — mainstream in 2026, phishing-resistant. Offer them as the default, password as fallback.
- NEVER store plain text or unsalted hashes
- Use bcrypt/scrypt/argon2 with unique random salt per password
- Minimum 12 characters, no maximum (within reason)
- Check against known breached passwords (HaveIBeenPwned API)

---

## Decision 7: Monitoring

### The Answer: Sentry + Uptime Check = $0/month

| What | Tool | Cost | What It Answers |
|---|---|---|---|
| Error tracking | **Sentry** free (5K errors/mo) | $0 | "What broke?" |
| Uptime | **BetterStack** free (10 monitors) | $0 | "Is the app up?" |
| Logs (if needed) | **Axiom** free (500GB/mo) | $0 | "What happened before the error?" |
| **Total** | | **$0/month** | Covers 90% of needs |

### Setup (5 minutes)

1. `npm install @sentry/nextjs && npx @sentry/wizard@latest -i nextjs`
2. Add a `/api/health` endpoint that checks DB connectivity
3. Point BetterStack at your health endpoint
4. Done.

### What You Don't Need (Enterprise Theater)

- **Datadog** ($300-800/mo for small teams): You don't need full-stack APM yet
- **Full ELK stack**: `console.log` with structured JSON + Axiom free tier
- **Distributed tracing**: You have one service. Nothing to distribute.
- **Custom Grafana dashboards**: Nobody will look at them
- **PagerDuty**: You're 3 people. A Slack webhook is your on-call rotation.

### Monitoring Scaling Ladder

| Stage | Add | Cost |
|---|---|---|
| 0-1K users | Sentry free + BetterStack free | $0 |
| 1K-10K users | Sentry Team ($26) + Axiom ($25) | ~$50/mo |
| 10K-100K users | Consider PostHog + structured logging | ~$100/mo |
| 100K+ users | **Graduate to `neo-system-design` full version** | |

---

## Decision 8: API Design

### The Answer: REST. Keep It Simple.

At small scale, REST covers everything. Don't add GraphQL or gRPC until you have a measured reason.

### REST Essentials (The Only Rules That Matter)

1. **Use nouns for resources**: `/users`, `/posts`, `/orders`
2. **Use HTTP methods correctly**: GET (read), POST (create), PUT (replace), PATCH (update), DELETE (remove)
3. **Return proper status codes**: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Server Error
4. **Validate all input server-side**: Zod schema → parse before any logic
5. **Paginate list endpoints**: `?page=1&limit=20` or cursor-based
6. **Version from day 1**: `/api/v1/` — costs nothing, saves future pain
7. **Consistent error format**:
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Email is required" } }
```

### What You Don't Need

- **GraphQL**: Unless you have 3+ different frontend clients with very different data needs. Caching is harder. Tooling is more complex. REST + good endpoint design covers 95% of cases.
- **gRPC**: Unless you have internal service-to-service calls at >10K QPS. Browser can't call gRPC directly.
- **WebSockets**: Unless you're building chat, multiplayer games, or collaborative editing. For notifications, live feeds, AI streaming → use SSE (Server-Sent Events) first. Simpler, works everywhere.
- **Webhooks infrastructure**: Until you're a platform that external developers integrate with.

### When to Add Real-Time

```
Server pushing updates to client (notifications, feeds, AI streaming)?
  → SSE (Server-Sent Events). One HTTP connection. Auto-reconnect built in.

Client AND server both sending frequent messages (chat, games)?
  → WebSocket. Full-duplex.

Server-to-server event notification (payment confirmation, CI/CD)?
  → Webhooks (HTTP POST with signature verification).
```

> SSE covers 80% of "real-time" use cases. Start there. Escalate to WebSocket only when the client needs to send frequent messages.

---

# The Graduation Checklist

**You're ready for `neo-system-design` (full version) when 3+ are true:**

- [ ] **>10 engineers** needing independent deployment
- [ ] **>100K DAU** with measured, confirmed bottlenecks
- [ ] Single PostgreSQL is **actually at capacity** (not "might be someday")
- [ ] Infra spend **>$2K/month** and needs optimization
- [ ] Monolith deploy **>30 minutes** and blocks multiple teams
- [ ] **Different scaling needs** across components (100x CPU for video, 1x for API)
- [ ] **Regulatory requirements** forcing architectural changes (multi-region, data residency)

**If you can't check 3+ of these, you don't need Netflix-scale architecture.**

---

# Quick Reference Card

## The One-Line Answers

| Question | Answer |
|---|---|
| What database? | **PostgreSQL** |
| What auth? | **Clerk** or **Supabase Auth** |
| What deployment? | **Vercel** or **Railway** |
| What architecture? | **Monolith** |
| What cache? | **None. Add indexes.** |
| What message queue? | **Database-backed** (pg_boss, BullMQ, Solid Queue) |
| What monitoring? | **Sentry + uptime check** |
| What API? | **REST** |
| What real-time? | **SSE** |
| What search? | **PostgreSQL full-text** (`tsvector` + GIN index) |
| What file storage? | **S3** or **Supabase Storage** |
| What CDN? | **Cloudflare** (free) |
| Do I need Kubernetes? | **No.** |
| Do I need microservices? | **No.** |
| Do I need Kafka? | **No.** |
| Do I need Redis? | **Probably no.** Optimize queries first. |
| Do I need sharding? | **No.** OpenAI serves 800M users without it. |

## Cost Targets

| Stage | Monthly Infra | % of Revenue |
|---|---|---|
| Pre-revenue | $0-5 | N/A |
| $1K MRR | $5-25 | 0.5-2.5% |
| $10K MRR | $25-75 | 0.25-0.75% |
| $100K MRR | $75-200 | <0.2% |

## The Only Metrics That Matter Early On

1. **Is the app up?** (uptime monitor)
2. **Is anything broken?** (Sentry errors)
3. **Are users using it?** (PostHog / analytics)
4. **Is it fast enough?** (Core Web Vitals, check quarterly)

Everything else is enterprise theater until you have enterprise problems.
