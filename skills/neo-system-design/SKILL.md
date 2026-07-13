---
name: neo-system-design
description: "Comprehensive system design knowledge base covering distributed systems, databases, caching, networking, security, cloud architecture, API design, microservices, and real-world case studies. Use when designing systems, answering architecture questions, reviewing system design decisions, or preparing for system design interviews."
allowed-tools:
  - Read
  - Grep
  - Glob
  - AskUserQuestion
---

# Neo System Design

A comprehensive system design reference distilled from 150+ engineering articles covering distributed systems, databases, networking, security, cloud, APIs, microservices, and real-world architectures.

## When to Use

- Designing or reviewing system architecture
- Making infrastructure or technology decisions
- Evaluating trade-offs (SQL vs NoSQL, REST vs GraphQL, etc.)
- Implementing caching, load balancing, authentication, or messaging patterns
- Reviewing code for scalability, reliability, or performance concerns
- System design interview preparation or discussion

## When NOT to Use

- Pure frontend/UI work with no backend considerations
- Simple CRUD without scale concerns
- Language syntax questions unrelated to architecture

---

# Section 1: Fundamentals

## 1.1 Byte Ordering (Endianness)

- **Little Endian**: Least significant byte at lowest address. Used by Intel x86.
- **Big Endian**: Most significant byte at lowest address. Used in network communications, file storage, older PowerPC/Motorola 68k.
- Critical when transferring data between systems with different endianness.

## 1.2 How Programming Languages Execute

| Type | Languages | Mechanism |
|---|---|---|
| **Compiled** | C, C++, Go | Source -> machine code -> CPU executes directly |
| **Bytecode** | Java, C# | Source -> bytecode -> VM executes; JIT can compile to machine code |
| **Interpreted** | Python, JS, Ruby | Interpreted at runtime; generally slower |

## 1.3 8 Programming Paradigms

1. **Imperative** - Sequential state-changing steps (C, C++, Java, Python)
2. **Declarative** - Express logic without control flow details
3. **Object-Oriented (OOP)** - Objects encapsulate data + behavior (Java, C++, Python, Ruby)
4. **Aspect-Oriented (AOP)** - Modularize cross-cutting concerns (AspectJ)
5. **Functional (FP)** - Computation as mathematical functions; immutable data (Haskell, Lisp, Erlang)
6. **Reactive** - Asynchronous data streams + change propagation
7. **Generic** - Type-independent reusable code (templates, generics)
8. **Concurrent** - Multiple tasks simultaneously; threading, parallelism

## 1.4 Concurrency vs Parallelism

- **Concurrency**: Dealing with many things at once (program structure). Good for I/O-bound tasks.
- **Parallelism**: Doing many things at once (execution). Requires multi-core. Good for CPU-bound tasks.

## 1.5 10 Coding Principles

