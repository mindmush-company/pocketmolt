import { BACKEND_IP } from './network'

const CONFIG_API_PORT = 8443

interface CloudInitOptions {
  botId: string
  botName: string
  privateIp: string
  clientCert: string
  clientKey: string
  caCert: string
}

export function generateCloudInit(botId: string, botName: string): string {
  return generateCloudInitWithCerts({
    botId,
    botName,
    privateIp: '',
    clientCert: '',
    clientKey: '',
    caCert: '',
  })
}

export function generateCloudInitWithCerts(options: CloudInitOptions): string {
  const { botId, botName, privateIp, clientCert, clientKey, caCert } = options

  const configApiUrl = `https://${BACKEND_IP}:${CONFIG_API_PORT}`

  const escapedClientCert = clientCert.replace(/\n/g, '\\n')
  const escapedClientKey = clientKey.replace(/\n/g, '\\n')
  const escapedCaCert = caCert.replace(/\n/g, '\\n')

  return `#cloud-config
package_update: true
package_upgrade: true

packages:
  - curl
  - jq
  - ca-certificates

runcmd:
  - mkdir -p /opt/pocketmolt/certs
  - mkdir -p /opt/pocketmolt/bin
  - mkdir -p /var/log/pocketmolt

  # Install Node.js 22
  - curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  - apt-get install -y nodejs

  # Install MoltBot
  - npm install -g moltbot@latest

  # Write certificates
  - echo -e "${escapedClientCert}" > /opt/pocketmolt/certs/client.crt
  - echo -e "${escapedClientKey}" > /opt/pocketmolt/certs/client.key
  - echo -e "${escapedCaCert}" > /opt/pocketmolt/certs/ca.crt
  - chmod 600 /opt/pocketmolt/certs/client.key
  - chmod 644 /opt/pocketmolt/certs/client.crt
  - chmod 644 /opt/pocketmolt/certs/ca.crt

  # Create config directory
  - mkdir -p ~/.clawdbot

  # Fetch config and start MoltBot
  - /opt/pocketmolt/bin/fetch-config.sh
  - systemctl daemon-reload
  - systemctl enable pocketmolt-bot
  - systemctl start pocketmolt-bot

  - echo "MoltBot provisioning complete at $(date)" >> /var/log/pocketmolt/init.log

write_files:
  - path: /opt/pocketmolt/config.json
    permissions: '0644'
    content: |
      {
        "bot_id": "${botId}",
        "bot_name": "${botName}",
        "private_ip": "${privateIp}",
        "config_api": "${configApiUrl}",
        "provisioned_at": "$(date -Iseconds)"
      }

  - path: /opt/pocketmolt/bin/fetch-config.sh
    permissions: '0755'
    content: |
      #!/bin/bash
      set -e
      
      CONFIG_API="${configApiUrl}"
      CERT_DIR="/opt/pocketmolt/certs"
      MOLTBOT_CONFIG="$HOME/.clawdbot/moltbot.json"
      
      echo "Fetching configuration from $CONFIG_API..."
      
      RESPONSE=$(curl -s --fail \\
        --cacert "$CERT_DIR/ca.crt" \\
        --cert "$CERT_DIR/client.crt" \\
        --key "$CERT_DIR/client.key" \\
        "$CONFIG_API/config")
      
      if [ $? -ne 0 ]; then
        echo "Failed to fetch configuration" >&2
        exit 1
      fi
      
      # Extract values and build MoltBot config
      ANTHROPIC_KEY=$(echo "$RESPONSE" | jq -r '.apiKeys.anthropic // empty')
      TELEGRAM_TOKEN=$(echo "$RESPONSE" | jq -r '.channels.telegram.botToken // empty')
      MODEL=$(echo "$RESPONSE" | jq -r '.agent.model // "anthropic/claude-sonnet-4-20250514"')
      
      mkdir -p "$(dirname "$MOLTBOT_CONFIG")"
      
      cat > "$MOLTBOT_CONFIG" << EOF
      {
        "agent": {
          "model": "$MODEL"
        },
        "channels": {
          "telegram": {
            "enabled": true,
            "token": "$TELEGRAM_TOKEN"
          }
        },
        "gateway": {
          "host": "${privateIp}",
          "port": 18789
        }
      }
      EOF
      
      # Set API key as environment variable for MoltBot
      echo "ANTHROPIC_API_KEY=$ANTHROPIC_KEY" > /opt/pocketmolt/env
      chmod 600 /opt/pocketmolt/env
      
      echo "Configuration written to $MOLTBOT_CONFIG"

  - path: /etc/systemd/system/pocketmolt-bot.service
    permissions: '0644'
    content: |
      [Unit]
      Description=PocketMolt MoltBot Service
      After=network.target
      
      [Service]
      Type=simple
      User=root
      WorkingDirectory=/opt/pocketmolt
      EnvironmentFile=/opt/pocketmolt/env
      ExecStartPre=/opt/pocketmolt/bin/fetch-config.sh
      ExecStart=/usr/bin/moltbot
      Restart=always
      RestartSec=10
      
      # Security hardening
      NoNewPrivileges=true
      ProtectSystem=strict
      ProtectHome=read-only
      ReadWritePaths=/opt/pocketmolt /root/.clawdbot /var/log/pocketmolt
      PrivateTmp=true
      
      [Install]
      WantedBy=multi-user.target

  - path: /opt/pocketmolt/bin/health.sh
    permissions: '0755'
    content: |
      #!/bin/bash
      echo "PocketMolt Bot Server"
      echo "Bot ID: ${botId}"
      echo "Bot Name: ${botName}"
      echo "Private IP: ${privateIp}"
      echo "MoltBot Status: $(systemctl is-active pocketmolt-bot)"
      echo "Uptime: $(uptime -p)"
      
      # Check if MoltBot gateway is responding
      if curl -s --connect-timeout 2 "http://${privateIp}:18789/health" > /dev/null 2>&1; then
        echo "Gateway: healthy"
      else
        echo "Gateway: unreachable"
      fi

final_message: "PocketMolt server provisioned successfully for bot ${botName}"
`
}
