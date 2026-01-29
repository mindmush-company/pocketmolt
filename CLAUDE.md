# PocketMolt

A managed hosting platform that lets non-technical users deploy and run [MoltBot](https://www.molt.bot/) instances without needing to understand servers, Docker, or command lines.

## What is MoltBot?

MoltBot is an open-source personal AI assistant that:
- Connects to messaging apps (Telegram, WhatsApp, Discord)
- Can actually *do* things - manage email, calendar, check you in for flights
- Runs on your own hardware with persistent memory and context
- Uses your own API keys (Anthropic, OpenAI) so you control costs
- Is extensible via custom "skills" that the bot can build itself

**The Problem**: MoltBot is powerful but requires technical setup (VPS, Docker, SSH, Linux knowledge). PocketMolt eliminates that barrier.

## How PocketMolt Works

```
User Flow:
1. Sign up with email/OAuth (Supabase Auth)
2. Pay €30/month subscription (Stripe)
3. Bot gets created + Hetzner VPS auto-provisioned
4. User provides their API keys + Telegram bot token
5. MoltBot runs 24/7 on their dedicated server
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16+ (App Router, React 19, TypeScript 5) |
| **Styling** | Tailwind CSS v4 + shadcn/ui components |
| **Auth** | Supabase Auth (email/password + OAuth) |
| **Database** | Supabase (PostgreSQL + Row Level Security) |
| **Payments** | Stripe (subscriptions, webhooks) |
| **Infrastructure** | Hetzner Cloud (CX23 VPS, Ubuntu 22.04, Docker) |
| **Package Manager** | pnpm |

## Project Structure

```
pocketmolt/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth pages (login, signup, forgot-password)
│   ├── api/
│   │   ├── bots/[botId]/         # Bot management endpoints
│   │   │   ├── configure/        # API key configuration
│   │   │   ├── health/           # Health check
│   │   │   ├── logs/             # Log retrieval
│   │   │   ├── restart/          # Restart bot
│   │   │   ├── start/            # Start bot
│   │   │   └── stop/             # Stop bot
│   │   └── webhooks/             # Stripe webhooks
│   ├── dashboard/                # Protected dashboard pages
│   │   ├── bots/[botId]/         # Individual bot management
│   │   └── create/               # Bot creation flow
│   └── page.tsx                  # Landing page
├── components/
│   ├── dashboard/
│   │   ├── bot-actions.tsx       # Start/stop/restart controls
│   │   ├── bot-config-form.tsx   # API key input form
│   │   └── bot-health-status.tsx # Health monitoring widget
│   └── ui/                       # shadcn/ui primitives
├── lib/
│   ├── crypto/
│   │   ├── certificates.ts       # mTLS certificate generation
│   │   ├── encryption.ts         # AES-256-GCM encryption
│   │   └── ca.ts                 # Certificate Authority access
│   ├── health/
│   │   └── bot-health.ts         # Health check logic
│   ├── config-api/
│   │   └── handler.ts            # mTLS config delivery handler
│   ├── provisioning/
│   │   ├── server.ts             # VPS provisioning with certs
│   │   ├── cloud-init.ts         # Cloud-init with MoltBot install
│   │   └── network.ts            # Private network management
│   ├── hetzner.ts                # Hetzner Cloud API client
│   ├── mtls-server.ts            # mTLS HTTPS server
│   ├── stripe.ts                 # Stripe SDK wrapper
│   └── supabase/
│       ├── client.ts             # Browser client
│       ├── server.ts             # Server client (SSR)
│       ├── admin.ts              # Service role client
│       └── database.types.ts     # TypeScript types
├── server/
│   └── config-api.ts             # Standalone mTLS config API
├── scripts/
│   ├── init-ca.ts                # Initialize Certificate Authority
│   └── provision-backend.ts      # Provision backend server
├── docker/
│   ├── docker-compose.yml        # Production deployment
│   ├── Dockerfile.nextjs         # Next.js container
│   ├── Dockerfile.config-api     # Config API container
│   └── nginx.conf                # Reverse proxy config
├── middleware.ts                 # Route protection
└── supabase/
    ├── config.toml               # Local Supabase config
    └── migrations/               # SQL migrations
```

## Database Schema

Three main tables with Row Level Security:

### `profiles`
```sql
- id: uuid (FK to auth.users)
- email: text
- stripe_customer_id: text?
- created_at, updated_at
```

### `bots`
```sql
- id: uuid
- user_id: uuid (FK to profiles)
- name: text
- status: 'starting' | 'running' | 'stopped' | 'failed'
- hetzner_server_id: text?
- private_ip: text?                    # Private network IP (10.0.x.x)
- encrypted_api_key: text              # AES-256-GCM encrypted
- telegram_bot_token_encrypted: text
- client_cert: text?                   # mTLS client certificate
- client_key_encrypted: text?          # Encrypted private key
- created_at, updated_at
```

### `subscriptions`
```sql
- id: uuid
- user_id: uuid (FK to profiles)
- bot_id: uuid (FK to bots)
- stripe_subscription_id: text
- status: 'active' | 'past_due' | 'canceled' | 'unpaid'
- current_period_end: timestamp
- cancelled_at: timestamp?
```

### `pocketmolt_ca`
```sql
- id: uuid
- ca_cert: text                        # CA certificate (PEM)
- ca_key_encrypted: text               # Encrypted CA private key
- server_cert: text                    # Backend server certificate
- server_key_encrypted: text           # Encrypted server key
- created_at: timestamp
- expires_at: timestamp
- is_active: boolean                   # Only one active CA
```

## Key Patterns

### 1. Lazy Client Initialization
Stripe and Supabase clients are initialized lazily to avoid build-time failures:
```typescript
let stripeClient: Stripe | null = null
export function getStripe() {
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {...})
  }
  return stripeClient
}
```

### 2. Custom Hetzner API Client
No third-party SDK - direct fetch calls with TypeScript types:
- Server CRUD operations
- SSH key management  
- Action polling (wait for completion)
- Power on/off controls

### 3. Server Provisioning Flow
```
checkout.session.completed webhook
  → Create bot record (status: 'starting')
  → Fire-and-forget provisioning call
    → Generate mTLS client certificate for bot
    → Get/create SSH key ('pocketmolt-master')
    → Create Hetzner server (CX23, Ubuntu 22.04, nbg1)
    → Pass cloud-init with Node.js, MoltBot, certificates
    → Wait for server running (~2-3 min)
    → Attach to private network (get private IP)
    → Store certificate + private IP in database
    → Update bot status to 'running'
    → On failure: cleanup server, set status 'failed'