1. Follow code specifications (PEP 8, Google Java Style)
2. Document the "why", not the "what"
3. Robust exception handling
4. Follow SOLID principles
5. Design for testability
6. Appropriate abstraction levels
7. Use design patterns judiciously (don't over-design)
8. Reduce global dependencies
9. Continuous refactoring
10. Security is top priority

## 1.6 CAP, BASE, SOLID, KISS

- **CAP Theorem**: Consistency + Availability + Partition Tolerance -- pick 2
- **BASE**: Basically Available, Soft state, Eventually consistent (NoSQL alternative to ACID)
- **SOLID**: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- **KISS**: Keep It Simple, Stupid

## 1.7 Semantic Versioning (SemVer)

Format: `MAJOR.MINOR.PATCH`
- **MAJOR**: Incompatible API changes
- **MINOR**: Backward-compatible new features
- **PATCH**: Backward-compatible bug fixes
- Pre-release: `-alpha`, `-beta`, `-rc.1`

---

# Section 2: System Design Core Concepts

## 2.1 System Design Blueprint (15 Pillars)

Requirement Gathering, System Architecture, Data Design, Domain Design, Scalability, Reliability, Availability, Performance, Security, Maintainability, Testing, UX Design, Cost Estimation, Documentation, Migration Plan

## 2.2 High Availability / Throughput / Scalability

| Concern | Metric | Patterns |
|---|---|---|
| **High Availability** | 99.99% = 8.64s downtime/day | Hot-hot, Hot-warm, Single-leader cluster, Leaderless cluster |
| **High Throughput** | QPS / TPS | Caching, threading, async processing |
| **High Scalability** | Horizontal (more servers) / Vertical (more resources) | Watch response time as load increases |

## 2.3 10 Key System Design Trade-offs

1. Vertical vs Horizontal Scaling
2. SQL vs NoSQL
3. Batch vs Stream Processing
4. Normalization vs Denormalization
5. Consistency vs Availability
6. Strong vs Eventual Consistency
7. REST vs GraphQL
8. Stateful vs Stateless
9. Read-Through vs Write-Through Cache
10. Synchronous vs Asynchronous Processing

## 2.4 Fault-Tolerant System Design (6 Principles)

Replication, Redundancy, Load Balancing, Failover Mechanisms, Graceful Degradation, Monitoring & Alerting

## 2.5 8 Common System Design Problems & Solutions

Covers standard interview-ready problems: URL shortener, rate limiter, notification system, chat system, news feed, search autocomplete, distributed file storage, video streaming.

## 2.6 Latency Numbers Every Developer Should Know

| Operation | Latency |
|---|---|
| L1 cache reference | ~1 ns |
| L2 cache reference | ~4-10 ns |
| RAM access (Redis reads) | ~100 ns |
| 1KB over 1 Gbps network | ~10 us |
| NVMe SSD random 4K read | ~20 us |
| Legacy SATA SSD random read | ~100 us |
| DB insert (PostgreSQL) | ~1 ms |
| Same-datacenter round-trip | ~0.5 ms |
| CA -> Netherlands -> CA round-trip | ~150 ms |
| Retry/refresh interval | 1-10 s |

> These are the canonical Jeff Dean / Peter Norvig approximations — still useful for back-of-envelope math, but recalibrate for modern hardware: DDR5 memory bandwidth ~48 GB/s, NVMe sequential reads reach 7-15 GB/s, and datacenter networks (25-400 Gbps) now often beat local disk. Rule of thumb: memory > NVMe > network > SATA SSD > HDD, but network can outrun disk on high-tier links.

---

# Section 3: Networking & Protocols

## 3.1 OSI Model & Data Transmission

Encapsulation: Application (HTTP header) -> Transport (TCP/UDP header) -> Network (IP header) -> Data Link (MAC header) -> Physical (binary bits). De-encapsulation reverses at receiver.

## 3.2 HTTP Methods

| Method | Idempotent | Purpose |
|---|---|---|
| GET | Yes | Retrieve resource |
| PUT | Yes | Update/create full resource |
| POST | No | Create new resource |
| DELETE | Yes | Delete resource |
| PATCH | No | Partial modification |
| HEAD | Yes | Like GET without body |
| OPTIONS | - | Describe communication options |
| CONNECT | - | Establish tunnel |
| TRACE | - | Loop-back test |

## 3.3 HTTP/2 vs HTTP/1 vs HTTP/3

HTTP/2 improvements over HTTP/1:
1. **Binary Framing Layer** - Encode to binary frames (not text)
2. **Multiplexing** - Interleave multiple streams over single connection
3. **Stream Prioritization** - Weight-based priority
4. **Server Push** - Proactively send resources (deprecated; Chrome removed support in 2022 — use `103 Early Hints` / `preload` instead)
5. **HPACK Header Compression** - Reduce overhead

### HTTP/3 + QUIC

- **Runs over QUIC (UDP), not TCP** (RFC 9000/9114). QUIC implements streams, reliability, ordering, and congestion control itself.
- **Fixes TCP head-of-line blocking**: HTTP/2 multiplexes over one TCP connection, so a single lost packet stalls *all* streams. QUIC streams are independent — a lost packet only stalls its own stream. Big win on lossy/mobile networks (~10-20% TTFB improvement); marginal on clean wired links.
- **Faster connection setup**: TLS 1.3 is baked into the QUIC handshake (1-RTT, or 0-RTT on resumption). Connection migration via Connection IDs survives IP changes (Wi-Fi ↔ cellular).
- **Discovery via `Alt-Svc: h3=":443"`**: first request uses HTTP/2 over TCP, then upgrades. Falls back gracefully to HTTP/2 if UDP:443 is blocked by middleboxes.
- **Adoption (mid-2026)**: ~30-35% of web traffic; supported by all major browsers (Chrome 87+, Firefox 88+, Safari 14+), Cloudflare/Fastly/CloudFront, and Nginx 1.25+ / Caddy.

## 3.4 HTTP Cookies

- HTTP is stateless; cookies provide session management
- Stored client-side, sent with each request
- Key attributes: `SameSite`, `Name`, `Value`, `Secure`, `Domain`, `HttpOnly`
- Browsers enforce same-origin policy

## 3.5 REST API Design

### Cheatsheet Principles
- Use nouns for endpoints, HTTP verbs for actions
- Version your API (`/v1/`)
- Support pagination, filtering, sorting
- Use proper status codes
- HATEOAS for discoverability

### 8 Tips for Efficient API Design
Versioning, Naming conventions, Security, Idempotency, Pagination, Error handling, Async operations, Rate limiting

## 3.6 REST API vs GraphQL

| Aspect | REST | GraphQL |
|---|---|---|
| Endpoints | Multiple | Single |
| Data fetching | Server decides payload | Client specifies exact fields |
| Caching | Straightforward (HTTP caching) | Complex (custom strategies) |
| Over/Under-fetching | Common problem | Solved by design |
| Best for | Simple, consistent contracts | Complex, evolving frontend needs |

## 3.7 gRPC

- High-performance RPC framework by Google
- Uses **HTTP/2** transport + **Protocol Buffers** as IDL
- **5X faster than JSON** due to binary encoding
- Supports bi-directional streaming, multi-language
- Flow: REST call -> gRPC client -> binary encode -> HTTP/2 -> gRPC server -> decode -> invoke

## 3.8 GraphQL

- Query language for APIs; developed by Meta (2012), released 2015
- Clients request exactly needed data; single query across multiple sources
- Operations: Queries, Mutations, Subscriptions
- Strong type system; great for microservices
- Downsides: Increased complexity, caching difficulty

### 4 GraphQL Adoption Patterns
1. GraphQL wrapping REST
2. GraphQL alongside REST
3. GraphQL as BFF (Backend for Frontend)
4. GraphQL Federation (multiple subgraphs)

## 3.9 Polling vs Webhooks

- **Polling**: Client checks server at intervals; resource-intensive; developer controls timing
- **Webhooks**: Server pushes events; real-time; efficient; needs retry/failure handling
- Use polling when infra limits prevent webhooks; use webhooks for instant delivery

## 3.10 UDP Top Use Cases

1. **Live Video Streaming** - Tolerates packet loss, low latency
2. **DNS** - Fast, lightweight (TCP for large responses/zone transfers)
3. **Market Data Multicast** - Efficient multi-recipient delivery
4. **IoT** - Small packets between devices

## 3.11 IPv4 vs IPv6

- IPv4: 32-bit, ~4.3 billion addresses, NAT required
- IPv6: 128-bit, virtually unlimited addresses, built-in IPsec, no NAT needed

## 3.12 VPN

4 Steps: Establish secure tunnel -> Encrypt data -> Mask IP address -> Route through VPN server
- Pros: Privacy, anonymity, encryption, IP masking
- Cons: Possible blocking, slower connections, trust in provider

## 3.13 SSH Protocol (3 Layers)

1. **Transport Layer** - Encryption + integrity
2. **Authentication Layer** - Client identity verification
3. **Connection Layer** - Multiplexes into logical channels

## 3.14 Top 8 Network Protocols

TCP, UDP, HTTP/HTTPS, FTP, SMTP, DNS, DHCP, WebSocket

## 3.15 HTTPS / TLS Handshake

("SSL" is the legacy name; SSL and TLS 1.0/1.1 are deprecated. **TLS 1.3** (RFC 8446) is the current standard, required for U.S. federal systems since 2024 (NIST SP 800-52r2).)

**TLS 1.3 handshake (1-RTT)**: ClientHello (+ key_share guess) -> ServerHello (+ key_share) + {Certificate + CertificateVerify + Finished, all encrypted} -> Client Finished + application data. Half the round trips of TLS 1.2's 2-RTT handshake.

- **0-RTT resumption**: returning clients send app data in the first packet via a pre-shared key — fastest, but replay-vulnerable, so use only for idempotent/safe requests.
- **Forward secrecy is mandatory** (ECDHE only; static RSA removed).
- **AEAD ciphers only** — TLS 1.3 keeps 5 cipher suites vs ~300 in TLS 1.2; compression, renegotiation, and MAC-then-encrypt removed (killed CRIME/downgrade attacks).
- **Certificate is encrypted** (sent after ServerHello), hiding which site you visit; Encrypted Client Hello (ECH) extends this to SNI.

---

# Section 4: Databases

## 4.1 ACID Properties

- **Atomicity**: All operations succeed or all fail (rollback)
- **Consistency**: Database invariants preserved before and after transaction
- **Isolation**: Concurrent transactions don't interfere; strictest = serializability
- **Durability**: Committed data persists through failures; distributed systems use replication

## 4.2 Top 6 Database Models

1. **Flat Model** - Single table, spreadsheet-like
2. **Hierarchical** - Tree structure, parent-child
3. **Relational** - Tables with keys, SQL, normalization (E.F. Codd, 1970)
4. **Star Schema** - Central fact table + dimension tables (OLAP)
5. **Snowflake** - Normalized star schema dimensions
6. **Network Model** - Graph structure, multiple parents/children

## 4.3 SQL Components

- **DDL**: CREATE, ALTER, DROP
- **DQL**: SELECT
- **DML**: INSERT, UPDATE, DELETE
- **DCL**: GRANT, REVOKE
- **TCL**: COMMIT, ROLLBACK

## 4.4 SQL Query Execution Order

Parsing -> Validity check -> Transform to relational algebra -> Optimize with index info -> Execute plan -> Return results

## 4.5 Database Locks (9 Types)

Shared (S), Exclusive (X), Update (U), Schema, Bulk Update (BU), Key-Range, Row-Level, Page-Level, Table-Level

## 4.6 7 Database Scaling Strategies

1. **Indexing** - Speed up reads
2. **Materialized Views** - Pre-computed query results
3. **Denormalization** - Reduce joins at cost of redundancy
4. **Vertical Scaling** - Bigger hardware
5. **Caching** - Reduce DB load
6. **Replication** - Scale reads (primary-replica)
7. **Sharding** - Scale writes + reads (partition data)

## 4.7 Data Sharding Algorithms

1. **Range-Based** - Partition by value ranges (alphabetical, date)
2. **Hash-Based** - Hash function on shard key; even distribution
3. **Consistent Hashing** - Minimizes data relocation on shard changes
4. **Virtual Bucket** - Two-level mapping: data -> virtual buckets -> physical shards

### Shard Key Selection Criteria
Consider: Cardinality, Frequency, Monotonic change

### Request Routing
Shard-aware node, Routing tier, Shard-aware client

## 4.8 8 Key Data Structures Powering Databases

| Structure | Used In | Purpose |
|---|---|---|
| **Skiplist** | Redis | Sorted sets |
| **Hash Index** | In-memory DBs | O(1) lookup |
| **SSTable** | Cassandra, RocksDB | Immutable on-disk sorted storage |
| **LSM Tree** | Cassandra, LevelDB | High write throughput |
| **B-tree** | PostgreSQL, MySQL | Balanced read/write |
| **Inverted Index** | Elasticsearch, Lucene | Full-text search |
| **Suffix Tree** | Bioinformatics | String pattern matching |
| **R-tree** | PostGIS | Multi-dimensional/spatial queries |

## 4.9 Deadlocks

**Coffman Conditions** (all 4 required): Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait

**Prevention**: Resource ordering, Timeouts, Banker's Algorithm
**Recovery**: Victim selection (utilization/priority/cost), Rollback + restart

## 4.10 API Pagination Techniques

1. **Offset-based** - `?offset=20&limit=10` (simple but slow at scale)
2. **Cursor-based** - `?cursor=abc123` (efficient, no skipping)
3. **Page-based** - `?page=3&size=10`
4. **Keyset-based** - `?after_id=100` (fast with indexed columns)
5. **Time-based** - `?since=2024-01-01`
6. **Hybrid** - Combine approaches

## 4.11 PostgreSQL Ecosystem

Extensions: TimeSeries (TimescaleDB), Vector/AI (pgvector + pgvectorscale, PostgresML), OLAP (Hydra, Citus), GeoSpatial (PostGIS), Search (pgroonga, ParadeDB/pg_search), Federated (MongoDB/MySQL/Redis connectors via FDW), Graph (Apache AGE)

> **Note**: EdgeDB rebranded to **Gel** (2025) and repositions itself as a compiler layer *on top of* Postgres rather than a graph DB. pgvector (with HNSW + IVFFlat indexes) has become the default way to add vector search to Postgres, undercutting most standalone vector-DB startups for small-to-mid workloads.

---

# Section 5: Caching

## 5.1 Where Data Is Cached (8 Layers)

1. **Client apps** - Browser cache with HTTP expiry headers
2. **CDN** - Static resources at edge locations
3. **Load Balancer** - Frequently requested responses
4. **Messaging infra** - Kafka retention policy
5. **Services** - CPU cache -> memory -> disk
6. **Distributed Cache** - Redis key-value store
7. **Full-text Search** - Elasticsearch indices
8. **Database** - WAL, Buffer pool, Materialized views, Transaction log, Replication log

## 5.2 Cache Failure Patterns & Solutions

| Pattern | Cause | Solution |
|---|---|---|
| **Thunder Herd** | Mass key expiry at same time | Randomize TTLs; protect DB with core-only access |
| **Cache Penetration** | Key doesn't exist in cache OR DB | Cache null values; Bloom filter pre-check |
| **Cache Breakdown** | Hot key expires | Never expire hot keys (80/20 rule) |
| **Cache Crash** | Cache completely down | Circuit breaker; cache cluster for HA |

## 5.3 Top 8 Cache Eviction Strategies

LRU (Least Recently Used), MRU (Most Recently Used), SLRU (Segmented: probationary + protected), LFU (Least Frequently Used), FIFO, TTL-based, Two-Tiered Caching, Random Replacement (RR)

## 5.4 Data Management Patterns

1. **Cache Aside** - Check cache; on miss, fetch DB, update cache
2. **Materialized View** - Pre-computed query results on disk
3. **CQRS** - Separate read/write models
4. **Event Sourcing** - Store all state changes as event sequence
5. **Index Table** - Secondary indexes for query optimization
6. **Sharding** - Partition data across servers

## 5.5 Netflix Caching (4 Ways)

EVCache for distributed caching, CDN caching via Open Connect, application-level caching, database query caching

---

# Section 6: Load Balancing

## 6.1 Top 6 Load Balancing Algorithms

### Static:
1. **Round Robin** - Sequential; services must be stateless
2. **Sticky Round-Robin** - Same user -> same server
3. **Weighted Round-Robin** - Admin assigns weights
4. **Hash** - Hash function on IP/URL

### Dynamic:
5. **Least Connections** - Fewest active connections
6. **Least Response Time** - Fastest response

## 6.2 6 Load Balancer Use Cases

Traffic Distribution, High Availability, SSL Termination, Session Persistence (sticky sessions), Horizontal Scalability, Health Monitoring

## 6.3 Reverse Proxy vs API Gateway vs Load Balancer

- **Reverse Proxy**: Hides backend servers, shields from attacks (stealth)
- **API Gateway**: Routes to correct services, handles auth/rate-limiting (organized comms)
- **Load Balancer**: Distributes traffic evenly (traffic control)

---

# Section 7: Security

## 7.1 Authentication Methods

### Session, Cookie, JWT, Token, SSO, OAuth 2.0

| Method | Mechanism |
|---|---|
| **Session** | Server stores identity; sends session ID cookie |
| **Token** | Identity encoded in token sent to browser |
| **JWT** | Standardized token with digital signature |
| **SSO** | Central auth service for multiple sites |
| **OAuth 2.0 / 2.1** | Limited data access between sites without password sharing |
| **Passkeys (WebAuthn/FIDO2)** | Passwordless, phishing-resistant public-key credentials syncable across devices; now mainstream (Apple/Google/Microsoft) |
| **QR Code** | Random token encoded in QR for mobile login |

### Session-based vs JWT Authentication
- **Session**: Server stores session -> sends session ID cookie -> validates each request (stateful)
- **JWT**: Server issues signed JWT -> no server storage -> verifies with key (stateless)

### OAuth 2.0 / 2.1 Flows
Authorization Code (+ **PKCE**, now required for all clients under OAuth 2.1), Client Credentials, Device Authorization (TVs/CLIs). **Deprecated — do not use**: Implicit flow and Resource Owner Password Grant (both omitted from the OAuth 2.1 draft). OAuth 2.1 (IETF draft, consolidating RFC 6749 + PKCE + Security BCP RFC 9700) mandates PKCE and exact redirect-URI matching.

### REST API Auth Methods
1. **Basic Auth** - Username/password per request (least secure)
2. **Token Auth** - JWT tokens, no credentials per request
3. **OAuth** - Third-party access delegation
4. **API Key** - Unique keys in headers/params (simple but less secure)

## 7.2 HTTPS / TLS Handshake

Handshake mechanics: see §3.15. Security takeaway: enforce TLS 1.3, disable SSL and TLS 1.0/1.1, require forward secrecy.

## 7.3 Encoding vs Encryption vs Tokenization

| | Purpose | Reversible? | Key needed? |
|---|---|---|---|
| **Encoding** | Format conversion (Base64, URL) | Yes | No |
| **Encryption** | Data confidentiality | Yes | Yes (symmetric/asymmetric) |
| **Tokenization** | Replace with non-sensitive token | Via vault only | N/A |

## 7.4 Password Storage

- NEVER store plain text or unsalted hashes
- **Use a slow, memory-hard password hash** — never fast hashes (SHA-256/MD5):
  - **Argon2id** (default, OWASP-recommended): min m=19 MiB, t=2, p=1 (tune to ~150-250ms/hash)
  - **scrypt** if Argon2 unavailable (N=2^17, r=8, p=1)
  - **bcrypt** only for legacy systems (work factor ≥10; 72-byte input limit)
  - **PBKDF2-HMAC-SHA256** (≥600,000 iterations) when FIPS-140 compliance is required
- **Salt**: Unique random string per password (modern algos embed the salt in the output hash string)
- Optionally add a **pepper** (secret stored separately, e.g. in an HSM/KMS) for defense in depth
- Validate: recompute hash from input + stored params/salt -> constant-time compare

## 7.5 XSS (Cross-Site Scripting)

- **Reflective XSS**: Injected script executes immediately (URL-based)
- **Stored XSS**: Script persists in database; long-term threat
- **Mitigation**: Input validation, output encoding, Content Security Policy (CSP)

## 7.6 Cloud Security Cheat Sheet

Covers: IAM, Network security (VPC, firewalls), Encryption (at rest, in transit), Logging & monitoring, Compliance frameworks

## 7.7 Sensitive Data Management

- **Types**: PII, health info, IP, financial, education, legal records
- **Encryption & Key Management**: TLS for transmission; split keys among roles
- **Data Desensitization**: Anonymization/sanitization
- **RBAC**: Role-Based Access Control for minimal permissions
- **Lifecycle**: Grant dev permissions during development; revoke after data goes online

## 7.8 Top 6 Firewall Use Cases

1. Port-Based Rules (80/443 for web)
2. IP Address Filtering (whitelist/blacklist)
3. Protocol-Based Rules (TCP/UDP/ICMP)
4. Time-Based Rules (business hours vs after-hours)
5. Stateful Inspection (monitor active connections)
6. Application-Based Rules (app-level control)

## 7.9 DevSecOps

Integrates security into every phase of the development lifecycle: Plan -> Code -> Build -> Test -> Release -> Deploy -> Operate -> Monitor (with security checks at each stage)

---

# Section 8: Microservices & Distributed Systems

## 8.1 9 Microservices Best Practices

1. Separate data storage per microservice
2. Keep code at similar maturity level
3. Separate build per microservice
4. Single responsibility per service
5. Deploy into containers
6. Design stateless services
7. Adopt domain-driven design
8. Design micro frontend
9. Orchestrate microservices

## 8.2 9 Essential Components of Production Microservice

API Gateway, Service Registry/Discovery, Load Balancer, Circuit Breaker, Config Management, Logging & Monitoring, Distributed Tracing, Message Queue, Container Orchestration

## 8.3 Event Sourcing

- Paradigm shift: persist events instead of states
- Event store is the source of truth
- **New York Times**: Every article since 1851 as events -> denormalized to ElasticSearch
- **CDC**: Table changes -> events -> Kafka -> consumers
- **Microservices**: Shopping cart events -> Kafka broker -> fraud/billing/email services

## 8.4 Change Data Capture (CDC)

5 Steps: Data Modification -> Change Capture (via transaction logs) -> Change Processing -> Change Propagation (message queue) -> Real-Time Integration

Popular stack: **Debezium + Kafka Connect + Kafka**

## 8.5 Heartbeat Detection (6 Mechanisms)

Push-Based, Pull-Based, Health Check (CPU/memory metrics), Timestamps, Acknowledgement, Quorum-Based (Paxos/Raft consensus)

## 8.6 6 Cloud Messaging Patterns

1. **Async Request-Reply** - HTTP 202 + polling for long-running ops
2. **Publisher-Subscriber** - Decouple senders/consumers
3. **Claim Check** - Store payload in DB, transmit reference only
4. **Priority Queue** - Higher priority processed first
5. **Saga** - Data consistency across microservices without distributed transactions
6. **Competing Consumers** - Multiple consumers, same channel (no ordering guarantee)

## 8.7 Idempotency (6 Use Cases)

RESTful API Requests, Payment Processing, Order Management, Database Operations, User Account Management, Distributed Systems Messaging

## 8.8 Retry Strategies

1. **Linear Backoff** - Fixed increasing intervals (simple, can cause retry storms)
2. **Linear Jitter Backoff** - Linear + random jitter (reduces synchronized retries)
3. **Exponential Backoff** - 1s, 2s, 4s, 8s... (significantly reduces system load)
4. **Exponential Jitter Backoff** - Exponential + random jitter (best for high-load)

## 8.9 12-Factor App

1. **Codebase** - One repo, version controlled
2. **Dependencies** - Explicitly declared
3. **Config** - Separate from code (env vars)
4. **Backing Services** - Treat as attached resources
5. **Build, Release, Run** - Strict separation
6. **Processes** - Stateless, share-nothing
7. **Port Binding** - Self-contained via port
8. **Concurrency** - Scale via process model
9. **Disposability** - Fast startup, graceful shutdown
10. **Dev/Prod Parity** - Keep environments similar
11. **Logs** - Treat as event streams
12. **Admin Processes** - Run as one-off processes

---

# Section 9: Messaging & Streaming

## 9.1 Apache Kafka

> **KRaft, not ZooKeeper**: Kafka now manages its own metadata via the Raft-based **KRaft** mode (GA in 3.3). **Kafka 4.0 (2025) removed ZooKeeper entirely** — new clusters are KRaft-only, simplifying ops (one system, faster failover, millions of partitions). Migrate legacy ZooKeeper clusters via the 3.9 bridge release.

### Why Kafka Is Fast
1. **Sequential I/O** - Writes sequentially to disk (not random access)
2. **Zero Copy** - OS cache -> network card directly via `sendfile()`, skipping application buffer
   - Without zero-copy: disk -> OS cache -> app -> socket buffer -> NIC (4 copies)
   - With zero-copy: disk -> OS cache -> NIC (2 copies)

### Can Kafka Lose Messages?
- **Producer**: Need proper `acks` config and `retries`
- **Broker**: Async disk flush risks; configure replicas properly
- **Consumer**: Auto-commit can ack before processing; use sync + async commits

### Top 5 Kafka Use Cases
Log aggregation, Stream processing, Event sourcing, Metrics collection, Activity tracking

## 9.2 Push Notification Architecture

**Channels**: In-app, Email, SMS/OTP, Social media
**Flow**: Business services -> Notification gateway (single/batch) -> Distribution service (validate, format, schedule) -> Routers (message queues) -> Channel services -> Delivery tracking & analytics

**Key Repositories**: Notification template repo, Channel preference repo

## 9.3 Firebase Cloud Messaging (FCM)

Client sends credentials -> FCM generates registration token -> Client sends token to app server -> Messages composed -> FCM queues if offline -> Platform transport -> Device

---

# Section 10: Cloud & DevOps

## 10.1 Cloud Disaster Recovery Strategies

| Strategy | RTO | RPO |
|---|---|---|
| **Backup & Restore** | Hours to days | Hours to last backup |
| **Pilot Light** | Minutes to hours | Depends on sync frequency |
| **Warm Standby** | Minutes to hours | Minutes to hours |
| **Hot Site / Multi-Site** | Near-immediate (minutes) | Seconds |

**RTO** = Max acceptable downtime. **RPO** = Max acceptable data loss.

## 10.2 Docker Architecture

**3 Components**: Docker Client, Docker Host (daemon), Docker Registry

**`docker run` flow**: Pull image -> Create container -> Allocate read-write filesystem -> Create network interface -> Start container

### Top 8 Docker Concepts
Images, Containers, Dockerfile, Volumes, Networks, Compose, Registry, Build context

## 10.3 Kubernetes Architecture

**Control Plane**: API Server, Scheduler, Controller Manager, etcd (key-value store)
**Nodes**: Pods (smallest unit), Kubelet (agent per node), Kube Proxy (network routing)

### Top 10 K8s Design Patterns
Sidecar, Ambassador, Adapter, Leader Election, Work Queue, Scatter/Gather, Init Container, Self-Awareness, Daemon Service, Stateful Service

## 10.4 Kubernetes Tools Stack

Covers: Package management (Helm), Service mesh (Istio, Linkerd), Monitoring (Prometheus, Grafana), Logging (EFK stack), CI/CD (Argo CD, Flux)

## 10.5 CI/CD Pipeline

10 Steps: Product owner -> User stories -> Sprint -> Code commit -> Build + unit tests + SonarQube -> Artifact storage + dev deploy -> QA environments -> Regression/performance testing -> UAT -> Production release + SRE monitoring

## 10.6 GitOps Workflow

1. Version Control & Collaboration (Git as hub)
2. Declarative System (desired state)
3. Automated Delivery (Git-triggered CI/CD)
4. Immutable Infrastructure (changes only via Git)
5. Observability & Feedback (real-time monitoring)
6. Security & Compliance (RBAC)

## 10.7 Cloud Cost Reduction (6 Techniques)

Reduce Usage -> Terminate Idle Resources -> Right Sizing -> Shutdown During Off-Peak -> Reserve Instances / Savings Plans -> Optimize Data Transfers (compression, CDN)

## 10.8 Infrastructure as Code (IaC)

- **Traditional**: Manual setup, step-by-step commands
- **IaC**: Automates provisioning through code; declarative; source controlled
- **Tools**: Terraform, **OpenTofu** (Linux Foundation fork of Terraform after HashiCorp's 2023 switch to the BSL/BUSL source-available license; MPL, community-governed, Terraform-compatible), Pulumi, AWS CloudFormation, Chef, Puppet, Ansible

## 10.9 Cloud Monitoring (9 Aspects)

Data Collection, Data Storage, Data Analysis, Alerting, Visualization, Reporting & Compliance, Automation, Integration, Feedback Loops

## 10.10 Linux

### File System (FHS)
Root `/` tree structure. Key directories: `/bin`, `/etc`, `/home`, `/var`, `/usr`, `/tmp`, `/dev`, `/proc`

### Boot Process (8 Steps)
Power on -> BIOS/UEFI + POST -> Device detection -> Boot device selection -> GRUB -> Kernel + systemd -> default.target + startup scripts -> Login

### File Permissions
Owner/Group/Others x Read/Write/Execute. `chmod`, `chown`, `chgrp`.

### 18 Essential Commands
ls, cd, cp, mv, rm, mkdir, cat, grep, find, chmod, chown, ps, top, kill, df, du, tar, ssh

---

# Section 11: API Design & Testing

## 11.1 API vs SDK

- **API**: Rules/protocols for inter-service communication (endpoints, requests, responses)
- **SDK**: Comprehensive package (tools, libraries, docs) for building on a specific platform; higher-level abstractions

## 11.2 9 Types of API Testing

1. **Smoke** - Basic post-development validation
2. **Functional** - Compare against requirements
3. **Integration** - End-to-end, inter-service
4. **Regression** - New changes don't break existing
5. **Load** - Simulate various loads, calculate capacity
6. **Stress** - Extreme high loads
7. **Security** - External threat testing
8. **UI** - Data display validation
9. **Fuzz** - Invalid/unexpected input injection

## 11.3 API Gateway 101

Functions: Request routing, Composition, Protocol translation, Authentication, Rate limiting, Caching, Monitoring, Load balancing

## 11.4 API Design Cheat Sheet

- Use HTTP methods correctly
- Meaningful resource naming
- Proper status codes (2xx success, 4xx client error, 5xx server error)
- Versioning strategy
- Pagination for list endpoints
- Consistent error response format

---

# Section 12: Git & Version Control

## 12.1 4 Storage Locations

Working Directory -> Staging Area -> Local Repository -> Remote Repository
Most Git commands move files between these locations.

## 12.2 Git Merge vs Rebase vs Squash

- **Merge**: Creates merge commit; non-destructive; preserves both histories
- **Rebase**: Moves commits to head of main; linear history; creates new commits
- **Squash**: Combines multiple commits into one
- **Golden Rule**: Never rebase public branches

---

# Section 13: Architecture Patterns

## 13.1 Top 5 Software Architectural Patterns

Monolithic, Microservices, Event-Driven, Layered (N-tier), Service-Oriented (SOA)

## 13.2 Top 9 Architectural Patterns for Data & Communication

Request-Response, Event-Driven, Publish-Subscribe, Peer-to-Peer, Client-Server, Master-Slave, Pipe-Filter, Broker, Space-Based

## 13.3 MVC, MVP, MVVM, MVVM-C, VIPER

| Pattern | Components | Best For |
|---|---|---|
| **MVC** | Model-View-Controller | Web apps |
| **MVP** | Model-View-Presenter | Android |
| **MVVM** | Model-View-ViewModel | Data binding UIs |
| **MVVM-C** | + Coordinator | Navigation-heavy apps |
| **VIPER** | View-Interactor-Presenter-Entity-Router | Large iOS apps |

## 13.4 Design Patterns Cheat Sheet

**Creational**: Singleton, Factory, Abstract Factory, Builder, Prototype
**Structural**: Adapter, Bridge, Composite, Decorator, Facade, Proxy
**Behavioral**: Observer, Strategy, Command, State, Template Method, Iterator

## 13.5 Generative AI Architecture

Training pipeline: Pre-training on internet data -> Supervised fine-tuning -> Reward model training -> RLHF/PPO optimization

Inference: Input -> Content moderation -> Model -> Output moderation -> Response

---

# Section 14: Data Pipelines & Processing

## 14.1 Data Pipeline (5 Phases)

1. **Collect** - Acquire from data stores, streams, applications
2. **Ingest** - Load into systems, organize in event queues
3. **Store** - Data warehouses, lakes, lakehouses, databases
4. **Compute** - Aggregate, cleanse, transform (batch + stream processing)
5. **Consume** - Analytics, dashboards, ML, BI, self-service

---

# Section 15: Payments & Commerce

## 15.1 Payments Ecosystem

Cardholder -> Merchant -> Payment Gateway -> Payment Processor -> Card Network -> Issuing Bank

**Acquiring side**: Merchant -> Acquiring bank/processor -> Card network
**Issuing side**: Card network -> Issuing processor -> Issuing bank -> Validates customer

## 15.2 Visa Economics

$100 purchase: Merchant discount fee (~$2) -> Acquiring bank markup ($0.25) -> Issuing bank interchange ($1.75) -> Card network assessments (Visa: 0.11% + $0.0195/swipe)

## 15.3 QR Code / Scan-to-Pay

**QR Generation** (< 1 second): Cashier checkout -> PSP -> Generate QR URL -> Payment gateway -> Return to merchant -> Display QR

**Payment** (5 steps): Open wallet -> Scan QR -> Confirm -> PSP marks paid -> Notify merchant

---

# Section 16: Search Engines

## 16.1 Search Engine Architecture (4 Steps)

1. **Crawling** - Discover content via URL links
2. **Indexing** - Parse, analyze, categorize content
3. **Ranking** - Algorithms: keywords, relevance, quality, engagement, page speed
4. **Querying** - Sift through index, return results

---

# Section 17: Real-World Case Studies

## 17.1 Netflix Architecture

- **Mobile/Web**: Swift, Kotlin, React
- **Frontend**: GraphQL
- **Backend**: ZUUL (gateway), Eureka (service discovery), Spring Boot
- **Databases**: EVCache, Cassandra, CockroachDB
- **Messaging**: Apache Kafka, Flink
- **Storage**: S3, Open Connect CDN
- **Data processing**: Flink, Spark, Tableau, Redshift
- **CI/CD**: Jenkins, Gradle, Chaos Monkey, Spinnaker

### Netflix API Evolution (4 stages)
Monolith -> Direct access -> Gateway aggregation -> Federated GraphQL (DGS)

### Netflix Caching
EVCache distributed caching, CDN via Open Connect, app-level caching, DB query caching

## 17.2 Stack Overflow Architecture

- Serves ALL traffic with only **9 on-premise web servers** running a **monolith**
- Does NOT run on cloud
- Proves monoliths can scale effectively

## 17.3 Discord Message Storage Evolution

MongoDB (2015, 100M messages) -> Cassandra (2017, billions) -> **ScyllaDB** (Cassandra-compatible, C++)
- p99 read: 15ms (ScyllaDB) vs 40-125ms (Cassandra)
- p99 write: 5ms (ScyllaDB) vs 5-70ms (Cassandra)

## 17.4 Reddit Architecture

- CDN: Fastly; Frontend: TypeScript/Node.js
- Backend: Python monolith -> Go microservices
- API: GraphQL Federation
- Data: Postgres + Memcached + Cassandra
- CDC: Debezium; Async: RabbitMQ + Kafka
- Infra: AWS + Kubernetes; CI/CD: Spinnaker, Drone CI, Terraform

## 17.5 Figma Postgres Scaling (3 Phases)

1. Vertical Scaling + Replication (RDS upgrade + read replicas + PgBouncer)
2. Vertical Partitioning (separate DBs for high-traffic tables)
3. Horizontal Partitioning (split tables + custom DBProxy)

## 17.6 Pinterest Clone Time Optimization

One-line change that reduced clone times by 99%.

## 17.7 YouTube System Design

Upload: Request -> Raw video to object storage -> Metadata to DB/cache -> Transcoding (multiple resolutions) -> Transcoded to storage -> Notification via MQ -> Status update -> Streaming from CDN

---

# Section 18: Memory & Storage

## 18.1 Memory Hierarchy (fastest to slowest)

1. **Registers** - Ultra-fast CPU storage
2. **Caches** (L1/L2/L3) - Small, fast, near CPU
3. **Main Memory (RAM)** - Primary storage for running programs
4. **SSD** - Fast persistent storage, no moving parts
5. **HDD** - Mechanical, large capacity, long-term
6. **Remote Storage** - Offsite backup, network accessible

---

# Section 19: Redis

## 19.1 Redis Architecture Evolution

| Year | Version | Feature |
|---|---|---|
| 2010 | Initial | Standalone in-memory cache |
| 2013 | v2.8 | Persistence (RDB + AOF), Replication, Sentinel |
| 2015 | v3.0 | Cluster (16384 hash slots, sharding) |
| 2017 | v5.0 | Stream data type |
| 2020 | v6.0 | Multi-threaded I/O, ACLs, RESP3 |
| 2022 | v7.0 | Functions, multi-part AOF, sharded pub/sub |
| 2024 | v7.4 | License change: BSD-3 → RSALv2/SSPLv1 (source-available) |
| 2025 | v8.0 | Adds AGPLv3 option (OSI open source again); vector sets for AI/embeddings; modules (Search/JSON/TimeSeries/Bloom) merged into core |

> **License fork**: Redis Inc.'s March 2024 relicensing (away from BSD-3) triggered the Linux Foundation to fork Redis 7.2.4 into **Valkey** (BSD, backed by AWS, Google, Oracle) — now the drop-in open-source default in Debian/Fedora and major clouds. Redis 8 (2025) restored an OSI-approved AGPLv3 option. Both are API-compatible.

---

# Section 20: Web Performance

## 20.1 Website Speed Optimization

CDN, Image optimization, Browser caching, Minification, Lazy loading, Compression (gzip/brotli), Reduce HTTP requests, Async loading

## 20.2 Top 9 Website Performance Metrics

FCP, LCP, TTI, TBT, CLS, **INP** (replaced FID as a Core Web Vital in March 2024), TTFB, Speed Index. The three stable Core Web Vitals are now **LCP, INP, CLS**. (FID is deprecated/retired.)

## 20.3 Nginx Architecture

- Master-worker process model; event-driven non-blocking I/O
- Features: High-performance web server, Reverse proxy + load balancing, Content caching, SSL termination

---

# Section 21: Monitoring & Observability

## 21.1 Linux Performance Observability Tools

Covers tools for: CPU (top, mpstat, perf), Memory (free, vmstat), Disk (iostat, iotop), Network (netstat, tcpdump, iftop)

## 21.2 Log Parsing Cheat Sheet

Common tools: grep, awk, sed, jq (JSON), ELK stack (Elasticsearch + Logstash + Kibana)

## 21.3 Diagnosing High Resource Usage

CPU: `top`, `htop`, `perf`; Memory: `free`, `vmstat`; I/O: `iostat`, `iotop`; Network: `netstat`, `ss`

---

# Section 22: Development Lifecycle

## 22.1 SDLC Models

Iterative, Agile, Waterfall, Spiral, RAD (Rapid Application Development) - each with different risk management, flexibility, and feedback cycle characteristics.

## 22.2 Testing Best Practices

Unit testing, Integration testing, End-to-end testing, Performance testing, Security testing, Chaos testing

## 22.3 11 Steps: Junior to Senior Developer

Progressive growth through: code quality, system thinking, ownership, mentoring, cross-team influence, architecture decisions.

---

# Section 23: Live Streaming

## 23.1 Live Streaming Architecture

Streamer -> Encoder -> Point-of-presence server -> Transcoding (multiple resolutions) -> Packaging (HLS format) -> CDN caching -> Viewer's player

Optional: Store in S3 for replay/VOD

---

# PART II: DECISION FRAMEWORK LAYER

> **How to use this section**: Given a requirement or constraint, follow the decision tree to arrive at a concrete technology/pattern choice. Every recommendation is backed by production evidence from companies operating at scale.

---

# Decision 1: Database Selection

## D1.1 The Master Rule

> **Default to PostgreSQL.** It handles 90% of use cases. Only deviate when you can answer YES to a specific disqualifying question below.

## D1.2 Disqualifying Questions (first YES wins)

| # | Question | If YES → |
|---|----------|----------|
| Q1 | Need sub-10ms latency at 100K-1M req/s with predictable key-based access? | **DynamoDB** |
| Q2 | Write throughput > 100K ops/sec, append-heavy, time-series? | **Cassandra / ScyllaDB** |
| Q3 | Relationships ARE the data (social graph, fraud detection, 3+ hop traversals)? | **Neo4j (Graph DB)** |
| Q4 | Schema changes weekly, deeply nested heterogeneous documents? | **MongoDB** |
| Q5 | Sub-millisecond reads, data fits in RAM, caching/sessions/leaderboards? | **Redis** |
| Q6 | Full-text search across TB-scale indexes with analyzers/stemming? | **Elasticsearch** |
| Q7 | Dataset will exceed 256 TiB? | **DynamoDB / Cassandra** |
| Q8 | Traffic extremely bursty/unpredictable, want zero capacity planning on AWS? | **DynamoDB On-Demand** |
| Q9 | Need global distribution + strong consistency? | **CockroachDB / Spanner** |
| Q10 | None of the above? | **PostgreSQL** |

## D1.3 SQL vs NoSQL: The Concrete Test

| Choose SQL (PostgreSQL/MySQL) | Choose NoSQL |
|---|---|
| Many-to-many relationships, complex JOINs | Self-contained documents/keys |
| Schema is stable, well-defined | Schema evolves frequently |
| Strong ACID transactions required | Eventual consistency acceptable |
| Ad-hoc queries, analytics, window functions | Known access patterns, key-based lookups |
| Write volume < 50K/sec | Write volume > 100K/sec |
| Dataset < 256 TiB | Dataset unbounded |
| Multi-table transactions | Single-document/key operations |

**Concrete scenario test:**
- E-commerce with products/orders/inventory/customers relating to each other → **PostgreSQL**
- High-traffic social feed: user_id → feed (key-based, millions of reads) → **DynamoDB**
- >1TB write-heavy time-series with no cross-partition queries → **Cassandra**
- Product catalog with 47 product types, different attributes, schema changes weekly → **MongoDB**

## D1.4 Database-by-Database: When & Why

### PostgreSQL
- Complex queries, JOINs, CTEs, window functions
- ACID non-negotiable (payments, financial data)
- Query patterns will change post-launch
- **Hard limits**: ~5K connections (use PgBouncer), tens of thousands writes/sec (not millions), 256 TiB on Aurora
- **Evidence**: Instagram (sharded for core user data), Stripe (ACID for payments), Shopify, GitHub, GitLab

### MySQL
- Choose over PostgreSQL when: need efficient write replication (binlog more compact than WAL), building sharding layer (Vitess), ecosystem compatibility
- **Evidence**: Uber switched FROM Postgres TO MySQL for write amplification + replication efficiency. Built Schemaless/Docstore on MySQL. Airbnb: heavily sharded MySQL.

### DynamoDB
- Key-based access patterns known at design time, serverless/zero capacity planning, AWS-native event-driven, sub-10ms at any scale
- **Avoid when**: query patterns change post-launch (new queries = new GSIs + data remodeling), need ad-hoc analytics, items > 400KB, team lacks DynamoDB modeling expertise (3-6 month learning curve)
- **Hard limits**: 400KB item, 100 items/4MB per transaction, 3K RCU / 1K WCU per partition

### Cassandra / ScyllaDB
- Write throughput > 100K ops/sec, time-series/IoT/append-heavy, active-active multi-region, eventual consistency OK
- **Avoid when**: need strong consistency, complex queries/joins, dataset < 1TB (overkill), team can't invest in data modeling
- **ScyllaDB over Cassandra when**: can't tolerate JVM GC pauses (ScyllaDB = C++, shard-per-core)
- **License note**: ScyllaDB moved to a **source-available license** with 2025.1 (final OSS AGPL release was 6.2; Enterprise now free up to a capacity cap). Cassandra remains Apache 2.0 open source.
- **Evidence**: Discord (trillions of messages, p99 read 15ms ScyllaDB vs 40-125ms Cassandra), Uber (tens of millions QPS), Netflix (global user data)

### MongoDB
- Schema changes frequently, naturally document-shaped data, content management, rapid prototyping
- **Avoid when**: highly relational data, choosing it "because NoSQL" without concrete schema flexibility need
- **Evidence**: Stripe DocDB (petabytes, 5M+ QPS, 99.999% uptime)

### Redis
- Caching (#1 use case), sessions, leaderboards, rate limiting, pub/sub
- **Don't use as primary DB when**: durability critical, dataset exceeds RAM budget, complex queries needed
- **Evidence**: Uber (integrated cache in front of Docstore), Instagram/Shopify (caching + sessions alongside PostgreSQL)

### Elasticsearch
- Full-text search at TB scale, log analytics (ELK), complex aggregations
- **PostgreSQL can replace when**: search with `tsvector`/GIN indexes, vector search with `pgvector`, moderate dataset (< tens of GB)

## D1.5 Sharding vs Replication Decision

### Replication FIRST (default)

> Rarely shard until single primary is consistently above 70-80% of write or storage capacity.

**Use replication when**: Read-heavy (10:1+ reads:writes), data fits on single node, need HA/failover, multi-region reads

**Use sharding when**: Write throughput saturates single primary (>70-80% sustained), dataset too large for single node, high multi-tenant isolation needs

### Exhaust these BEFORE sharding (in order):

1. Vertical scaling (bigger instance)
2. Query/index optimization (`EXPLAIN ANALYZE` everything)
3. Connection pooling (PgBouncer — reduces connections 10-20x)
4. Read replicas (2-3x read throughput per replica)
5. CQRS (separate read model via CDC → Elasticsearch/materialized views)
6. Native table partitioning (`PARTITION BY RANGE`)
7. **Then** shard

### When you shard:
- Shard key = most consequential decision (can't change without full migration)
- Use consistent hashing (not mod-N) to limit data movement
- Pre-shard with 4-8x more logical shards than physical nodes

## D1.6 Production Polyglot Patterns

| Company | Primary DB | Secondary | Why |
|---|---|---|---|
| Uber | MySQL (Docstore) | Cassandra, Redis | MySQL for consistency + sharding; Cassandra for write throughput |
| Discord | ScyllaDB (messages) | PostgreSQL | ScyllaDB for trillions of messages; Postgres for relational |
| Stripe | MongoDB (DocDB) | PostgreSQL | MongoDB for flexible docs; Postgres for analytics |
| Netflix | Cassandra | DynamoDB, RDS, S3 | Cassandra for global user data; specialized DBs per use case |
| Instagram | PostgreSQL (sharded) | Cassandra, Redis | Postgres for core; Cassandra for feeds; Redis for cache |

---

# Decision 2: API Protocol Selection

## D2.1 REST vs GraphQL vs gRPC Decision Tree

```
Is this API public (external developers)?
├── YES → Do clients have complex, divergent data needs?
│   ├── YES → GraphQL (as BFF layer)
│   └── NO → REST (universal, cacheable, OpenAPI tooling)
└── NO (internal)
    ├── Latency/throughput critical? → gRPC (binary, HTTP/2, 5-10x faster)
    └── Clients have divergent data shapes? → GraphQL
        └── Otherwise → REST or gRPC (team preference)
```

**Additional factors:**
- Need bidirectional streaming? → **gRPC**
- HTTP caching critical? → **REST** (GET cacheable at CDN; POST /graphql is not)
- Team < 10 engineers? → **REST** (lowest cognitive overhead)
- Polyglot microservices? → **gRPC** (single .proto generates typed clients for 12+ languages)

## D2.2 Concrete Scenarios

| Scenario | Choose | Why |
|---|---|---|
| Public API for external devs | **REST** | Universal, HTTP caching, OpenAPI maturity |
| Mobile app with bandwidth constraints + nested data | **GraphQL** | Precise fields, 1 request vs 4+ REST round-trips |
| Internal microservice-to-microservice | **gRPC** | Binary Protocol Buffers, HTTP/2, type-safe codegen |
| Simple CRUD, < 5 resource types | **REST** | Lowest setup cost |
| Multi-platform (web + mobile + TV) different data needs | **GraphQL** | Each client fetches exactly what it needs |
| Real-time bidirectional streaming (IoT, telemetry) | **gRPC** | Bidirectional streams with backpressure |
| Dashboard aggregating from many backend services | **GraphQL** | Single query, DataLoader for N+1 |

## D2.3 The Hybrid Architecture (Production Default at Scale)

```
External Partners → REST /api/v1/*        (stable, versioned, cacheable)
Browser/Mobile    → GraphQL /graphql      (flexible queries, DataLoader)
Internal Services → gRPC                   (binary, typed, low-latency)
API Gateway       → Auth, rate limiting, protocol translation
```

## D2.4 Real-Time Communication: Webhooks vs Polling vs SSE vs WebSocket

| Pattern | Direction | Latency | Best For |
|---|---|---|---|
| **Short Polling** | Client pulls | High (interval) | Dashboards updating every 30s+, MVP |
| **Long Polling** | Client pulls (held) | ~100ms | Corporate firewalls, legacy fallback |
| **SSE** | Server → Client | ~50ms | Notifications, live feeds, AI streaming, build logs |
| **WebSocket** | Bidirectional | ~20ms | Chat, multiplayer games, collaborative editing |
| **Webhooks** | Server → Server | Event-driven | Payment callbacks, CI/CD triggers, SaaS integrations |

**Decision logic:**
- Client needs to send frequent data to server? → **WebSocket**
- Server pushing updates to client, client is passive? → **SSE**
- Server-to-server event notification? → **Webhooks**
- Behind restrictive corporate firewalls? → **Long Polling**

> **2026 default**: SSE covers 80% of "real-time" use cases developers reach for WebSockets for. Start with SSE; escalate to WebSocket only when client needs to send frequent messages back.

---

# Decision 3: Caching Strategy Selection

## D3.1 Which Caching Pattern

```
Read-heavy (>80% reads)?
├── Need read-after-write consistency? → Write-Through
└── Eventual OK? → Cache-Aside (DEFAULT — start here)

Write-heavy (>50% writes)?
├── Can tolerate small data-loss if cache crashes? → Write-Behind (best throughput)
└── Cannot tolerate loss? → Write-Through

Write lots of data rarely re-read (imports, ETL)? → Write-Around
```

| Pattern | Read Latency | Write Latency | Consistency | Best Fit |
|---|---|---|---|---|
| **Cache-Aside** | Low (hit) / Higher (miss) | Low | Eventual (TTL-bounded) | **General-purpose, start here** |
| **Read-Through** | Stable | Depends on write | Depends | Centralized cache logic |
| **Write-Through** | Low | Higher (sync double write) | High | Read-after-write critical (balances, inventory) |
| **Write-Behind** | Low | Very low | Eventual, complex | Write-heavy ingestion (analytics, clickstream) |
| **Write-Around** | Higher (first read = miss) | Low | Eventual | Bulk imports, ETL, logs |

> **One-liner**: Pick based on the **cost of a stale read** vs the **cost of a slow write**.

## D3.2 Which Caching Layer

```
Static assets (JS, CSS, images)? → Browser Cache + CDN (fingerprinted URLs, 1-year TTL)
Public API responses (same for all users)? → CDN + Redis
Authenticated/user-specific responses? → Redis only (Cache-Control: private)
Expensive DB queries (>50ms, repeated)? → Redis with cache-aside
Session/user state? → Redis with TTL matching session lifetime
```

**By app instance count:**
- 1 instance → In-process L1 cache sufficient
- 2-10 instances → L1 (in-process) + L2 (Redis)
- 10+ instances → L1 (short TTL) + L2 (Redis Cluster) + CDN

**By QPS on hot keys:**
- < 100 QPS → Simple cache-aside
- 100-10K QPS → Add request coalescing (singleflight)
- 10K+ QPS → Probabilistic early expiration + distributed locking

> **Golden rule**: Cache at the **outermost layer** possible. Browser hit = 0ms. CDN = 5-50ms. Redis = 1-5ms. DB = 10-100ms+.

## D3.3 Which Eviction Strategy

| Access Pattern | Use | Why |
|---|---|---|
| Recently accessed = likely reused (sessions, dashboards) | **LRU** (DEFAULT) | Adapts to temporal locality |
| Stable hotspots, skewed 80/20 distribution (catalogs, best sellers) | **LFU** | Preserves popular items |
| Rapidly changing access patterns (hourly shifts) | **LRU** | Adapts faster than LFU |
| Sequential scan workloads (iterating through dataset) | **LFU** | LRU gets "scan polluted" |
| Data has natural expiration (regulatory, freshness) | **TTL-based** | Combine with LRU/LFU |
| Cannot predict patterns, want minimal overhead | **Random** | O(1) evictions |
| **Unsure** | **LRU** (Redis: allkeys-lru) | Safe default. Monitor hit rate; try LFU if thrashing. |

> **Key insight**: TTL is **expiration** (remove stale data). LRU/LFU is **eviction** (make room when full). Use **both together**.

## D3.4 TTL Selection Guide

| Data Type | TTL Range | Examples |
|---|---|---|
| Traffic smoothing | 1-5 seconds | Rate-limited upstream calls |
| Near-real-time | 10-60 seconds | Inventory counts, leaderboards, cart |
| Session/profile | 1-10 minutes | User profiles, preferences |
| Reference/catalog | 10 min - 1 hour | Product listings, categories, feature flags |
| Static/config | 1-24 hours | Country codes, config |
| Immutable assets | 1 year (fingerprinted URL) | JS, CSS, images |
| **NEVER cache** | -- | Financial transactions, real-time auth, checkout inventory |

**TTL rules:**
1. Always add jitter (+-10-20%) to prevent thundering herd
2. Short TTL + event-driven invalidation for critical data (prices, inventory)
3. Longer TTL + versioned cache keys for reference data
4. Cache NULL results with short TTL (15-60s) to prevent penetration attacks

## D3.5 When NOT to Cache

- Read-to-write ratio < 2:1 (data changes too often)
- Underlying query already fast (<5ms — cache adds net latency via extra hop)
- Data must be real-time consistent (payments, auth, checkout)
- Each request has unique parameters (user-input search)
- Cache hit rate below 50% (caching the wrong things)
- Single instance with <100 QPS (overhead > benefit)

---

# Decision 4: Messaging System Selection

## D4.1 Kafka vs RabbitMQ vs SQS Decision Tree

```
Need message replay / event sourcing?
├── YES → Kafka (immutable log, offset replay is core)
└── NO
    ├── Throughput > 100K msg/sec? → Kafka
    ├── Throughput < 1K msg/sec? → SQS or RabbitMQ (Kafka is overkill)
    ├── Need flexible routing (topic patterns, fanout, headers, priorities)?
    │   → RabbitMQ (4 exchange types + priority queues)
    ├── Zero infra management? → SQS (fully managed, auto-scales)
    ├── Need stream processing (real-time analytics, CDC)? → Kafka
    ├── Latency < 5ms p99? → RabbitMQ (~1ms p99)
    └── AWS-only, vendor lock-in OK? → SQS (cheapest below 1B messages/month)
```

## D4.2 Feature Comparison

| Feature | RabbitMQ | Kafka | SQS |
|---|---|---|---|
| Throughput | 50-100K msg/s per node | Millions msg/s per cluster | Unlimited (Standard) |
| Latency (p99) | <1ms | 5-15ms (batched) | 20-50ms (HTTP) |
| Message replay | No | Yes (core feature) | No |
| Routing flexibility | Excellent (4 exchange types) | Basic (partition-based) | Basic |
| Priority queues | Yes (native) | No | No |
| Stream processing | No | Yes (Kafka Streams, ksqlDB) | No (use Lambda) |
| Operational overhead | Low-Medium | Medium-High | Zero |

## D4.3 Use Case → Technology Map

| Use Case | Best Choice | Why |
|---|---|---|
| Email/notification queue | **SQS** or **RabbitMQ** | Simple task distribution |
| Order processing pipeline | **RabbitMQ** | Flexible routing, DLQ, priorities |
| Real-time analytics / clickstream | **Kafka** | Massive throughput, multiple consumer types |
| Event sourcing / audit log | **Kafka** | Immutable log, replay from any offset |
| CDC (database change capture) | **Kafka** | Kafka Connect + Debezium = industry standard |
| AWS serverless (Lambda triggers) | **SQS** | Native integration, zero ops |
| Background job processing | **SQS** or **RabbitMQ** | Simple work queue semantics |

### Newer brokers worth knowing (2026)
- **Redpanda** — Kafka API-compatible, C++, single binary, no JVM/ZooKeeper. ~10x lower p99 latency and simpler ops; the easiest Kafka migration (drop-in clients + offsets). Best when you want Kafka semantics without the JVM/ops burden.
- **NATS (+ JetStream)** — tiny Go binary, sub-ms latency, built-in request-reply + KV/object store. Ideal for microservice messaging, edge/IoT. Not Kafka-wire-compatible; smaller ecosystem.
- **WarpStream** — serverless, S3-backed, Kafka-compatible; zero brokers, pay-per-GB. Good for bursty workloads that tolerate ~50ms latency.
- **RabbitMQ Streams** (3.13+) — log-based append-only queues for existing RabbitMQ shops needing replay (~50-100K msg/s ceiling).
- **Pulsar** — multi-tenant, geo-replication, tiered storage out of the box; ops-heavy (broker + BookKeeper).

> Note: Kafka now runs KRaft-only (ZooKeeper removed in 4.0), narrowing the ops-simplicity gap — but Redpanda/NATS still win on latency and footprint.

## D4.4 Message Queue vs Event Stream vs Pub/Sub

```
"Work needs to get done, don't care which worker does it."
  → Message Queue (SQS, RabbitMQ). One msg → one consumer.

"Something happened, multiple services need to know."
  → Event Stream (Kafka) or Pub/Sub (SNS+SQS). One event → many subscribers.

"Need durable log of everything, replayable."
  → Event Stream (Kafka, Kinesis). Immutable log, replay from any offset.
```

## D4.5 When Is Async Processing Worth It?

**Go async when 4+ of these are true:**
- Operation takes > 1s (PDF generation, ML inference, video encoding)
- Producer and consumer scale independently
- Traffic is bursty (10x spikes)
- Multiple services react to same event
- Need guaranteed delivery with retries
- Services need loose coupling (independent deployment)
- Need audit trails / event replay

**Stay synchronous when:**
- User waiting for immediate result (search, auth, payment confirmation)
- Latency budget < 50ms
- Simple request-response with strong consistency
- Debugging simplicity > scale

---

# Decision 5: Authentication Selection

## D5.1 Session vs JWT Decision Tree

```
Primary client is a browser on your own domain?
├── YES → Need instant revocation (banking, healthcare, admin)?
│   ├── YES → SESSION-BASED (HttpOnly + Secure + SameSite, Redis store)
│   └── NO → Either works; lean Session for simplicity
└── NO (mobile, SPA, third-party, CLI)?
    ├── Multiple diverse clients? → JWT (short-lived access + refresh)
    └── Microservices calling each other? → JWT or mTLS
```

| Scenario | Choose | Why |
|---|---|---|
| Server-rendered web app | **Sessions** | Cookie-based, simple revocation |
| Banking/healthcare/admin | **Sessions** | Instant revocation non-negotiable |
| API-first with mobile + web + CLI | **JWT** | Stateless verification across diverse clients |
| Microservices portable identity | **JWT** | Self-contained, each service verifies locally |
| Serverless/edge functions | **JWT** | No persistent session store needed |

**The Hybrid Pattern (production default):**
> Browser → BFF using **session cookie** → BFF → internal APIs using **JWT access tokens**

## D5.2 API Keys vs Tokens vs OAuth

```
Who is calling?
├── Machine, no user involved
│   ├── Internal service, same trust boundary → API KEY or JWT or mTLS
│   ├── External partner, server-to-server → API KEY (with rotation + scoping)
│   └── Machine acting on its own behalf → OAuth CLIENT CREDENTIALS
├── User (human involved)
│   ├── First-party app → JWT via OAuth Authorization Code + PKCE
│   └── Third-party app accessing user data → OAuth 2.0 (always)
└── Simple public API (weather, geocoding) → API KEY (rate limiting + tracking)
```

> **Key insight**: API keys identify the *application*. OAuth tokens represent a *user's delegation* to the application.

> **Primary user login (2026)**: prefer **passkeys (WebAuthn/FIDO2)** over passwords — phishing-resistant, no shared secret, now supported by Apple/Google/Microsoft and syncable across devices. Offer passwords/OAuth social login as fallback. Passkeys authenticate the user; you still issue a session or JWT afterward.

## D5.3 OAuth 2.0 Flow Selection (Post-OAuth 2.1)

```
User involved?
├── NO (machine-to-machine) → CLIENT CREDENTIALS
└── YES → Can device open a browser?
    ├── YES
    │   ├── Server-side web app → AUTH CODE + PKCE + client_secret
    │   ├── SPA (browser) → AUTH CODE + PKCE (no client secret)
    │   └── Mobile/desktop → AUTH CODE + PKCE (no client secret)
    └── NO (smart TV, CLI, IoT) → DEVICE AUTHORIZATION FLOW

DEPRECATED (never use):
  ✗ Implicit Flow — token leakage via URL fragment
  ✗ Resource Owner Password — user gives password to app
```

## D5.4 SSO: When Is It Worth It?

| SSO Worth It | SSO Not Worth It |
|---|---|
| 5+ applications users access | 1-2 apps with distinct user bases |
| Enterprise employees or B2B customers | Consumer app, single product |
| Significant password support tickets | Minimal support load |
| Enterprise sales (68% require SSO) | No enterprise sales motion |
| HIPAA, SOC2, GDPR mandates | Low regulatory burden |

> **B2B SaaS threshold**: $2M+ ARR targeting enterprise → SSO is table stakes. 97% should buy, not build.

---

# Decision 6: Scaling Strategy Sequencing

## D6.1 The Scaling Ladder (Correct Order)

**Each step is dramatically cheaper than the next. Exhaust it before moving on.**

```
Step 1: QUERY OPTIMIZATION (Free)           Complexity: Low
  └─ Missing indexes, N+1 queries, EXPLAIN ANALYZE
  └─ Solves 60% of database performance issues

Step 2: VERTICAL SCALING ($)                Complexity: Low
  └─ More CPU, RAM, faster storage. Zero code changes.

Step 3: CONNECTION POOLING ($)              Complexity: Low
  └─ PgBouncer, ProxySQL. Reduces connections 10-20x.

Step 4: READ REPLICAS ($$)                  Complexity: Low-Med
  └─ Offload 60-90% of reads from primary

Step 5: CACHING ($$)                        Complexity: Medium
  └─ Redis/Memcached for hot data

Step 6: TABLE PARTITIONING ($$)             Complexity: Medium
  └─ Range/hash partitioning for very large tables

Step 7: SHARDING ($$$)                      Complexity: HIGH
  └─ THE NUCLEAR OPTION — most teams never need it
```

## D6.2 Concrete Thresholds

| Traffic Stage | Strategy | Alert Triggers |
|---|---|---|
| 0-10K users | Query optimization, indexing | P95 > 200ms |
| 10K-100K users | Connection pooling, read replicas | Connections > 80% max, CPU > 70% sustained |
| 100K-1M users | Caching (Redis), partitioning | Cache hit ratio < 95%, P95 > 500ms |
| 1M-10M users | Application-level sharding | Write saturation, dataset > 1TB |
| 10M+ users | Global distribution, CDC, specialized stores | Cross-region latency requirements |

## D6.3 When Vertical Scaling Is Actually Right

| Scenario | Why Vertical Wins |
|---|---|
| Single-threaded workloads | Can't be parallelized |
| ACID-critical with complex joins | Distributed transactions are complex and slow |
| Working set > RAM | More RAM = immediate improvement |
| Team < 5 engineers | No bandwidth for distributed systems ops |
| Early-stage product | Simplicity lets you focus on features |
| Predictable, flat load | No need for elastic scale-out |

**Stop vertically scaling when:** Largest instance isn't enough, costs become exponential, need zero-downtime deploys, need fault isolation, traffic is genuinely spiky.

## D6.4 What Is the Actual Bottleneck?

```
READ THROUGHPUT (can't serve enough queries/sec)
├── Same queries repeated → CACHING
├── Diverse queries, 10:1+ read:write → READ REPLICAS
└── Complex aggregations → CQRS (separate read model)

WRITE THROUGHPUT (inserts/updates saturate)
└── SHARDING (only real answer for write scaling)

STORAGE (dataset > single server)
└── SHARDING

LATENCY (individual queries too slow)
├── Hot data → CACHING
├── Complex joins → VERTICAL SCALING (more CPU/RAM)
└── Geographic distance → GLOBAL DISTRIBUTION
```

---

# Decision 7: Architecture Pattern Selection

## D7.1 Monolith vs Microservices

**The single most important factor: team size.**

| Team Size | Recommendation |
|---|---|
| 1-5 engineers | **Monolith** — not enough people to maintain multiple services |
| 5-15 engineers | **Modular Monolith** — structure for future extraction |
| 15-50 engineers | **Selective Microservices** — extract only where proven need |
| 50+ engineers | **Full Microservices** — team autonomy becomes critical |

**The single most important question:**
> *Do your deployment bottlenecks come from teams blocking each other?*
> - **YES** → Microservices may help (organizational problem)
> - **NO** → Microservices add complexity without solving your problem

**Decision timeline:**
```
Year 0-1: Monolith (learn the domain)
Year 1-2: Modular monolith (define boundaries)
Year 2-3: Extract first services (team > 20 AND pain is measurable)
Year 3+:  Full microservices (organizational scale demands it)
```

**Evidence**: Stack Overflow serves ALL traffic with 9 on-premise web servers running a monolith. Shopify serves 1.3M req/min on a monolith. Netflix uses microservices because they have 2000+ engineers.

## D7.2 Event-Driven Architecture: Necessary vs Overkill

**EDA is appropriate when:**
- Genuinely async workflows (order → inventory → shipping → notification)
- High-throughput (> hundreds of req/sec)
- Multiple consumers need the same event
- Loose coupling is a real requirement
- Mature observability + operational tooling exists

**EDA is overkill when:**
- Message volume < 100 events/day
- Need immediate consistency ("is my order confirmed?")
- Operation must be atomic (money transfer — compensating transactions are dramatically more complex)

## D7.3 CQRS / Event Sourcing: When It Adds Value

**CQRS justified when (check 3+):**
- [ ] Read and write patterns are **dramatically** different
- [ ] Multiple read patterns hard to serve from single model
- [ ] Performance requires optimized, denormalized read stores
- [ ] Team can manage eventual consistency + projection complexity

**Event Sourcing justified when (check 3+):**
- [ ] Genuine audit/compliance requirements (SOX, HIPAA, GDPR)
- [ ] Need temporal queries ("what was state at time X?")
- [ ] Domain has causal logic (outcomes depend on prior events)
- [ ] Event-driven integration where event log is natural source of truth
- [ ] Process is collaborative (multiple parties interact)
- [ ] Process changes frequently (replay events with new rules)

**The 90/10 Rule:**
> Traditional CRUD for 90%+ of applications. Event sourcing for specific domains (financial, audit-critical). Consider emitting events WITHOUT full event sourcing — events for integration, traditional DB for state.

**Simple alternatives:**
- Audit without event sourcing → temporal tables (PostgreSQL, SQL Server)
- Read/write separation without full CQRS → separate reporting schema in same DB

## D7.4 Saga vs 2PC: Distributed Transactions

```
Transaction within a single service/database?
├── YES → LOCAL TRANSACTION (plain ACID). Done.
└── NO (spans multiple services)
    ├── Short-lived, same trust boundary, XA support? → 2PC acceptable
    └── Otherwise → SAGA (default for microservices)
```

| Dimension | 2PC | Saga |
|---|---|---|
| Consistency | Strong atomic commit | Eventual, with compensations |
| Blocking | Yes (holds locks) | No (each step commits independently) |
| Duration | Short-lived only (seconds) | Long-running OK (minutes to hours) |
| Scalability | Poor | Good (decentralized) |
| Use when | 2-3 resources, same trust boundary | Microservices, heterogeneous systems |

**Saga sub-decision:**
- **Orchestration**: Complex branching, compliance-heavy → central coordinator manages flow
- **Choreography**: Simple, linear, high-throughput → services react to events independently

---

# Decision Meta-Framework

> When facing any system design decision, ask in this order:

1. **What is the actual constraint?** (Don't solve problems you don't have)
2. **What is the simplest thing that works?** (Start boring, upgrade when pain is measurable)
3. **What are the team's operational capabilities?** (Complexity requires operational maturity)
4. **What is the cost of being wrong?** (Reversibility matters more than optimality)

## Quick Reference: Defaults & Escalation Triggers

| Decision | Default | Escalate When |
|---|---|---|
| Database | PostgreSQL | Key-based at 100K+ QPS → DynamoDB; Write-heavy > 100K/s → Cassandra |
| API protocol | REST | Multiple client shapes → GraphQL; Internal low-latency → gRPC |
| Real-time | SSE | Client sends data → WebSocket |
| Caching pattern | Cache-aside + TTL | Read-after-write → Write-through; Write-heavy → Write-behind |
| Cache layer | Redis | Add CDN when global; Add L1 when >10 instances |
| Eviction | LRU | Stable hotspots → LFU; Always add TTL |
| Message broker | SQS (AWS) / RabbitMQ | Need replay → Kafka; Need >100K msg/s → Kafka |
| Auth | Sessions (browser) | Multi-client → JWT; Third-party access → OAuth |
| Architecture | Monolith | Team > 20 AND deployment bottlenecks → Microservices |
| Transactions | Local ACID | Cross-service → Saga; Same trust boundary → 2PC |

> **The universal principle**: Start with the simplest option that works. Add complexity only when you feel concrete pain. Switching later is always possible. Starting with too much complexity is hard to undo.

---

# Quick Reference: System Design Interview Checklist

When designing any system, cover these areas:

1. **Requirements** - Functional + non-functional
2. **Capacity estimation** - DAU, QPS, storage, bandwidth
3. **API design** - Endpoints, methods, payloads
4. **Data model** - Schema, SQL vs NoSQL decision (use Decision 1)
5. **High-level architecture** - Components, data flow (use Decision 7)
6. **Deep dive** - Caching (Decision 3), sharding (Decision 1.5), messaging (Decision 4)
7. **Trade-offs** - Justify every decision using decision frameworks above
8. **Bottlenecks** - Identify and address (use Decision 6)
9. **Monitoring** - Metrics, alerts, dashboards
10. **Scale** - How the system grows 10x, 100x (use Decision 6)
