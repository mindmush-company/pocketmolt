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
      rejectUnauthorized: true,
    },
    async (req: MTLSRequest, res) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const socket = req.socket as any
        const clientCert = socket.getPeerCertificate()

        if (!clientCert || !clientCert.raw) {
          res.writeHead(401)
          res.end('Client certificate required')
          return
        }

        const certPem = `-----BEGIN CERTIFICATE-----\n${clientCert.raw.toString('base64').match(/.{1,64}/g)?.join('\n')}\n-----END CERTIFICATE-----`

        if (!verifyCertificate(certPem, ca.caCert)) {
          res.writeHead(401)
          res.end('Invalid client certificate')
          return
        }

        const botId = extractBotIdFromCert(certPem)
        if (!botId) {
          res.writeHead(401)
          res.end('Invalid certificate subject')
          return
        }

        req.botId = botId
        await handler(req, res)
      } catch (error) {
        console.error('mTLS server error:', error)
        res.writeHead(500)
        res.end('Internal server error')
      }
    }
  )

  return new Promise((resolve) => {
    server.listen(port, '0.0.0.0', () => {
      console.log(`mTLS server listening on port ${port}`)
      resolve(server)
    })
  })
}
