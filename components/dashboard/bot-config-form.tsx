'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Key, Save, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface BotConfigFormProps {
  botId: string
  hasApiKey: boolean
  hasTelegramToken: boolean
}

export function BotConfigForm({
  botId,
  hasApiKey,
  hasTelegramToken,
}: BotConfigFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [showApiKey, setShowApiKey] = useState(false)
  const [showToken, setShowToken] = useState(false)

  const [anthropicApiKey, setAnthropicApiKey] = useState('')
  const [telegramBotToken, setTelegramBotToken] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch(`/api/bots/${botId}/configure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anthropicApiKey: anthropicApiKey || undefined,
          telegramBotToken: telegramBotToken || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save configuration')
      }

      setSuccess(true)
      setAnthropicApiKey('')
      setTelegramBotToken('')

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Bot Configuration
        </CardTitle>
        <CardDescription>
          Configure your API keys and Telegram bot token to activate your
          MoltBot.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="anthropicApiKey">
              Anthropic API Key
              {hasApiKey && (
                <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                  ✓ Configured
                </span>
              )}
            </Label>
            <div className="relative">
              <Input
                id="anthropicApiKey"
                type={showApiKey ? 'text' : 'password'}
                placeholder={hasApiKey ? '••••••••••••••••' : 'sk-ant-api03-...'}
                value={anthropicApiKey}
                onChange={(e) => setAnthropicApiKey(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Get your API key from{' '}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                console.anthropic.com
              </a>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="telegramBotToken">
              Telegram Bot Token
              {hasTelegramToken && (
                <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                  ✓ Configured
                </span>
              )}
            </Label>
            <div className="relative">
              <Input
                id="telegramBotToken"
                type={showToken ? 'text' : 'password'}
                placeholder={
                  hasTelegramToken ? '••••••••••••••••' : '123456789:ABC...'
                }
                value={telegramBotToken}
                onChange={(e) => setTelegramBotToken(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showToken ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Create a bot with{' '}
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                @BotFather
              </a>{' '}
              and paste the token here
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-500/15 p-3 text-sm text-green-600 dark:text-green-400">
              Configuration saved successfully!
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading || (!anthropicApiKey && !telegramBotToken)}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Configuration
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
