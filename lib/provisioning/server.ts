import { hetzner, HetznerServer, HetznerSSHKey } from '@/lib/hetzner'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateCloudInitWithCerts } from './cloud-init'
import { attachServerToInfrastructure } from './network'
import { generateBotCertificateFromCA } from '@/lib/crypto/ca'
import { encrypt } from '@/lib/crypto/encryption'

const SSH_KEY_NAME = 'pocketmolt-master'
const SERVER_TYPE = 'cx23'
const DATACENTER_LOCATION = 'nbg1'
const SERVER_IMAGE = 'ubuntu-22.04'

interface BotRecord {
  id: string
  name: string
  user_id: string
  status: string
  hetzner_server_id: string | null
}

export interface ProvisionResult {
  success: boolean
  serverId?: number
  serverIp?: string
  privateIp?: string
  error?: string
}

function extractSSHKeyWithoutComment(key: string): string {
  const parts = key.trim().split(/\s+/)
  return parts.slice(0, 2).join(' ')
}

async function getOrCreateSSHKey(): Promise<HetznerSSHKey> {
  const existingKey = await hetzner.sshKeys.getByName(SSH_KEY_NAME)
  if (existingKey) {
    return existingKey
  }

  const publicKey = process.env.HETZNER_SSH_PUBLIC_KEY
  if (!publicKey) {
    throw new Error(
      'HETZNER_SSH_PUBLIC_KEY environment variable is required. ' +
        'Generate with: ssh-keygen -t ed25519 -f pocketmolt-master'
    )
  }

  const publicKeyWithoutComment = extractSSHKeyWithoutComment(publicKey)

  const { ssh_keys: allKeys } = await hetzner.sshKeys.list()
  const existingByPublicKey = allKeys.find(
    (k) => extractSSHKeyWithoutComment(k.public_key) === publicKeyWithoutComment
  )
  if (existingByPublicKey) {
    console.log(`Found existing SSH key "${existingByPublicKey.name}" with matching public key`)
    return existingByPublicKey
  }

  const { ssh_key } = await hetzner.sshKeys.create({
    name: SSH_KEY_NAME,
    public_key: publicKey,
    labels: { service: 'pocketmolt' },
  })

  return ssh_key
}

interface BotStatusUpdate {
  serverId?: number
  privateIp?: string
  clientCert?: string
  clientKeyEncrypted?: string
}

