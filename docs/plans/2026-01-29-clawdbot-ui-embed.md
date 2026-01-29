# Clawdbot UI Embed Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Embed the Clawdbot Control UI within the PocketMolt dashboard so users can interact with their bot directly from the browser.

**Architecture:** Two-tier proxy system where Next.js API routes handle HTTP requests (HTML, assets) with authentication, while nginx handles WebSocket proxying with auth subrequests. The UI is served in an iframe with injected gateway token for WebSocket authentication.

**Tech Stack:** Next.js 16+ API Routes, nginx auth_request, WebSocket, iframe

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              User Browser                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    PocketMolt Dashboard                               │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │         iframe src="/api/bots/{botId}/ui"                      │  │  │
│  │  │                                                                 │  │  │
│  │  │     Clawdbot Control UI (fetches via WS proxy)                 │  │  │
│  │  │     WebSocket → wss://adfixum.com/ws/bots/{botId}/             │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        nginx (adfixum.com)                                   │
│                                                                              │
│  /api/bots/*/ui/*  ────────────────► Next.js (HTTP proxy with auth)         │
│  /ws/bots/*/       ────► auth_request ────► Next.js ws-auth endpoint        │
│                               │                                              │
│                               ▼ (if 200)                                     │
│                          WebSocket proxy to bot private IP                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Hetzner Private Network (10.0.0.0/16)                     │
│                                                                              │
│  Backend (10.0.0.2)                    Bot Servers (10.0.0.3+)              │
│  - Next.js:3000                        - clawdbot gateway:18789              │
│  - nginx:80,443                        - Serves HTML, assets                 │
│                                        - WebSocket for chat                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Request Flow

### HTTP (HTML + Assets)
1. Browser requests `/api/bots/{botId}/ui` or `/api/bots/{botId}/ui/assets/*`
2. Next.js API route validates session cookie
3. Verifies user owns the bot
4. Fetches from `http://{private_ip}:18789/{path}`
5. Rewrites URLs in HTML to use proxy paths
6. Injects gateway token into HTML for WebSocket auth
7. Returns proxied response

### WebSocket
1. Browser connects to `wss://adfixum.com/ws/bots/{botId}/`
2. nginx makes auth_request to `/api/bots/{botId}/ws-auth`
3. Next.js validates session, returns bot's private IP in header
4. nginx proxies WebSocket to `ws://{private_ip}:18789/`
5. Browser sends auth token in first WS message

---

## Pre-Implementation: Database Migration

### Task 0: Add gateway_token_encrypted column to bots table

**Why:** The gateway token is currently generated during provisioning but not stored. We need it for WebSocket authentication.

**Files:**
- Create: `supabase/migrations/20260129000000_add_gateway_token.sql`
- Modify: `lib/supabase/database.types.ts` (regenerate)
- Modify: `lib/provisioning/server.ts:140-192`

**Step 1: Create migration file**

```sql
-- supabase/migrations/20260129000000_add_gateway_token.sql
ALTER TABLE bots ADD COLUMN gateway_token_encrypted TEXT;

COMMENT ON COLUMN bots.gateway_token_encrypted IS 'AES-256-GCM encrypted gateway token for WebSocket auth';
```

**Step 2: Update provisioning to store gateway token**

Modify `lib/provisioning/server.ts` around line 187-192. After generating the token at line 140, encrypt and store it:

```typescript
// At line 140, keep existing:
const gatewayToken = crypto.randomBytes(32).toString('hex')

// At line 187-192, add gatewayTokenEncrypted to the update:
await updateBotStatus(botId, 'running', {
  serverId: server.id,
  privateIp,
  clientCert: certificate,
  clientKeyEncrypted: encryptedPrivateKey,
  gatewayTokenEncrypted: encrypt(gatewayToken),  // ADD THIS
})
```

**Step 3: Update updateBotStatus function**

Modify `lib/provisioning/server.ts` around line 69-112:

