const HETZNER_API_BASE = 'https://api.hetzner.cloud/v1'

const FIVE_MINUTES_MS = 5 * 60 * 1000
const TWO_SECONDS_MS = 2000
const THREE_SECONDS_MS = 3000

export interface HetznerServer {
  id: number
  name: string
  status: 'running' | 'initializing' | 'starting' | 'stopping' | 'off' | 'deleting' | 'migrating' | 'rebuilding' | 'unknown'
  public_net: {
    ipv4: {
      ip: string
    } | null
    ipv6: {
      ip: string
    } | null
  }
  private_net: Array<{
    network: number
    ip: string
    alias_ips: string[]
    mac_address: string
  }>
  server_type: {
    name: string
    description: string
  }
  datacenter: {
    name: string
    location: {
      name: string
      city: string
    }
  }
  image: {
    name: string
    type: string
  } | null
  labels: Record<string, string>
  created: string
}

export interface HetznerSSHKey {
  id: number
  name: string
  fingerprint: string
  public_key: string
  labels: Record<string, string>
  created: string
}

export interface HetznerNetwork {
  id: number
  name: string
  ip_range: string
  subnets: HetznerSubnet[]
  routes: HetznerRoute[]
  servers: number[]
  labels: Record<string, string>
  created: string
}

export interface HetznerSubnet {
  type: 'cloud' | 'server' | 'vswitch'
  ip_range: string
  network_zone: string
  gateway: string
}

export interface HetznerRoute {
  destination: string
  gateway: string
}

export interface CreateNetworkRequest {
  name: string
  ip_range: string
  labels?: Record<string, string>
  subnets?: Array<{
    type: 'cloud' | 'server' | 'vswitch'
    ip_range: string
    network_zone: string
  }>
}

export interface AttachToNetworkRequest {
  network: number
  ip?: string
  alias_ips?: string[]
}

export interface HetznerFirewall {
  id: number
  name: string
  rules: HetznerFirewallRule[]
  applied_to: HetznerFirewallAppliedTo[]
  labels: Record<string, string>
  created: string
}

export interface HetznerFirewallRule {
  description?: string
  direction: 'in' | 'out'
  source_ips?: string[]
  destination_ips?: string[]
  protocol: 'tcp' | 'udp' | 'icmp' | 'esp' | 'gre'
  port?: string
}

export interface HetznerFirewallAppliedTo {
  type: 'server' | 'label_selector'
  server?: { id: number }
  label_selector?: { selector: string }
}

export interface CreateFirewallRequest {
  name: string
  labels?: Record<string, string>
  rules?: HetznerFirewallRule[]
  apply_to?: HetznerFirewallAppliedTo[]
}

export interface HetznerAction {
  id: number
  command: string
  status: 'running' | 'success' | 'error'
  progress: number
  started: string
  finished: string | null
  error: {
    code: string
    message: string
  } | null
}

export interface CreateServerPublicNet {
  enable_ipv4?: boolean
  enable_ipv6?: boolean
}

export interface CreateServerRequest {
  name: string
  server_type: string
  image: string
  location?: string
  datacenter?: string
  ssh_keys?: (string | number)[]
  labels?: Record<string, string>
  user_data?: string
  start_after_create?: boolean
  public_net?: CreateServerPublicNet
  networks?: number[]
}

export interface CreateServerResponse {
  server: HetznerServer
  action: HetznerAction
  root_password: string | null
}

export interface HetznerError {
  code: string
  message: string
}

export interface HetznerAPIError extends Error {
  code: string
  statusCode: number
}

class HetznerClient {
  private token: string

  constructor(token: string) {
    this.token = token
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    const url = `${HETZNER_API_BASE}${endpoint}`

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const data = await response.json()

    if (!response.ok) {
      const error = data.error as HetznerError
      const apiError = new Error(error?.message || 'Hetzner API error') as HetznerAPIError
      apiError.code = error?.code || 'unknown'
      apiError.statusCode = response.status
      throw apiError
    }

    return data as T
  }

  async createServer(params: CreateServerRequest): Promise<CreateServerResponse> {
    return this.request<CreateServerResponse>('POST', '/servers', params)
  }

  async getServer(id: number): Promise<{ server: HetznerServer }> {
    return this.request<{ server: HetznerServer }>('GET', `/servers/${id}`)
  }

  async deleteServer(id: number): Promise<{ action: HetznerAction }> {
    return this.request<{ action: HetznerAction }>('DELETE', `/servers/${id}`)
  }

  async listServers(params?: {
    label_selector?: string
    name?: string
  }): Promise<{ servers: HetznerServer[] }> {
    const searchParams = new URLSearchParams()
    if (params?.label_selector) searchParams.set('label_selector', params.label_selector)
    if (params?.name) searchParams.set('name', params.name)
    const query = searchParams.toString()
    return this.request<{ servers: HetznerServer[] }>(
      'GET',
      `/servers${query ? `?${query}` : ''}`
    )
  }

