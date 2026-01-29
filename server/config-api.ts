import { createMTLSServer } from '../lib/mtls-server'
import { handleConfigRequest } from '../lib/config-api/handler'

const CONFIG_API_PORT = parseInt(process.env.CONFIG_API_PORT || '8443')

async function main() {
  console.log('Starting PocketMolt Config API (mTLS)...')

  await createMTLSServer(handleConfigRequest, CONFIG_API_PORT)

  console.log(`Config API ready on port ${CONFIG_API_PORT}`)
  console.log('Only accessible via mTLS from bot servers in private network')
}

main().catch((error) => {
  console.error('Failed to start Config API:', error)
  process.exit(1)
})