```typescript
interface BotStatusUpdate {
  serverId?: number
  privateIp?: string
  clientCert?: string
  clientKeyEncrypted?: string
  gatewayTokenEncrypted?: string  // ADD THIS
}

async function updateBotStatus(
  botId: string,
  status: 'starting' | 'running' | 'stopped' | 'failed',
  updates?: BotStatusUpdate
): Promise<void> {
  // ... existing code ...
  
  // ADD after line 100:
  if (updates?.gatewayTokenEncrypted !== undefined) {
    updateData.gateway_token_encrypted = updates.gatewayTokenEncrypted
  }
  
  // ... rest of function
}
```

**Step 4: Regenerate database types**

Run:
```bash
supabase gen types typescript --local > lib/supabase/database.types.ts
```

**Step 5: Apply migration to production**

Run:
```bash
supabase db push
```

**Step 6: Commit**

```bash
git add supabase/migrations/ lib/supabase/database.types.ts lib/provisioning/server.ts
git commit -m "feat: store gateway token in database for UI embedding"
```

---

## Task 1: HTTP Proxy for Clawdbot UI

### Subtask 1.1: Create shared proxy utility

**Files:**
- Create: `lib/bot-proxy/index.ts`

**Step 1: Create the proxy utility**

```typescript
// lib/bot-proxy/index.ts
import http from 'http'

const MOLTBOT_GATEWAY_PORT = 18789
const PROXY_TIMEOUT_MS = 10000

export interface ProxyResult {
  status: number
  headers: Record<string, string>
  body: Buffer
}

export async function proxyToBot(
  privateIp: string,
  path: string,
  method: string = 'GET',
  headers?: Record<string, string>
): Promise<ProxyResult> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Proxy request timeout'))
    }, PROXY_TIMEOUT_MS)

    const req = http.request(
      {
        hostname: privateIp,
        port: MOLTBOT_GATEWAY_PORT,
        path: path || '/',
        method,
        headers: {
          ...headers,
          'Host': `${privateIp}:${MOLTBOT_GATEWAY_PORT}`,
        },
        timeout: PROXY_TIMEOUT_MS,
      },
      (res) => {
        clearTimeout(timeout)
        const chunks: Buffer[] = []

        res.on('data', (chunk: Buffer) => chunks.push(chunk))
        res.on('end', () => {
          const body = Buffer.concat(chunks)
          const responseHeaders: Record<string, string> = {}
          
          // Copy relevant headers
          for (const [key, value] of Object.entries(res.headers)) {
            if (value && typeof value === 'string') {
              responseHeaders[key] = value
            }
          }

          resolve({
            status: res.statusCode || 500,
            headers: responseHeaders,
            body,
          })
        })
      }
    )

    req.on('error', (err) => {
      clearTimeout(timeout)
      reject(err)
    })

    req.on('timeout', () => {
      req.destroy()
      clearTimeout(timeout)
      reject(new Error('Request timeout'))
    })

    req.end()
  })
}

export function rewriteHtmlForProxy(
  html: string,
  botId: string,
  gatewayToken: string
): string {
  let modified = html

  // Rewrite asset paths from ./assets/ to /api/bots/{botId}/ui/assets/
  modified = modified.replace(
    /\.\/assets\//g,
    `/api/bots/${botId}/ui/assets/`
  )

  // Inject gateway token and WebSocket URL before </head>
  const injectionScript = `
