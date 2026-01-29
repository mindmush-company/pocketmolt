const LITELLM_BASE_URL = process.env.LITELLM_BASE_URL || 'http://127.0.0.1:4000'
const LITELLM_MASTER_KEY = process.env.LITELLM_MASTER_KEY

interface CreateKeyResponse {
  key: string
  key_name: string
  user_id: string
  token: string
}

interface KeyInfo {
  key: string
  key_name: string
  spend: number
  max_budget: number | null
  user_id: string
}

export async function createBotKey(botId: string, userId: string): Promise<string> {
  if (!LITELLM_MASTER_KEY) {
    throw new Error('LITELLM_MASTER_KEY not configured')
  }

  const response = await fetch(`${LITELLM_BASE_URL}/key/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LITELLM_MASTER_KEY}`,
    },
    body: JSON.stringify({
      key_name: `bot-${botId}`,
      user_id: userId,
      metadata: {
        bot_id: botId,
        user_id: userId,
        spend_logs_metadata: {
          bot_id: botId,
          user_id: userId,
        },
      },
      models: ['claude-sonnet-4', 'claude-sonnet-4-20250514', 'anthropic/claude-sonnet-4-20250514'],
      max_budget: null,
      budget_duration: null,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create LiteLLM key: ${error}`)
  }

  const data: CreateKeyResponse = await response.json()
  return data.key
}

export async function deleteBotKey(keyToken: string): Promise<void> {
  if (!LITELLM_MASTER_KEY) {
    throw new Error('LITELLM_MASTER_KEY not configured')
  }

  const response = await fetch(`${LITELLM_BASE_URL}/key/delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LITELLM_MASTER_KEY}`,
    },
    body: JSON.stringify({
      keys: [keyToken],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to delete LiteLLM key: ${error}`)
  }
}

export async function getKeyInfo(keyToken: string): Promise<KeyInfo | null> {
  if (!LITELLM_MASTER_KEY) {
    throw new Error('LITELLM_MASTER_KEY not configured')
  }

  const response = await fetch(`${LITELLM_BASE_URL}/key/info?key=${keyToken}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${LITELLM_MASTER_KEY}`,
    },
  })

  if (!response.ok) {
    if (response.status === 404) {
      return null
    }
    const error = await response.text()
    throw new Error(`Failed to get LiteLLM key info: ${error}`)
  }

  return response.json()
}

export async function getKeySpend(keyToken: string): Promise<number> {
  const info = await getKeyInfo(keyToken)
  return info?.spend ?? 0
}
