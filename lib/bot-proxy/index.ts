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
          Host: `${privateIp}:${MOLTBOT_GATEWAY_PORT}`,
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

  modified = modified.replace(/\.\/assets\//g, `/api/bots/${botId}/ui/assets/`)
  modified = modified.replace(/\.\/favicon\.ico/g, `/api/bots/${botId}/ui/favicon.ico`)

  const injectionScript = `
<script>
  window.__POCKETMOLT_CONFIG__ = {
    gatewayToken: "${gatewayToken}",
    wsUrl: "/ws/bots/${botId}/"
  };
  window.__CLAWDBOT_CONTROL_UI_BASE_PATH__ = "";
  
  (function() {
    var OriginalWebSocket = window.WebSocket;
    window.WebSocket = function(url, protocols) {
      if (url.includes(':18789') || url.match(/^wss?:\\/\\/[^/]+\\/?$/)) {
        var proxyUrl = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        url = proxyUrl + '//' + window.location.host + '/ws/bots/${botId}/';
      }
      return new OriginalWebSocket(url, protocols);
    };
    window.WebSocket.prototype = OriginalWebSocket.prototype;
    window.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
    window.WebSocket.OPEN = OriginalWebSocket.OPEN;
    window.WebSocket.CLOSING = OriginalWebSocket.CLOSING;
    window.WebSocket.CLOSED = OriginalWebSocket.CLOSED;
  })();
</script>
`
  modified = modified.replace('</head>', injectionScript + '</head>')

  return modified
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