<script>
  window.__POCKETMOLT_CONFIG__ = {
    gatewayToken: "${gatewayToken}",
    wsUrl: "${getWsUrl(botId)}"
  };
  // Override WebSocket URL construction
  window.__CLAWDBOT_CONTROL_UI_BASE_PATH__ = "";
  
  // Patch WebSocket to use our proxy
  const OriginalWebSocket = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    // Rewrite ws:// URLs to use our proxy
    if (url.includes(':18789') || url.match(/^wss?:\\/\\/[^/]+\\/?$/)) {
      const proxyUrl = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      url = proxyUrl + '//' + window.location.host + '/ws/bots/${botId}/';
    }
    return new OriginalWebSocket(url, protocols);
  };
  window.WebSocket.prototype = OriginalWebSocket.prototype;
  window.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
  window.WebSocket.OPEN = OriginalWebSocket.OPEN;
  window.WebSocket.CLOSING = OriginalWebSocket.CLOSING;
  window.WebSocket.CLOSED = OriginalWebSocket.CLOSED;
</script>
`
  modified = modified.replace('</head>', injectionScript + '</head>')

  return modified
}

function getWsUrl(botId: string): string {
  // This will be evaluated client-side; we inject the path pattern
  return `/ws/bots/${botId}/`
}

export function getContentType(path: string): string {
  if (path.endsWith('.js')) return 'application/javascript'
  if (path.endsWith('.css')) return 'text/css'
  if (path.endsWith('.html')) return 'text/html'
  if (path.endsWith('.json')) return 'application/json'
  if (path.endsWith('.svg')) return 'image/svg+xml'
  if (path.endsWith('.png')) return 'image/png'
  if (path.endsWith('.ico')) return 'image/x-icon'
  if (path.endsWith('.woff')) return 'font/woff'
  if (path.endsWith('.woff2')) return 'font/woff2'
  return 'application/octet-stream'
}
```

**Step 2: Commit**

```bash
git add lib/bot-proxy/
git commit -m "feat: add bot proxy utility for UI embedding"
```

---

### Subtask 1.2: Create UI proxy API route

**Files:**
- Create: `app/api/bots/[botId]/ui/[[...path]]/route.ts`

**Step 1: Create the route handler**

```typescript
// app/api/bots/[botId]/ui/[[...path]]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto/encryption'
import { proxyToBot, rewriteHtmlForProxy, getContentType } from '@/lib/bot-proxy'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ botId: string; path?: string[] }> }
) {
  const { botId, path: pathSegments } = await params
  const proxyPath = pathSegments ? '/' + pathSegments.join('/') : '/'

  // Authenticate user
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch bot and verify ownership
  const { data: bot, error: botError } = await supabase
    .from('bots')
    .select('id, user_id, status, private_ip, gateway_token_encrypted')
    .eq('id', botId)
    .single()

  if (botError || !bot) {
    return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
  }

  if (bot.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (bot.status !== 'running') {
    return NextResponse.json(
      { error: `Bot is ${bot.status}, cannot access UI` },
      { status: 503 }
    )
  }

  if (!bot.private_ip) {
    return NextResponse.json(
      { error: 'Bot has no private IP assigned' },
      { status: 503 }
    )
  }

  try {
    const result = await proxyToBot(bot.private_ip, proxyPath)

    // For HTML responses, rewrite URLs and inject config
    const contentType = result.headers['content-type'] || ''
    if (contentType.includes('text/html') || proxyPath === '/') {
      const gatewayToken = bot.gateway_token_encrypted
        ? decrypt(bot.gateway_token_encrypted)
        : ''

      const modifiedHtml = rewriteHtmlForProxy(
        result.body.toString('utf-8'),
        botId,
        gatewayToken
      )

      return new NextResponse(modifiedHtml, {
        status: result.status,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Frame-Options': 'SAMEORIGIN',
          'Cache-Control': 'no-store',
        },
      })
    }

    // For assets, proxy with appropriate caching
    const isAsset = proxyPath.startsWith('/assets/')
    return new NextResponse(result.body, {
      status: result.status,
      headers: {
        'Content-Type': getContentType(proxyPath),
        'Cache-Control': isAsset ? 'public, max-age=31536000, immutable' : 'no-store',
      },
    })
  } catch (error) {
    console.error(`UI proxy error for bot ${botId}:`, error)
    return NextResponse.json(
      { error: 'Failed to connect to bot UI' },
      { status: 502 }
    )
  }
}
```