```

### 4. Cloud-Init Configuration
Servers boot with cloud-init that:
- Installs Node.js 22 and MoltBot globally
- Writes mTLS certificates to `/opt/pocketmolt/certs/`
- Creates fetch-config.sh script (calls mTLS config API)
- Creates systemd service for MoltBot with security hardening
- MoltBot gateway binds to private IP only (port 18789)

### 5. mTLS Configuration Delivery
Bot servers fetch their configuration securely:
```
Bot Server                         PocketMolt Backend
    |                                      |
    |-- mTLS request (client cert) ------->|
    |                                      | Verify cert signed by CA
    |                                      | Extract botId from CN
    |                                      | Decrypt API keys from DB
    |<-- JSON config (API keys, tokens) ---|
    |                                      |
    | Write config to ~/.clawdbot/
    | Start MoltBot service
```

### 6. Middleware Route Protection
```typescript
// Protected: /dashboard/*
// Auth routes redirect logged-in users to dashboard
// Uses Supabase SSR with cookie handling
```

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # For admin operations

# Stripe  
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...          # Monthly subscription price
STRIPE_WEBHOOK_SECRET=whsec_...

# Hetzner
HETZNER_API_TOKEN=
HETZNER_SSH_PUBLIC_KEY=            # ed25519 public key

# Encryption (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY=                    # 64-char hex string (32 bytes)

# Config API
CONFIG_API_PORT=8443               # mTLS config API port

# Internal
PROVISION_API_SECRET=              # Auth for provisioning endpoint
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Common Commands

```bash
pnpm dev          # Start dev server (localhost:3000)
pnpm build        # Production build
pnpm lint         # ESLint

