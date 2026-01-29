import http from 'http'

export interface BotHealthStatus {
  status: 'healthy' | 'unhealthy' | 'unreachable'
  gateway: boolean
  moltbotService: 'active' | 'inactive' | 'unknown'
  uptime?: string
  lastChecked: string
  error?: string
}

const HEALTH_CHECK_TIMEOUT_MS = 5000
const MOLTBOT_GATEWAY_PORT = 18789

export async function checkBotHealth(privateIp: string): Promise<BotHealthStatus> {
  const lastChecked = new Date().toISOString()

  const gatewayHealth = await checkGatewayHealth(privateIp)

  if (!gatewayHealth.reachable) {
    return {
      status: 'unreachable',
      gateway: false,
      moltbotService: 'unknown',
      lastChecked,
      error: gatewayHealth.error,
    }
  }

  return {
    status: 'healthy',
    gateway: true,
    moltbotService: 'active',
    uptime: gatewayHealth.uptime,
    lastChecked,
  }
}

async function checkGatewayHealth(
  privateIp: string
): Promise<{ reachable: boolean; uptime?: string; error?: string }> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ reachable: false, error: 'Connection timeout' })
    }, HEALTH_CHECK_TIMEOUT_MS)

    const req = http.request(
      {
        hostname: privateIp,
        port: MOLTBOT_GATEWAY_PORT,
        path: '/',
        method: 'GET',
        timeout: HEALTH_CHECK_TIMEOUT_MS,
      },
      (res) => {
        clearTimeout(timeout)
        let data = ''
        res.on('data', (chunk: Buffer) => (data += chunk))
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve({ reachable: true })
          } else {
            resolve({ reachable: false, error: `HTTP ${res.statusCode}` })
          }
        })
      }
    )

    req.on('error', (err: Error) => {
      clearTimeout(timeout)
      resolve({ reachable: false, error: err.message })
    })

    req.on('timeout', () => {
      req.destroy()
      clearTimeout(timeout)
      resolve({ reachable: false, error: 'Request timeout' })
    })

    req.end()
  })
}