**Step 2: Test manually**

1. Start the dev server: `pnpm dev`
2. Log in to dashboard
3. Navigate to `/api/bots/{your-bot-id}/ui`
4. Should see Clawdbot UI HTML (with asset 404s expected until WS is working)

**Step 3: Commit**

```bash
git add app/api/bots/\[botId\]/ui/
git commit -m "feat: add HTTP proxy for Clawdbot UI"
```

---

## Task 2: WebSocket Auth Endpoint for nginx

**Files:**
- Create: `app/api/bots/[botId]/ws-auth/route.ts`

**Step 1: Create the ws-auth endpoint**

This endpoint is called by nginx's `auth_request` directive. It must:
- Return 200 if authorized (with bot's private IP in a header)
- Return 401/403 if not authorized

```typescript
// app/api/bots/[botId]/ws-auth/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  const { botId } = await params

  // Authenticate user from cookie
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return new NextResponse(null, { status: 401 })
  }

  // Fetch bot and verify ownership
  const { data: bot, error: botError } = await supabase
    .from('bots')
    .select('id, user_id, status, private_ip')
    .eq('id', botId)
    .single()

  if (botError || !bot) {
    return new NextResponse(null, { status: 404 })
  }

  if (bot.user_id !== user.id) {
    return new NextResponse(null, { status: 403 })
  }

  if (bot.status !== 'running' || !bot.private_ip) {
    return new NextResponse(null, { status: 503 })
  }

  // Return 200 with private IP in header for nginx to use
  return new NextResponse(null, {
    status: 200,
    headers: {
      'X-Bot-Private-IP': bot.private_ip,
    },
  })
}
```

**Step 2: Commit**

```bash
git add app/api/bots/\[botId\]/ws-auth/
git commit -m "feat: add WebSocket auth endpoint for nginx"
```

---

## Task 3: Update nginx Configuration

**Files:**
- Modify: `docker/nginx.conf`

**Step 1: Update nginx.conf with WebSocket proxy**

Replace the entire content of `docker/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    # Map for WebSocket upgrade
    map $http_upgrade $connection_upgrade {
        default upgrade;
        '' close;
    }

    upstream nextjs {
        server nextjs:3000;
    }

    server {
        listen 80;
        server_name _;

        # Let's Encrypt challenge
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        # WebSocket proxy for bot UI
        # Pattern: /ws/bots/{botId}/
        location ~ ^/ws/bots/([a-f0-9-]+)/(.*)$ {
            set $bot_id $1;
            set $ws_path $2;

            # Auth subrequest - nginx calls this to validate
            auth_request /internal/ws-auth/$bot_id;
            auth_request_set $bot_ip $upstream_http_x_bot_private_ip;

            # Proxy WebSocket to bot's private IP
            proxy_pass http://$bot_ip:18789/$ws_path$is_args$args;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # WebSocket timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 86400s;
            proxy_read_timeout 86400s;
        }

        # Internal auth endpoint (not directly accessible)
        location ~ ^/internal/ws-auth/([a-f0-9-]+)$ {
            internal;
            proxy_pass http://nextjs/api/bots/$1/ws-auth;
            proxy_pass_request_body off;
            proxy_set_header Content-Length "";
            proxy_set_header X-Original-URI $request_uri;
            proxy_set_header Cookie $http_cookie;
        }

        # All other requests to Next.js
        location / {
            proxy_pass http://nextjs;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }

    # HTTPS server (uncomment after setting up SSL)
    # server {
    #     listen 443 ssl http2;
    #     server_name yourdomain.com;
    #
    #     ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    #     ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    #
    #     # Copy all location blocks from port 80 server here
    # }
}
```

**Step 2: Validate nginx config**

```bash
docker run --rm -v $(pwd)/docker/nginx.conf:/etc/nginx/nginx.conf:ro nginx:alpine nginx -t
```

Expected output:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

**Step 3: Commit**

```bash
git add docker/nginx.conf
git commit -m "feat: add WebSocket proxy with auth subrequest to nginx"
```

---

## Task 4: Add UI Embed Component to Dashboard

**Files:**
- Create: `components/dashboard/bot-ui-embed.tsx`
- Modify: `app/dashboard/bots/[botId]/page.tsx`

### Subtask 4.1: Create the embed component

**Step 1: Create BotUIEmbed component**

```tsx
// components/dashboard/bot-ui-embed.tsx
'use client'

import { useState } from 'react'
import { ExternalLink, Maximize2, Minimize2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface BotUIEmbedProps {
  botId: string
  botStatus: string
  botName: string
}

export function BotUIEmbed({ botId, botStatus, botName }: BotUIEmbedProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  if (botStatus !== 'running') {
    return null
  }

  const uiUrl = `/api/bots/${botId}/ui`

  const handleIframeLoad = () => {
    setIsLoading(false)
    setError(null)
  }

  const handleIframeError = () => {
    setIsLoading(false)
    setError('Failed to load bot UI. The bot may still be starting up.')
  }

  return (
    <Card className={isExpanded ? 'col-span-2' : ''}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">
          Control Panel
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8"
            title={isExpanded ? 'Minimize' : 'Maximize'}
          >
            {isExpanded ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-8 w-8"
            title="Open in new tab"
          >
            <a href={uiUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {error ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            <p>{error}</p>
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                setError(null)
                setIsLoading(true)
              }}
            >
              Try again
            </Button>
          </div>
        ) : (
          <div className="relative">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                <div className="animate-pulse text-sm text-muted-foreground">
                  Loading {botName} Control Panel...
                </div>
              </div>
            )}
            <iframe
              src={uiUrl}
              title={`${botName} Control Panel`}
              className="w-full border-0 rounded-b-lg"
              style={{ height: isExpanded ? '600px' : '400px' }}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

**Step 2: Commit**

```bash
git add components/dashboard/bot-ui-embed.tsx
git commit -m "feat: add BotUIEmbed component"
```

---

### Subtask 4.2: Add embed to bot detail page

**Step 1: Modify bot detail page**

Update `app/dashboard/bots/[botId]/page.tsx`:

Add import at top:
```tsx
import { BotUIEmbed } from "@/components/dashboard/bot-ui-embed"
```

Add the embed component after the health status card (around line 150):

```tsx
      {/* Add after the grid of cards, before closing </div> */}
      
      {bot.status === 'running' && (
        <div className="mt-6">
          <BotUIEmbed
            botId={bot.id}
            botStatus={bot.status}
            botName={bot.name}
          />
        </div>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add app/dashboard/bots/\[botId\]/page.tsx
git commit -m "feat: add Clawdbot UI embed to bot detail page"
```

---

## Task 5: Handle Existing Bots (Backfill Gateway Tokens)

**Problem:** Existing bots were provisioned without storing the gateway token. They need to be re-provisioned or have their token backfilled.

**Files:**
- Create: `scripts/backfill-gateway-tokens.ts`

**Step 1: Create backfill script**

```typescript
// scripts/backfill-gateway-tokens.ts
/**
 * Backfill gateway tokens for existing bots.
 * 
 * For each bot without a gateway token:
 * 1. Generate a new token
 * 2. Store encrypted in database
 * 3. SSH to bot server and update the service
 * 
 * Usage: npx tsx scripts/backfill-gateway-tokens.ts
 */

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { NodeSSH } from 'node-ssh'

// Import from lib (adjust paths as needed when running)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!

function encrypt(plaintext: string): string {
  const key = Buffer.from(ENCRYPTION_KEY, 'hex')
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  let encrypted = cipher.update(plaintext, 'utf8')
  encrypted = Buffer.concat([encrypted, cipher.final()])
  const authTag = cipher.getAuthTag()
  const combined = Buffer.concat([iv, authTag, encrypted])
  return combined.toString('base64')
}

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Find bots without gateway tokens
  const { data: bots, error } = await supabase
    .from('bots')
    .select('id, name, status, hetzner_server_id, private_ip, gateway_token_encrypted')
    .is('gateway_token_encrypted', null)
    .eq('status', 'running')

  if (error) {
    console.error('Failed to fetch bots:', error)
    process.exit(1)
  }

  console.log(`Found ${bots?.length || 0} bots without gateway tokens`)

  for (const bot of bots || []) {
    console.log(`\nProcessing bot ${bot.id} (${bot.name})...`)

    // Generate new token
    const gatewayToken = crypto.randomBytes(32).toString('hex')
    const encrypted = encrypt(gatewayToken)

    // Update database
    const { error: updateError } = await supabase
      .from('bots')
      .update({ gateway_token_encrypted: encrypted })
      .eq('id', bot.id)

    if (updateError) {
      console.error(`Failed to update bot ${bot.id}:`, updateError)
      continue
    }

    console.log(`  ✓ Stored encrypted token in database`)

    // Note: To update the bot server, you would need to:
    // 1. SSH to the server using the Hetzner public IP
    // 2. Update /opt/pocketmolt/env with new CLAWDBOT_GATEWAY_TOKEN
    // 3. Update systemd service with new --token flag
    // 4. Restart the service
    //
    // This is complex and may require the bot to be restarted.
    // For MVP, new bots will work; existing bots may need manual intervention
    // or a full restart via the dashboard (which will re-fetch config).

    console.log(`  ⚠ Bot server not updated - restart bot from dashboard to apply`)
  }

  console.log('\nDone!')
}

main().catch(console.error)
```

**Step 2: Commit**

```bash
git add scripts/backfill-gateway-tokens.ts
git commit -m "feat: add script to backfill gateway tokens for existing bots"
```

---

## Task 6: Production Deployment

### Subtask 6.1: Update docker-compose for production

No changes needed - existing docker-compose.yml works.

### Subtask 6.2: Deploy to production

**Step 1: Push changes**

```bash
git push origin main
```

**Step 2: SSH to backend and deploy**

```bash
ssh root@<backend-public-ip> -i ~/.ssh/pocketmolt-master
cd /opt/pocketmolt/app
git pull
cd docker
docker compose build nextjs
docker compose up -d
docker compose restart nginx
```

**Step 3: Apply database migration**

```bash
# From local machine or backend server with Supabase CLI
supabase db push
```

---

## Test Plan

### Manual Testing Checklist

1. **HTTP Proxy - Unauthorized**
   - Log out of dashboard
   - Visit `/api/bots/{botId}/ui`
   - Expected: 401 Unauthorized JSON response

2. **HTTP Proxy - Wrong Owner**
   - Log in as User A
   - Try to access User B's bot UI
   - Expected: 403 Forbidden

3. **HTTP Proxy - Bot Not Running**
   - Stop a bot from dashboard
   - Try to access its UI
   - Expected: 503 with "Bot is stopped" message

4. **HTTP Proxy - Success**
   - Start a bot
   - Wait for health check to show "healthy"
   - Visit `/api/bots/{botId}/ui`
   - Expected: Clawdbot UI HTML with rewritten asset URLs

5. **Asset Proxy**
   - View page source of proxied UI
   - Verify asset URLs are `/api/bots/{botId}/ui/assets/...`
   - Verify assets load correctly (check Network tab)

6. **WebSocket Proxy**
   - Open bot UI in iframe on dashboard
   - Open browser DevTools Network tab
   - Filter by "WS"
   - Expected: WebSocket connection to `/ws/bots/{botId}/`
   - Expected: Connection establishes successfully

7. **Full Integration**
   - Navigate to bot detail page
   - Verify "Control Panel" card appears
   - Verify iframe loads Clawdbot UI
   - Try interacting with the bot via the UI
   - Expected: Chat works, commands work

8. **Expand/Collapse**
   - Click maximize button
   - Verify iframe expands
   - Click minimize button
   - Verify iframe shrinks

9. **Open in New Tab**
   - Click external link button
   - Expected: Opens `/api/bots/{botId}/ui` in new tab
   - Expected: Full functionality works in standalone tab

---

## Security Checklist

- [x] **Authentication required** - All proxy endpoints check Supabase auth
- [x] **Ownership verification** - User must own the bot to access its UI
- [x] **No private IP exposure** - Browser never sees 10.x.x.x addresses
- [x] **Gateway token encrypted** - Token stored with AES-256-GCM in database
- [x] **iframe sandboxed** - Limited to scripts, same-origin, and forms
- [x] **X-Frame-Options** - Set to SAMEORIGIN on proxied HTML
- [x] **HTTPS for WebSocket** - wss:// used in production
- [x] **nginx internal auth** - ws-auth endpoint marked as internal
- [x] **No credential leakage** - Gateway token only injected for authorized users
- [x] **Rate limiting** - Consider adding rate limiting to proxy endpoints (future)

---

## Rollback Plan

If issues arise:

1. **Revert nginx config:**
   ```bash
   git checkout HEAD~1 -- docker/nginx.conf
   docker compose restart nginx
   ```

2. **Remove UI embed from dashboard:**
   ```bash
   git checkout HEAD~1 -- app/dashboard/bots/\[botId\]/page.tsx
   docker compose build nextjs && docker compose up -d
   ```

3. **Full rollback:**
   ```bash
   git revert HEAD~N  # Where N is number of commits to revert
   ```

---

## Future Improvements

1. **Rate limiting** - Add per-user rate limits on proxy endpoints
2. **Caching** - Cache static assets at nginx level
3. **Error handling** - Better error UI when bot is starting up (55s delay)
4. **Mobile responsive** - Improve iframe behavior on mobile
5. **Dark mode sync** - Pass theme preference to embedded UI
6. **Connection status** - Show WebSocket connection status in UI

---

## File Summary

| Action | File | Description |
|--------|------|-------------|
| Create | `supabase/migrations/20260129000000_add_gateway_token.sql` | Add gateway_token_encrypted column |
| Modify | `lib/supabase/database.types.ts` | Regenerate types |
| Modify | `lib/provisioning/server.ts` | Store gateway token on provision |
| Create | `lib/bot-proxy/index.ts` | Shared proxy utilities |
| Create | `app/api/bots/[botId]/ui/[[...path]]/route.ts` | HTTP proxy for UI |
| Create | `app/api/bots/[botId]/ws-auth/route.ts` | WebSocket auth for nginx |
| Modify | `docker/nginx.conf` | WebSocket proxy with auth |
| Create | `components/dashboard/bot-ui-embed.tsx` | Embed component |
| Modify | `app/dashboard/bots/[botId]/page.tsx` | Add embed to page |
| Create | `scripts/backfill-gateway-tokens.ts` | Backfill existing bots |

---

## Skills & Categories for Each Task

| Task | Category | Recommended Skills |
|------|----------|-------------------|
| Task 0: Database Migration | quick | git-master |
| Task 1.1: Proxy Utility | quick | nodejs-backend-patterns |
| Task 1.2: UI Proxy Route | short | nextjs-app-router-patterns, nodejs-backend-patterns |
| Task 2: WS Auth Endpoint | quick | nextjs-app-router-patterns |
| Task 3: nginx Config | quick | - |
| Task 4.1: Embed Component | short | frontend-ui-ux |
| Task 4.2: Page Integration | quick | nextjs-app-router-patterns |
| Task 5: Backfill Script | short | nodejs-backend-patterns |
| Task 6: Deployment | short | git-master |

**Estimated Total Effort:** Medium (1-2 days)
