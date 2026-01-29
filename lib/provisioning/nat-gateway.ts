import { createAdminClient } from '@/lib/supabase/admin'
import { hetzner } from '@/lib/hetzner'
import { getOrCreateNetworkInfrastructure, NETWORK_IP_RANGE } from './network'

const NAT_GATEWAY_SERVER_TYPE = 'cax11'
const NAT_GATEWAY_IMAGE = 'ubuntu-22.04'
const NAT_GATEWAY_DATACENTER = 'nbg1'
const DEFAULT_MAX_BOTS = 100

export const NAT_GATEWAY_IP = '10.0.0.254'

export interface NatGateway {
  id: string
  name: string
  hetznerServerId: string
  privateIp: string
  publicIp: string | null
  status: 'provisioning' | 'active' | 'inactive' | 'failed'
  botCount: number
  maxBots: number
  healthStatus: string
  lastHealthCheckAt: Date | null
  createdAt: Date
}

function generateNatGatewayCloudInit(): string {
  return `#cloud-config
package_update: true
packages:
  - iptables-persistent

write_files:
  - path: /etc/sysctl.d/99-ip-forward.conf
    content: |
      net.ipv4.ip_forward=1
      net.netfilter.nf_conntrack_max=131072

  - path: /etc/networkd-dispatcher/routable.d/50-masquerade
    permissions: '0755'
    content: |
      #!/bin/bash
      iptables -t nat -C POSTROUTING -s '${NETWORK_IP_RANGE}' -o eth0 -j MASQUERADE 2>/dev/null || \\
        iptables -t nat -A POSTROUTING -s '${NETWORK_IP_RANGE}' -o eth0 -j MASQUERADE
      iptables -C FORWARD -i eth0 -o ens10 -m state --state RELATED,ESTABLISHED -j ACCEPT 2>/dev/null || \\
        iptables -A FORWARD -i eth0 -o ens10 -m state --state RELATED,ESTABLISHED -j ACCEPT
      iptables -C FORWARD -i ens10 -o eth0 -j ACCEPT 2>/dev/null || \\
        iptables -A FORWARD -i ens10 -o eth0 -j ACCEPT

  - path: /etc/systemd/resolved.conf.d/dns.conf
    content: |
      [Resolve]
      DNS=185.12.64.1 185.12.64.2
      FallbackDNS=8.8.8.8 1.1.1.1
      Domains=~.

runcmd:
  - sysctl -p /etc/sysctl.d/99-ip-forward.conf
  - /etc/networkd-dispatcher/routable.d/50-masquerade
  - netfilter-persistent save
  - systemctl restart systemd-resolved
  - echo "NAT gateway setup complete"
`
}

async function getSSHKey(): Promise<{ id: number }> {
  const existingKey = await hetzner.sshKeys.getByName('pocketmolt@system')
  if (existingKey) {
    return { id: existingKey.id }
  }
  
  const { ssh_keys } = await hetzner.sshKeys.list()
  if (ssh_keys.length > 0) {
    return { id: ssh_keys[0].id }
  }
  
  throw new Error('No SSH key found for NAT gateway provisioning')
}