  async createSSHKey(params: {
    name: string
    public_key: string
    labels?: Record<string, string>
  }): Promise<{ ssh_key: HetznerSSHKey }> {
    return this.request<{ ssh_key: HetznerSSHKey }>('POST', '/ssh_keys', params)
  }

  async getSSHKey(id: number): Promise<{ ssh_key: HetznerSSHKey }> {
    return this.request<{ ssh_key: HetznerSSHKey }>('GET', `/ssh_keys/${id}`)
  }

  async getSSHKeyByName(name: string): Promise<HetznerSSHKey | null> {
    const response = await this.request<{ ssh_keys: HetznerSSHKey[] }>(
      'GET',
      `/ssh_keys?name=${encodeURIComponent(name)}`
    )
    return response.ssh_keys.find((key) => key.name === name) || null
  }

  async listSSHKeys(): Promise<{ ssh_keys: HetznerSSHKey[] }> {
    return this.request<{ ssh_keys: HetznerSSHKey[] }>('GET', '/ssh_keys')
  }

  async deleteSSHKey(id: number): Promise<void> {
    await this.request<void>('DELETE', `/ssh_keys/${id}`)
  }

  async getAction(id: number): Promise<{ action: HetznerAction }> {
    return this.request<{ action: HetznerAction }>('GET', `/actions/${id}`)
  }

  async waitForAction(
    actionId: number,
    options?: { timeoutMs?: number; intervalMs?: number }
  ): Promise<HetznerAction> {
    const timeout = options?.timeoutMs ?? FIVE_MINUTES_MS
    const interval = options?.intervalMs ?? TWO_SECONDS_MS
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      const { action } = await this.getAction(actionId)

      if (action.status === 'success') {
        return action
      }

      if (action.status === 'error') {
        throw new Error(
          `Action failed: ${action.error?.message || 'Unknown error'}`
        )
      }

      await new Promise((resolve) => setTimeout(resolve, interval))
    }

    throw new Error(`Timeout waiting for action ${actionId} to complete`)
  }

  async waitForServerRunning(
    serverId: number,
    options?: { timeoutMs?: number; intervalMs?: number }
  ): Promise<HetznerServer> {
    const timeout = options?.timeoutMs ?? FIVE_MINUTES_MS
    const interval = options?.intervalMs ?? THREE_SECONDS_MS
    const startTime = Date.now()
    let sawOff = false

    while (Date.now() - startTime < timeout) {
      const { server } = await this.getServer(serverId)

      if (server.status === 'running') {
        return server
      }

      if (server.status === 'off') {
        if (!sawOff) {
          sawOff = true
          console.log(`Server ${serverId} is off, attempting to power on...`)
          try {
            await this.powerOnServer(serverId)
          } catch (e) {
            console.warn(`Failed to power on server ${serverId}:`, e)
          }
        }
      }

      if (server.status === 'unknown') {
        throw new Error(`Server entered unexpected status: ${server.status}`)
      }

      await new Promise((resolve) => setTimeout(resolve, interval))
    }

    throw new Error(`Timeout waiting for server ${serverId} to start`)
  }

  async powerOnServer(id: number): Promise<{ action: HetznerAction }> {
    return this.request<{ action: HetznerAction }>('POST', `/servers/${id}/actions/poweron`)
  }

  async powerOffServer(id: number): Promise<{ action: HetznerAction }> {
    return this.request<{ action: HetznerAction }>('POST', `/servers/${id}/actions/poweroff`)
  }

  async rebootServer(id: number): Promise<{ action: HetznerAction }> {
    return this.request<{ action: HetznerAction }>('POST', `/servers/${id}/actions/reboot`)
  }

  async createNetwork(params: CreateNetworkRequest): Promise<{ network: HetznerNetwork }> {
    return this.request<{ network: HetznerNetwork }>('POST', '/networks', params)
  }

  async getNetwork(id: number): Promise<{ network: HetznerNetwork }> {
    return this.request<{ network: HetznerNetwork }>('GET', `/networks/${id}`)
  }

  async getNetworkByName(name: string): Promise<HetznerNetwork | null> {
    const response = await this.request<{ networks: HetznerNetwork[] }>(
      'GET',
      `/networks?name=${encodeURIComponent(name)}`
    )
    return response.networks.find((net) => net.name === name) || null
  }

  async deleteNetwork(id: number): Promise<void> {
    await this.request<void>('DELETE', `/networks/${id}`)
  }

  async attachServerToNetwork(
    serverId: number,
    params: AttachToNetworkRequest
  ): Promise<{ action: HetznerAction }> {
    return this.request<{ action: HetznerAction }>(
      'POST',
      `/servers/${serverId}/actions/attach_to_network`,
      params
    )
  }

  async detachServerFromNetwork(
    serverId: number,
    networkId: number
  ): Promise<{ action: HetznerAction }> {
    return this.request<{ action: HetznerAction }>(
      'POST',
      `/servers/${serverId}/actions/detach_from_network`,
      { network: networkId }
    )
  }

  async addNetworkRoute(
    networkId: number,
    destination: string,
    gateway: string
  ): Promise<{ action: HetznerAction }> {
    return this.request<{ action: HetznerAction }>(
      'POST',
      `/networks/${networkId}/actions/add_route`,
      { destination, gateway }
    )
  }

  async deleteNetworkRoute(
    networkId: number,
    destination: string,
    gateway: string
  ): Promise<{ action: HetznerAction }> {
    return this.request<{ action: HetznerAction }>(
      'POST',
      `/networks/${networkId}/actions/delete_route`,
      { destination, gateway }
    )
  }

  async createFirewall(
    params: CreateFirewallRequest
  ): Promise<{ firewall: HetznerFirewall; actions: HetznerAction[] }> {
    return this.request<{ firewall: HetznerFirewall; actions: HetznerAction[] }>(
      'POST',
      '/firewalls',
      params
    )
  }

  async getFirewall(id: number): Promise<{ firewall: HetznerFirewall }> {
    return this.request<{ firewall: HetznerFirewall }>('GET', `/firewalls/${id}`)
  }

  async getFirewallByName(name: string): Promise<HetznerFirewall | null> {
    const response = await this.request<{ firewalls: HetznerFirewall[] }>(
      'GET',
      `/firewalls?name=${encodeURIComponent(name)}`
    )
    return response.firewalls.find((fw) => fw.name === name) || null
  }

  async deleteFirewall(id: number): Promise<void> {
    await this.request<void>('DELETE', `/firewalls/${id}`)
  }

  async applyFirewallToServer(
    firewallId: number,
    serverId: number
  ): Promise<{ actions: HetznerAction[] }> {
    return this.request<{ actions: HetznerAction[] }>(
      'POST',
      `/firewalls/${firewallId}/actions/apply_to_resources`,
      { apply_to: [{ type: 'server', server: { id: serverId } }] }
    )
  }
}