async function updateBotStatus(
  botId: string,
  status: 'starting' | 'running' | 'stopped' | 'failed',
  updates?: BotStatusUpdate
): Promise<void> {
  const supabase = createAdminClient()
  const updateData: {
    status: string
    hetzner_server_id?: string
    private_ip?: string
    client_cert?: string
    client_key_encrypted?: string
  } = { status }

  if (updates?.serverId !== undefined) {
    updateData.hetzner_server_id = String(updates.serverId)
  }
  if (updates?.privateIp !== undefined) {
    updateData.private_ip = updates.privateIp
  }
  if (updates?.clientCert !== undefined) {
    updateData.client_cert = updates.clientCert
  }
  if (updates?.clientKeyEncrypted !== undefined) {
    updateData.client_key_encrypted = updates.clientKeyEncrypted
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('bots')
    .update(updateData)
    .eq('id', botId)

  if (error) {
    console.error(`Failed to update bot ${botId} status to ${status}:`, error)
    throw error
  }
}

async function cleanupFailedServer(serverId: number | undefined): Promise<void> {
  if (!serverId) return

  try {
    await hetzner.servers.delete(serverId)
    console.log(`Cleaned up failed server ${serverId}`)
  } catch (error) {
    console.error(`Failed to cleanup server ${serverId}:`, error)
  }
}

export async function provisionServer(
  botId: string,
  botName: string,
  userId: string
): Promise<ProvisionResult> {
  let createdServerId: number | undefined

  try {
    console.log(`Starting provisioning for bot ${botId} (${botName})`)

    console.log(`Generating mTLS certificates for bot ${botId}`)
    const { certificate, privateKey, caCertificate } = await generateBotCertificateFromCA(botId)
    const encryptedPrivateKey = encrypt(privateKey)

    const sshKey = await getOrCreateSSHKey()
    console.log(`Using SSH key: ${sshKey.name} (${sshKey.id})`)

    const cloudInit = generateCloudInitWithCerts({
      botId,
      botName,
      privateIp: '',
      clientCert: certificate,
      clientKey: privateKey,
      caCert: caCertificate,
    })

    const serverName = `pocketmolt-${botId.slice(0, 8)}`
    const { server, action } = await hetzner.servers.create({
      name: serverName,
      server_type: SERVER_TYPE,
      image: SERVER_IMAGE,
      location: DATACENTER_LOCATION,
      ssh_keys: [sshKey.id],
      labels: {
        bot_id: botId,
        user_id: userId,
        service: 'pocketmolt',
      },
      user_data: cloudInit,
      start_after_create: true,
    })

    createdServerId = server.id
    console.log(`Server ${server.id} created, waiting for action ${action.id}`)

    await hetzner.actions.wait(action.id, { timeoutMs: 5 * 60 * 1000 })
    console.log(`Server creation action completed`)

    const runningServer = await hetzner.servers.waitForRunning(server.id, {
      timeoutMs: 5 * 60 * 1000,
    })

    const serverIp = runningServer.public_net.ipv4?.ip
    console.log(`Server ${server.id} is running at ${serverIp}`)

    const privateIp = await attachServerToInfrastructure(server.id)
    console.log(`Server ${server.id} has private IP ${privateIp}`)

    await updateBotStatus(botId, 'running', {
      serverId: server.id,
      privateIp,
      clientCert: certificate,
      clientKeyEncrypted: encryptedPrivateKey,
    })

    return {
      success: true,
      serverId: server.id,
      serverIp,
      privateIp,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`Provisioning failed for bot ${botId}:`, errorMessage)

    await cleanupFailedServer(createdServerId)

    try {
      await updateBotStatus(botId, 'failed')
    } catch (updateError) {
      console.error('Failed to update bot status to failed:', updateError)
    }

    return {
      success: false,
      error: errorMessage,
    }
  }
}

export async function deprovisionServer(botId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createAdminClient() as any

    const { data, error: fetchError } = await supabase
      .from('bots')
      .select('hetzner_server_id')
      .eq('id', botId)
      .single()

    const bot = data as Pick<BotRecord, 'hetzner_server_id'> | null

    if (fetchError || !bot) {
      throw new Error(`Bot ${botId} not found`)
    }

    if (!bot.hetzner_server_id) {
      console.log(`Bot ${botId} has no Hetzner server to deprovision`)
      return { success: true }
    }

    const serverId = parseInt(bot.hetzner_server_id, 10)
    if (isNaN(serverId)) {
      throw new Error(`Invalid server ID: ${bot.hetzner_server_id}`)
    }

    await hetzner.servers.delete(serverId)
    console.log(`Deleted server ${serverId} for bot ${botId}`)

    await supabase
      .from('bots')
      .update({ hetzner_server_id: null, status: 'stopped' })
      .eq('id', botId)

    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`Deprovisioning failed for bot ${botId}:`, errorMessage)
    return { success: false, error: errorMessage }
  }
}

export async function getServerStatus(botId: string): Promise<HetznerServer | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  const { data } = await supabase
    .from('bots')
    .select('hetzner_server_id')
    .eq('id', botId)
    .single()

  const bot = data as Pick<BotRecord, 'hetzner_server_id'> | null

  if (!bot?.hetzner_server_id) {
    return null
  }

  const serverId = parseInt(bot.hetzner_server_id, 10)
  if (isNaN(serverId)) {
    return null
  }

  try {
    const { server } = await hetzner.servers.get(serverId)
    return server
  } catch {
    return null
  }
}