export async function provisionNatGateway(
  name: string,
  privateIp: string
): Promise<NatGateway> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any
  
  console.log(`Provisioning NAT gateway: ${name} at ${privateIp}`)
  
  const { data: insertedGateway, error: insertError } = await supabase
    .from('nat_gateways')
    .insert({
      name,
      hetzner_server_id: 'pending',
      private_ip: privateIp,
      status: 'provisioning',
      bot_count: 0,
      max_bots: DEFAULT_MAX_BOTS,
    })
    .select()
    .single()
  
  if (insertError) {
    throw new Error(`Failed to create NAT gateway record: ${insertError.message}`)
  }
  
  try {
    const sshKey = await getSSHKey()
    const { network, firewall } = await getOrCreateNetworkInfrastructure()
    
    const cloudInit = generateNatGatewayCloudInit()
    
    const { server, action } = await hetzner.servers.create({
      name: `pocketmolt-nat-${name}`,
      server_type: NAT_GATEWAY_SERVER_TYPE,
      image: NAT_GATEWAY_IMAGE,
      location: NAT_GATEWAY_DATACENTER,
      ssh_keys: [sshKey.id],
      labels: {
        service: 'pocketmolt',
        role: 'nat-gateway',
        gateway_name: name,
      },
      user_data: cloudInit,
      start_after_create: true,
    })
    
    console.log(`NAT gateway server ${server.id} created, waiting for action ${action.id}`)
    
    await hetzner.actions.wait(action.id, { timeoutMs: 5 * 60 * 1000 })
    
    const runningServer = await hetzner.servers.waitForRunning(server.id, {
      timeoutMs: 5 * 60 * 1000,
    })
    
    const publicIp = runningServer.public_net.ipv4?.ip || null
    console.log(`NAT gateway server ${server.id} running at public IP ${publicIp}`)
    
    const { action: attachAction } = await hetzner.networks.attachServer(server.id, {
      network: network.id,
      ip: privateIp,
    })
    await hetzner.actions.wait(attachAction.id)
    console.log(`NAT gateway attached to network with private IP ${privateIp}`)
    
    const { actions: firewallActions } = await hetzner.firewalls.applyToServer(
      firewall.id,
      server.id
    )
    if (firewallActions.length > 0) {
      await hetzner.actions.wait(firewallActions[0].id)
    }
    
    const existingRoutes = network.routes || []
    const hasDefaultRoute = existingRoutes.some(r => r.destination === '0.0.0.0/0')
    
    if (!hasDefaultRoute) {
      console.log(`Adding default route via ${privateIp} to network`)
      const { action: routeAction } = await hetzner.networks.addRoute(
        network.id,
        '0.0.0.0/0',
        privateIp
      )
      await hetzner.actions.wait(routeAction.id)
    }
    
    const { data: updatedGateway, error: updateError } = await supabase
      .from('nat_gateways')
      .update({
        hetzner_server_id: String(server.id),
        public_ip: publicIp,
        status: 'active',
        health_status: 'healthy',
        last_health_check_at: new Date().toISOString(),
      })
      .eq('id', insertedGateway.id)
      .select()
      .single()
    
    if (updateError) {
      throw new Error(`Failed to update NAT gateway record: ${updateError.message}`)
    }
    
    console.log(`NAT gateway ${name} provisioned successfully`)
    
    return mapGatewayRecord(updatedGateway)
    
  } catch (error) {
    await supabase
      .from('nat_gateways')
      .update({ status: 'failed' })
      .eq('id', insertedGateway.id)
    
    throw error
  }
}

export async function getActiveNatGateway(): Promise<NatGateway | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any
  
  const { data, error } = await supabase
    .from('nat_gateways')
    .select('*')
    .eq('status', 'active')
    .order('bot_count', { ascending: true })
    .limit(1)
    .maybeSingle()
  
  if (error) {
    console.error('Failed to get active NAT gateway:', error)
    return null
  }
  
  if (!data) {
    return null
  }
  
  if (data.bot_count >= data.max_bots) {
    return null
  }
  
  return mapGatewayRecord(data)
}

export async function ensureNatGateway(): Promise<NatGateway> {
  const existing = await getActiveNatGateway()
  if (existing) {
    return existing
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any
  const { count } = await supabase
    .from('nat_gateways')
    .select('*', { count: 'exact', head: true })
  
  const gatewayNumber = (count || 0) + 1
  const name = `gw-${gatewayNumber}`
  const privateIp = gatewayNumber === 1 ? NAT_GATEWAY_IP : `10.0.${gatewayNumber - 1}.254`
  
  return await provisionNatGateway(name, privateIp)
}

export async function incrementBotCount(gatewayId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any
  
  const { data: current } = await supabase
    .from('nat_gateways')
    .select('bot_count')
    .eq('id', gatewayId)
    .single()
  
  if (current) {
    await supabase
      .from('nat_gateways')
      .update({ bot_count: current.bot_count + 1 })
      .eq('id', gatewayId)
  }
}

export async function decrementBotCount(gatewayId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any
  
  const { data: current } = await supabase
    .from('nat_gateways')
    .select('bot_count')
    .eq('id', gatewayId)
    .single()
  
  if (current && current.bot_count > 0) {
    await supabase
      .from('nat_gateways')
      .update({ bot_count: current.bot_count - 1 })
      .eq('id', gatewayId)
  }
}

export async function getNatGatewayById(id: string): Promise<NatGateway | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any
  
  const { data, error } = await supabase
    .from('nat_gateways')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error || !data) {
    return null
  }
  
  return mapGatewayRecord(data)
}

interface NatGatewayRecord {
  id: string
  name: string
  hetzner_server_id: string
  private_ip: string
  public_ip: string | null
  status: 'provisioning' | 'active' | 'inactive' | 'failed'
  bot_count: number
  max_bots: number
  health_status: string
  last_health_check_at: string | null
  created_at: string
}

function mapGatewayRecord(record: NatGatewayRecord): NatGateway {
  return {
    id: record.id,
    name: record.name,
    hetznerServerId: record.hetzner_server_id,
    privateIp: record.private_ip,
    publicIp: record.public_ip,
    status: record.status,
    botCount: record.bot_count,
    maxBots: record.max_bots,
    healthStatus: record.health_status,
    lastHealthCheckAt: record.last_health_check_at ? new Date(record.last_health_check_at) : null,
    createdAt: new Date(record.created_at),
  }
}