let hetznerClient: HetznerClient | null = null

export function getHetzner(): HetznerClient {
  if (!hetznerClient) {
    const token = process.env.HETZNER_API_TOKEN
    if (!token) {
      throw new Error('HETZNER_API_TOKEN environment variable is not set')
    }
    hetznerClient = new HetznerClient(token)
  }
  return hetznerClient
}

export const hetzner = {
  get servers() {
    return {
      create: (params: CreateServerRequest) => getHetzner().createServer(params),
      get: (id: number) => getHetzner().getServer(id),
      delete: (id: number) => getHetzner().deleteServer(id),
      list: (params?: { label_selector?: string; name?: string }) =>
        getHetzner().listServers(params),
      waitForRunning: (
        serverId: number,
        options?: { timeoutMs?: number; intervalMs?: number }
      ) => getHetzner().waitForServerRunning(serverId, options),
      powerOn: (id: number) => getHetzner().powerOnServer(id),
      powerOff: (id: number) => getHetzner().powerOffServer(id),
      reboot: (id: number) => getHetzner().rebootServer(id),
    }
  },
  get sshKeys() {
    return {
      create: (params: { name: string; public_key: string; labels?: Record<string, string> }) =>
        getHetzner().createSSHKey(params),
      get: (id: number) => getHetzner().getSSHKey(id),
      getByName: (name: string) => getHetzner().getSSHKeyByName(name),
      list: () => getHetzner().listSSHKeys(),
      delete: (id: number) => getHetzner().deleteSSHKey(id),
    }
  },
  get networks() {
    return {
      create: (params: CreateNetworkRequest) => getHetzner().createNetwork(params),
      get: (id: number) => getHetzner().getNetwork(id),
      getByName: (name: string) => getHetzner().getNetworkByName(name),
      delete: (id: number) => getHetzner().deleteNetwork(id),
      attachServer: (serverId: number, params: AttachToNetworkRequest) =>
        getHetzner().attachServerToNetwork(serverId, params),
      detachServer: (serverId: number, networkId: number) =>
        getHetzner().detachServerFromNetwork(serverId, networkId),
      addRoute: (networkId: number, destination: string, gateway: string) =>
        getHetzner().addNetworkRoute(networkId, destination, gateway),
      deleteRoute: (networkId: number, destination: string, gateway: string) =>
        getHetzner().deleteNetworkRoute(networkId, destination, gateway),
    }
  },
  get firewalls() {
    return {
      create: (params: CreateFirewallRequest) => getHetzner().createFirewall(params),
      get: (id: number) => getHetzner().getFirewall(id),
      getByName: (name: string) => getHetzner().getFirewallByName(name),
      delete: (id: number) => getHetzner().deleteFirewall(id),
      applyToServer: (firewallId: number, serverId: number) =>
        getHetzner().applyFirewallToServer(firewallId, serverId),
    }
  },
  get actions() {
    return {
      get: (id: number) => getHetzner().getAction(id),
      wait: (actionId: number, options?: { timeoutMs?: number; intervalMs?: number }) =>
        getHetzner().waitForAction(actionId, options),
    }
  },
}

export default getHetzner