# Supabase Local
supabase start    # Start local Supabase
supabase db reset # Reset with migrations
supabase gen types typescript --local > lib/supabase/database.types.ts
```

## Current Status & TODOs

### Implemented
- [x] Landing page with pricing
- [x] Auth flow (email + OAuth ready)
- [x] Stripe checkout integration
- [x] Webhook handling (subscription events)
- [x] Dashboard with bot listing
- [x] Hetzner server provisioning
- [x] Bot status management (start/stop/restart)
- [x] Individual bot detail pages
- [x] Private network infrastructure (10.0.0.0/16)
- [x] mTLS Certificate Authority
- [x] AES-256-GCM encryption for secrets
- [x] API key configuration UI
- [x] mTLS config delivery API
- [x] MoltBot installation via cloud-init
- [x] Health monitoring endpoint + UI
- [x] Bot lifecycle controls (start/stop/restart)
- [x] Logs endpoint
- [x] Backend deployment scripts (Docker)

### Not Yet Implemented
- [ ] Email notifications
- [ ] Usage analytics dashboard
- [ ] Subscription cancellation flow
- [ ] Bot migration between servers

## Deployment

### Prerequisites
1. Generate encryption key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. Generate SSH keypair:
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/pocketmolt-master -C "pocketmolt"
   ```

3. Set environment variables in `.env.production`

### Step 1: Initialize Certificate Authority
```bash
npx tsx scripts/init-ca.ts
```
Creates mTLS CA and stores encrypted in database.

### Step 2: Provision Backend Server
```bash
npx tsx scripts/provision-backend.ts
```
Creates Hetzner VPS at `10.0.0.2` with Docker installed.

### Step 3: Deploy to Backend
```bash
ssh root@<backend-public-ip>
git clone <repo> /opt/pocketmolt/app
cd /opt/pocketmolt/app
# Copy .env.production
cd docker && docker compose up -d
```

### Step 4: Configure SSL
```bash
apt install certbot
certbot certonly --webroot -w /var/www/certbot -d yourdomain.com
docker compose restart nginx
```

### Deployment Checklist
- [ ] Generate ENCRYPTION_KEY (64 hex chars)
- [ ] Generate SSH keypair
- [ ] Update .env.production with all secrets
- [ ] Run `npx tsx scripts/init-ca.ts`
- [ ] Run `npx tsx scripts/provision-backend.ts`
- [ ] Deploy with `docker compose up -d`
- [ ] Configure SSL with certbot
- [ ] Test checkout flow end-to-end

## Architecture Decisions

1. **Custom Hetzner client over SDK**: Third-party SDKs had <10 weekly downloads and poor TypeScript support. Direct HTTP calls are more maintainable.

2. **Single SSH key for all servers**: MVP approach. Future: per-bot keys for better security isolation.

3. **Service role for admin ops**: Some operations (like webhook-triggered bot creation) need to bypass RLS.

4. **CX23 server type**: €4.35/month (2 vCPU, 4GB RAM, 40GB SSD). Profitable at €30/month subscription.

5. **Fire-and-forget provisioning**: Webhook returns immediately, provisioning runs async. Prevents Stripe webhook timeout.

## Backend ↔ Bot Server Interaction

### Network Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Hetzner Private Network                      │
│                       10.0.0.0/16                               │
│                                                                 │
│  ┌──────────────────┐     ┌──────────────────┐                 │
│  │  Backend Server  │     │   Bot Server 1   │                 │
│  │    10.0.0.2      │     │    10.0.0.3      │                 │
│  │                  │     │                  │                 │
│  │  - Next.js:3000  │     │  - clawdbot:18789│                 │
│  │  - Config:8443   │     │                  │                 │
│  │  - nginx:80,443  │     └──────────────────┘                 │
│  └──────────────────┘     ┌──────────────────┐                 │
│                           │   Bot Server 2   │                 │
│                           │    10.0.0.4      │                 │
│                           │                  │                 │
│                           │  - clawdbot:18789│                 │
│                           └──────────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
```

- **Backend**: Fixed at `10.0.0.2`, runs Next.js app + mTLS Config API
- **Bot servers**: Assigned sequentially (`10.0.0.3`, `10.0.0.4`, etc.)
- **All communication** between backend and bots happens over private network

### Bot Server File Structure

```
/opt/pocketmolt/
├── certs/
│   ├── ca.crt              # CA certificate (verify backend)
│   ├── client.crt          # Bot's mTLS client certificate
│   └── client.key          # Bot's private key (600 perms)
├── bin/
│   ├── fetch-config.sh     # Fetches config from backend via mTLS
│   └── health.sh           # Manual health check script
├── config.json             # Bot metadata (id, name, private_ip)
└── env                     # Environment vars for clawdbot service

/root/.clawdbot/
└── moltbot.json            # Clawdbot configuration (model, channels, gateway)

