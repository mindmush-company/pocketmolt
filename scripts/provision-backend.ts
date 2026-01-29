/**
 * Provision the PocketMolt backend server
 * Run: npx tsx scripts/provision-backend.ts
 *
 * This creates a Hetzner VPS in the private network to run:
 * - Next.js application (port 3000)
 * - mTLS Config API (port 8443)
 */
import 'dotenv/config'
import { hetzner } from '../lib/hetzner'
import { getOrCreateNetworkInfrastructure } from '../lib/provisioning/network'

const BACKEND_SERVER_NAME = 'pocketmolt-backend'
const BACKEND_SERVER_TYPE = 'cx23'
const BACKEND_DATACENTER = 'nbg1'
const BACKEND_IMAGE = 'ubuntu-22.04'
const BACKEND_PRIVATE_IP = '10.0.0.2'

async function getOrCreateSSHKey() {
  const keyName = 'pocketmolt-master'
  const publicKey = process.env.HETZNER_SSH_PUBLIC_KEY
  if (!publicKey) {
    throw new Error('HETZNER_SSH_PUBLIC_KEY environment variable required')
  }

  const existing = await hetzner.sshKeys.getByName(keyName)
  if (existing) {
    return existing
  }

  const { ssh_keys } = await hetzner.sshKeys.list()
  const envKeyParts = publicKey.trim().split(' ').slice(0, 2).join(' ')
  const matchByKey = ssh_keys.find((k) => {
    const apiKeyParts = k.public_key?.trim().split(' ').slice(0, 2).join(' ')
    return apiKeyParts === envKeyParts
  })
  if (matchByKey) {
    console.log(`Found existing SSH key with name: ${matchByKey.name}`)
    return matchByKey
  }

  const { ssh_key } = await hetzner.sshKeys.create({
    name: keyName,
    public_key: publicKey,
    labels: { service: 'pocketmolt' },
  })
  return ssh_key
}

function generateBackendCloudInit(): string {
  return `#cloud-config
package_update: true
package_upgrade: true

packages:
  - curl
  - ca-certificates
  - gnupg
  - lsb-release
  - git
  - nginx

runcmd:
  - mkdir -p /opt/pocketmolt
  - mkdir -p /var/log/pocketmolt

  # Install Docker
  - curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
  - echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
  - apt-get update
  - apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

  # Install Node.js 22
  - curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  - apt-get install -y nodejs

  # Enable Docker
  - systemctl enable docker
  - systemctl start docker

  - echo "PocketMolt backend provisioned at $(date)" >> /var/log/pocketmolt/init.log

write_files:
  - path: /opt/pocketmolt/README.md
    permissions: '0644'
    content: |
      # PocketMolt Backend Server
      
      This server runs:
      - Next.js application (port 3000)
      - mTLS Config API (port 8443)
      
      Deploy with:
      1. Clone the repository to /opt/pocketmolt/app
      2. Copy .env.production with secrets
      3. Run: docker compose up -d

final_message: "PocketMolt backend server ready"
`
}

async function provisionBackend() {
  console.log('Provisioning PocketMolt backend server...')

  const existingServers = await hetzner.servers.list({ name: BACKEND_SERVER_NAME })
  const existing = existingServers.servers.find((s) => s.name === BACKEND_SERVER_NAME)

  if (existing) {
    console.log(`Backend server already exists: ${existing.id} (${existing.public_net.ipv4?.ip})`)
    return existing
  }

  const sshKey = await getOrCreateSSHKey()
  console.log(`Using SSH key: ${sshKey.name}`)

  const { network } = await getOrCreateNetworkInfrastructure()
  console.log(`Using network: ${network.name} (${network.id})`)

  const cloudInit = generateBackendCloudInit()

  const { server, action } = await hetzner.servers.create({
    name: BACKEND_SERVER_NAME,
    server_type: BACKEND_SERVER_TYPE,
    image: BACKEND_IMAGE,
    location: BACKEND_DATACENTER,
    ssh_keys: [sshKey.id],
    labels: {
      service: 'pocketmolt',
      role: 'backend',
    },
    user_data: cloudInit,
    start_after_create: true,
  })

  console.log(`Server ${server.id} created, waiting...`)
  await hetzner.actions.wait(action.id, { timeoutMs: 5 * 60 * 1000 })

  const runningServer = await hetzner.servers.waitForRunning(server.id, {
    timeoutMs: 5 * 60 * 1000,
  })

  console.log(`Server running at ${runningServer.public_net.ipv4?.ip}`)

  const { action: attachAction } = await hetzner.networks.attachServer(server.id, {
    network: network.id,
    ip: BACKEND_PRIVATE_IP,
  })
  await hetzner.actions.wait(attachAction.id)

  console.log(`Server attached to private network with IP ${BACKEND_PRIVATE_IP}`)

  console.log('\n=== Backend Server Provisioned ===')
  console.log(`Public IP: ${runningServer.public_net.ipv4?.ip}`)
  console.log(`Private IP: ${BACKEND_PRIVATE_IP}`)
  console.log(`Server ID: ${server.id}`)
  console.log('\nNext steps:')
  console.log('1. SSH into the server: ssh root@' + runningServer.public_net.ipv4?.ip)
  console.log('2. Clone the PocketMolt repository')
  console.log('3. Copy environment variables')
  console.log('4. Run docker compose up -d')

  return runningServer
}

provisionBackend().catch((error) => {
  console.error('Provisioning failed:', error)
  process.exit(1)
})
