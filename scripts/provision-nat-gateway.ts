#!/usr/bin/env npx tsx
/**
 * Provision a NAT gateway server for PocketMolt
 * Usage: pnpm tsx scripts/provision-nat-gateway.ts [--name <name>] [--ip <private-ip>]
 */
import 'dotenv/config'
import { provisionNatGateway, NAT_GATEWAY_IP } from '../lib/provisioning/nat-gateway'

async function main() {
  const args = process.argv.slice(2)

  let name = 'gw-1'
  let privateIp = NAT_GATEWAY_IP

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--name' && args[i + 1]) {
      name = args[i + 1]
      i++
    } else if (args[i] === '--ip' && args[i + 1]) {
      privateIp = args[i + 1]
      i++
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
Usage: pnpm tsx scripts/provision-nat-gateway.ts [options]

Options:
  --name <name>     Gateway name (default: gw-1)
  --ip <ip>         Private IP address (default: 10.0.0.1)
  --help, -h        Show this help message

Example:
  pnpm tsx scripts/provision-nat-gateway.ts --name gw-1 --ip 10.0.0.1
`)
      process.exit(0)
    }
  }

  console.log(`\n========================================`)
  console.log(`  Provisioning NAT Gateway`)
  console.log(`========================================`)
  console.log(`  Name:       ${name}`)
  console.log(`  Private IP: ${privateIp}`)
  console.log(`========================================\n`)

  try {
    const gateway = await provisionNatGateway(name, privateIp)

    console.log(`\n========================================`)
    console.log(`  NAT Gateway Provisioned Successfully`)
    console.log(`========================================`)
    console.log(`  ID:          ${gateway.id}`)
    console.log(`  Name:        ${gateway.name}`)
    console.log(`  Private IP:  ${gateway.privateIp}`)
    console.log(`  Public IP:   ${gateway.publicIp}`)
    console.log(`  Status:      ${gateway.status}`)
    console.log(`  Hetzner ID:  ${gateway.hetznerServerId}`)
    console.log(`========================================`)
    console.log(`\nSSH access: ssh root@${gateway.publicIp}`)
    console.log(`\nNext steps:`)
    console.log(`  1. Wait ~2 minutes for cloud-init to complete`)
    console.log(`  2. Verify NAT is working: ssh root@${gateway.publicIp} "iptables -t nat -L -v"`)
    console.log(`  3. New bot servers will now route through this gateway`)
    console.log(``)

  } catch (error) {
    console.error(`\n❌ Failed to provision NAT gateway:`, error)
    process.exit(1)
  }
}

main()