/etc/systemd/system/
└── pocketmolt-bot.service  # Systemd service definition
```

### Service Configuration

The `pocketmolt-bot.service` runs clawdbot with:
```ini
ExecStartPre=/opt/pocketmolt/bin/fetch-config.sh
ExecStart=/usr/bin/clawdbot gateway --allow-unconfigured --bind lan --token <gateway-token>
EnvironmentFile=/opt/pocketmolt/env
```

**Key flags**:
- `--allow-unconfigured`: Allows headless startup without interactive setup
- `--bind lan`: Binds to all interfaces (required for health checks over private network)
- `--token <token>`: Authentication token for LAN binding

### Environment File (`/opt/pocketmolt/env`)

```bash
ANTHROPIC_API_KEY=sk-ant-api03-...
CLAWDBOT_GATEWAY_TOKEN=<32-byte-hex-token>
```

**Important**: The `fetch-config.sh` script overwrites this file on each service start. It must write BOTH the API key AND the gateway token.

### Health Check Flow

```
Dashboard UI
    │
    ▼
GET /api/bots/{botId}/health  (requires auth)
    │
    ▼
Backend queries bot.private_ip from database
    │
    ▼
HTTP GET http://{private_ip}:18789/  (over private network)
    │
    ▼
Clawdbot returns HTML (Control UI) with 200 OK
    │
    ▼
Dashboard shows "healthy" status
```

**Health check details**:
- Protocol: **HTTP** (not HTTPS) - clawdbot gateway serves HTTP
- Port: **18789**
- Path: `/` (returns Clawdbot Control UI HTML)
- Success: Any 200 response = healthy
- Timeout: 5 seconds

### Configuration Delivery Flow

```
Bot Server starts pocketmolt-bot.service
    │
    ▼
ExecStartPre runs fetch-config.sh
    │
    ▼
curl with mTLS client cert → https://10.0.0.2:8443/config
    │
    ▼
Config API verifies client cert, extracts botId from CN
    │
    ▼
Config API decrypts API keys from database
    │
    ▼
Returns JSON: { agent, channels, apiKeys }
    │
    ▼
fetch-config.sh writes:
  - /root/.clawdbot/moltbot.json (model, channels, gateway config)
  - /opt/pocketmolt/env (ANTHROPIC_API_KEY, CLAWDBOT_GATEWAY_TOKEN)
    │
    ▼
ExecStart launches clawdbot gateway
```

### Timing Considerations

| Event | Duration |
|-------|----------|
| Server provisioning (Hetzner) | ~2-3 minutes |
| Cloud-init completion | ~3-4 minutes |
| **Clawdbot gateway startup** | **~55 seconds** |

**Important**: After a restart or fresh provisioning, health checks will return "unreachable" for about 55 seconds while clawdbot initializes. This is normal.

### SSH Access

```bash
# Backend server
ssh root@<backend-public-ip> -i ~/.ssh/pocketmolt-master

# Bot server (use public IP from Hetzner, not private IP)
ssh root@<bot-public-ip> -i ~/.ssh/pocketmolt-master

# Useful commands on bot server
systemctl status pocketmolt-bot      # Service status
journalctl -u pocketmolt-bot -f      # Follow logs
cat /opt/pocketmolt/env              # Check env vars
cat /root/.clawdbot/moltbot.json     # Check clawdbot config
```

### Rebuild & Deploy Backend

```bash
ssh root@<backend-public-ip> -i ~/.ssh/pocketmolt-master
cd /opt/pocketmolt/app && git pull
cd docker && docker compose build nextjs config-api
docker compose up -d && docker compose restart nginx
```

## Gotchas

1. **Next.js 15+ async cookies**: `await cookies()` - returns Promise now
2. **Stripe v20.x API changes**: `current_period_end` moved to subscription items
3. **Build-time env vars**: Pages using Supabase need `export const dynamic = 'force-dynamic'`
4. **RLS with service role**: Service role bypasses RLS - use carefully
5. **OAuth callback**: Requires Supabase dashboard configuration for each provider
6. **Clawdbot startup delay**: Gateway takes ~55 seconds to start - health checks will fail during this window
7. **fetch-config.sh overwrites env**: Must append gateway token after writing API key, not just write API key

## For AI Assistants

When working on this codebase:

1. **Always use lazy initialization** for SDK clients
2. **Follow existing patterns** - check similar files before adding new ones
3. **Don't suppress TypeScript errors** - no `as any`, `@ts-ignore`
4. **Database changes need migrations** - update `database.types.ts` after
5. **Test webhooks locally**: Use Stripe CLI `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
6. **Check .sisyphus/notepads/** for previous decisions and learnings
