import { hetzner, HetznerNetwork, HetznerFirewall } from '@/lib/hetzner'

const NETWORK_NAME = 'pocketmolt-private'
const NETWORK_IP_RANGE = '10.0.0.0/16'
const SUBNET_IP_RANGE = '10.0.0.0/24'
const NETWORK_ZONE = 'eu-central'
const FIREWALL_NAME = 'pocketmolt-bots'

const BACKEND_IP = '10.0.0.2'

interface NetworkInfrastructure {
  network: HetznerNetwork
  firewall: HetznerFirewall
}

export async function getOrCreateNetworkInfrastructure(): Promise<NetworkInfrastructure> {
  const network = await getOrCreateNetwork()
  const firewall = await getOrCreateFirewall()
  return { network, firewall }
}

async function getOrCreateNetwork(): Promise<HetznerNetwork> {
  const existing = await hetzner.networks.getByName(NETWORK_NAME)
  if (existing) {
    console.log(`Using existing network: ${NETWORK_NAME} (${existing.id})`)
    return existing
  }

  console.log(`Creating new network: ${NETWORK_NAME}`)
  const { network } = await hetzner.networks.create({
    name: NETWORK_NAME,
    ip_range: NETWORK_IP_RANGE,
    labels: { service: 'pocketmolt' },
    subnets: [
      {
        type: 'cloud',
        ip_range: SUBNET_IP_RANGE,
        network_zone: NETWORK_ZONE,
      },
    ],
  })

  console.log(`Created network ${network.id} with IP range ${network.ip_range}`)
  return network
}

async function getOrCreateFirewall(): Promise<HetznerFirewall> {
  const existing = await hetzner.firewalls.getByName(FIREWALL_NAME)
  if (existing) {
    console.log(`Using existing firewall: ${FIREWALL_NAME} (${existing.id})`)
    return existing
  }

  console.log(`Creating new firewall: ${FIREWALL_NAME}`)
  const { firewall } = await hetzner.firewalls.create({
    name: FIREWALL_NAME,
    labels: { service: 'pocketmolt' },
    rules: [
      {
        description: 'Allow SSH',
        direction: 'in',
        source_ips: ['0.0.0.0/0', '::/0'],
        protocol: 'tcp',
        port: '22',
      },
      {
        description: 'Allow ping from private network',
        direction: 'in',
        source_ips: [NETWORK_IP_RANGE],
        protocol: 'icmp',
      },
      {
        description: 'Allow private network traffic',
        direction: 'in',
        source_ips: [NETWORK_IP_RANGE],
        protocol: 'tcp',
        port: '1-65535',
      },
    ],
  })

  console.log(`Created firewall ${firewall.id}`)
  return firewall
}

export async function attachServerToInfrastructure(serverId: number): Promise<string> {
  const { network, firewall } = await getOrCreateNetworkInfrastructure()

  const { action: attachAction } = await hetzner.networks.attachServer(serverId, {
    network: network.id,
  })
  await hetzner.actions.wait(attachAction.id)
  console.log(`Server ${serverId} attached to network ${network.id}`)

  const { actions: firewallActions } = await hetzner.firewalls.applyToServer(
    firewall.id,
    serverId
  )
  if (firewallActions.length > 0) {
    await hetzner.actions.wait(firewallActions[0].id)
  }
  console.log(`Firewall ${firewall.id} applied to server ${serverId}`)

  const { server } = await hetzner.servers.get(serverId)
  const privateNet = server.private_net.find((pn) => pn.network === network.id)

  if (!privateNet) {
    throw new Error(`Server ${serverId} not found in network ${network.id}`)
  }

  console.log(`Server ${serverId} assigned private IP ${privateNet.ip}`)
  return privateNet.ip
}

export { NETWORK_NAME, NETWORK_IP_RANGE, BACKEND_IP }
