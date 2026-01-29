import { BACKEND_IP } from './network'

const CONFIG_API_PORT = 8443

interface CloudInitOptions {
  botId: string
  botName: string
  privateIp: string
  clientCert: string
  clientKey: string
  caCert: string
  gatewayToken: string
}

export function generateCloudInit(botId: string, botName: string): string {
  return generateCloudInitWithCerts({
    botId,
    botName,
    privateIp: '',
    clientCert: '',
    clientKey: '',
    caCert: '',
    gatewayToken: '',
  })
}

function indentCert(cert: string): string {
  return cert.split('\n').map(line => '      ' + line).join('\n')
}

export function generateCloudInitWithCerts(options: CloudInitOptions): string {
  const { botId, botName, privateIp, clientCert, clientKey, caCert, gatewayToken } = options

  const configApiUrl = `https://${BACKEND_IP}:${CONFIG_API_PORT}`

  return `#cloud-config
package_update: true
package_upgrade: true

packages:
  - curl
  - jq
  - ca-certificates

write_files:
  - path: /opt/pocketmolt/certs/client.crt
    permissions: '0644'
    content: |
${indentCert(clientCert)}

  - path: /opt/pocketmolt/certs/client.key
    permissions: '0600'
    content: |
${indentCert(clientKey)}

  - path: /opt/pocketmolt/certs/ca.crt
    permissions: '0644'
    content: |
${indentCert(caCert)}

  - path: /opt/pocketmolt/config.json
    permissions: '0644'
    content: |
      {
        "bot_id": "${botId}",
        "bot_name": "${botName}",
        "private_ip": "${privateIp}",
        "config_api": "${configApiUrl}"
      }

  - path: /opt/pocketmolt/bin/fetch-config.sh
    permissions: '0755'
    content: |
      #!/bin/bash
      set -e
      
      CONFIG_API="${configApiUrl}"
      CERT_DIR="/opt/pocketmolt/certs"
      MOLTBOT_CONFIG="/root/.clawdbot/moltbot.json"
      
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
      
      ANTHROPIC_KEY=$(echo "$RESPONSE" | jq -r '.apiKeys.anthropic // empty')
      TELEGRAM_TOKEN=$(echo "$RESPONSE" | jq -r '.channels.telegram.botToken // empty')
      MODEL=$(echo "$RESPONSE" | jq -r '.agent.model // "anthropic/claude-sonnet-4-20250514"')
      GATEWAY_TOKEN=$(echo "$RESPONSE" | jq -r '.gatewayToken // empty')
      
      mkdir -p "$(dirname "$MOLTBOT_CONFIG")"
      
      cat > "$MOLTBOT_CONFIG" <<MOLTEOF
      {
        "agents": {
          "defaults": {
            "model": {
              "primary": "$MODEL"
            }
          }
        },
        "channels": {
          "telegram": {
            "enabled": true,
            "botToken": "$TELEGRAM_TOKEN"
          }
        },
        "gateway": {
          "mode": "local",
          "bind": "lan",
          "port": 18789,
          "auth": {
            "mode": "token"
          },
          "controlUi": {
            "allowInsecureAuth": true
          },
          "trustedProxies": ["${BACKEND_IP}"]
        }
      }
      MOLTEOF
      
      echo "ANTHROPIC_API_KEY=$ANTHROPIC_KEY" > /opt/pocketmolt/env
      echo "CLAWDBOT_GATEWAY_TOKEN=$GATEWAY_TOKEN" >> /opt/pocketmolt/env
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
      Environment=CLAWDBOT_CONFIG_PATH=/root/.clawdbot/moltbot.json
      EnvironmentFile=/opt/pocketmolt/env
      ExecStartPre=/opt/pocketmolt/bin/fetch-config.sh
      ExecStart=/usr/bin/clawdbot gateway --allow-unconfigured
      Restart=always
      RestartSec=10
      
      NoNewPrivileges=true
      ProtectSystem=strict
      ProtectHome=read-only
      ReadWritePaths=/opt/pocketmolt /root/.clawdbot /root/clawd /var/log/pocketmolt /tmp
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
      echo "MoltBot Status: \\$(systemctl is-active pocketmolt-bot)"
      echo "Uptime: \\$(uptime -p)"
      
      HEALTH=$(ANTHROPIC_API_KEY=test clawdbot gateway health 2>&1 || echo "FAIL")
      if echo "$HEALTH" | grep -q "OK"; then
        echo "Gateway: healthy"
      else
        echo "Gateway: unreachable"
      fi

runcmd:
  - mkdir -p /opt/pocketmolt/certs
  - mkdir -p /opt/pocketmolt/bin
  - mkdir -p /var/log/pocketmolt
  - mkdir -p /root/clawd
  - curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  - apt-get install -y nodejs
  - npm install -g clawdbot@latest
  - mkdir -p /root/.clawdbot
  - /opt/pocketmolt/bin/fetch-config.sh || echo "Config fetch failed, will retry on service start"
  - systemctl daemon-reload
  - systemctl enable pocketmolt-bot
  - systemctl start pocketmolt-bot
  - echo "MoltBot provisioning complete at \\$(date)" >> /var/log/pocketmolt/init.log

final_message: "PocketMolt server provisioned successfully for bot ${botName}"
`
}
