import https from 'https'
import { IncomingMessage, ServerResponse } from 'http'
import { getActiveCA } from './crypto/ca'
import { extractBotIdFromCert, verifyCertificate } from './crypto/certificates'

export interface MTLSRequest extends IncomingMessage {
  botId?: string
}

type RequestHandler = (req: MTLSRequest, res: ServerResponse) => Promise<void>

export async function createMTLSServer(
  handler: RequestHandler,
  port: number = 8443
): Promise<https.Server> {
  const ca = await getActiveCA()

  const server = https.createServer(
    {
      key: ca.serverKey,
      cert: ca.serverCert,
      ca: ca.caCert,
      requestCert: true,
      rejectUnauthorized: false,
    },
    async (req: MTLSRequest, res) => {
      console.log(`[mTLS] ${req.method} ${req.url}`)
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const socket = req.socket as any
        const clientCert = socket.getPeerCertificate()

        if (!clientCert || !clientCert.raw) {
          console.log('[mTLS] No client certificate')
          res.writeHead(401)
          res.end('Client certificate required')
          return
        }

        const certPem = `-----BEGIN CERTIFICATE-----\n${clientCert.raw.toString('base64').match(/.{1,64}/g)?.join('\n')}\n-----END CERTIFICATE-----`

        if (!verifyCertificate(certPem, ca.caCert)) {
          console.log('[mTLS] Certificate verification failed')
          res.writeHead(401)
          res.end('Invalid client certificate')
          return
        }

        const botId = extractBotIdFromCert(certPem)
        if (!botId) {
          console.log('[mTLS] Could not extract botId from cert')
          res.writeHead(401)
          res.end('Invalid certificate subject')
          return
        }

        console.log(`[mTLS] Authenticated bot: ${botId}`)
        req.botId = botId
        await handler(req, res)
      } catch (error) {
        console.error('[mTLS] Server error:', error)
        res.writeHead(500)
        res.end('Internal server error')
      }
    }
  )

  return new Promise((resolve) => {
    server.on('error', (err) => {
      console.error('[mTLS] Server error:', err)
    })
    
    server.on('tlsClientError', (err) => {
      console.error('[mTLS] TLS client error:', err)
    })

    server.listen(port, '0.0.0.0', () => {
      console.log(`mTLS server listening on port ${port}`)
      resolve(server)
    })
  })
}
