import https from 'https'
import { getActiveCA } from '@/lib/crypto/ca'

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

    const req = https.request(
      {
        hostname: privateIp,
        port: MOLTBOT_GATEWAY_PORT,
        path: '/health',
        method: 'GET',
        timeout: HEALTH_CHECK_TIMEOUT_MS,
        rejectUnauthorized: false,
      },
      (res) => {
        clearTimeout(timeout)
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const json = JSON.parse(data)
              resolve({ reachable: true, uptime: json.uptime })
            } catch {
              resolve({ reachable: true })
            }
          } else {
            resolve({ reachable: false, error: `HTTP ${res.statusCode}` })
          }
        })
      }
    )

    req.on('error', (err) => {
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

export async function checkBotHealthViaMTLS(
  privateIp: string,
  clientCert: string,
  clientKey: string
): Promise<BotHealthStatus> {
  const lastChecked = new Date().toISOString()

  try {
    const ca = await getActiveCA()

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          status: 'unreachable',
          gateway: false,
          moltbotService: 'unknown',
          lastChecked,
          error: 'Connection timeout',
        })
      }, HEALTH_CHECK_TIMEOUT_MS)

      const req = https.request(
        {
          hostname: privateIp,
          port: MOLTBOT_GATEWAY_PORT,
          path: '/health',
          method: 'GET',
          key: clientKey,
          cert: clientCert,
          ca: ca.caCert,
          timeout: HEALTH_CHECK_TIMEOUT_MS,
        },
        (res) => {
          clearTimeout(timeout)
          let data = ''
          res.on('data', (chunk) => (data += chunk))
          res.on('end', () => {
            if (res.statusCode === 200) {
              try {
                const json = JSON.parse(data)
                resolve({
                  status: 'healthy',
                  gateway: true,
                  moltbotService: 'active',
                  uptime: json.uptime,
                  lastChecked,
                })
              } catch {
                resolve({
                  status: 'healthy',
                  gateway: true,
                  moltbotService: 'active',
                  lastChecked,
                })
              }
            } else {
              resolve({
                status: 'unhealthy',
                gateway: false,
                moltbotService: 'unknown',
                lastChecked,
                error: `HTTP ${res.statusCode}`,
              })
            }
          })
        }
      )

      req.on('error', (err) => {
        clearTimeout(timeout)
        resolve({
          status: 'unreachable',
          gateway: false,
          moltbotService: 'unknown',
          lastChecked,
          error: err.message,
        })
      })

      req.end()
    })
  } catch (error) {
    return {
      status: 'unreachable',
      gateway: false,
      moltbotService: 'unknown',
      lastChecked,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
