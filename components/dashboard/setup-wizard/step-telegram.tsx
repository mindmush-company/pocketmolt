'use client'

import { useState } from 'react'
import { Eye, EyeOff, Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface StepTelegramProps {
  botId: string
  initialToken?: string
  onComplete: (token: string, botUsername: string) => void
  onSkip: () => void
}

interface ValidationResult {
  valid: boolean
  error?: string
  bot?: {
    id: number
    username: string
    firstName: string
  }
}

export function StepTelegram({ botId, initialToken, onComplete, onSkip }: StepTelegramProps) {
  const [token, setToken] = useState(initialToken || '')
  const [showToken, setShowToken] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)

  const handleValidate = async () => {
    if (!token.trim()) return

    setIsValidating(true)
    setValidationResult(null)

    try {
      const response = await fetch(`/api/bots/${botId}/configure/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramBotToken: token }),
      })

      const data: ValidationResult = await response.json()
      setValidationResult(data)

      if (data.valid && data.bot) {
        onComplete(token, data.bot.username)
      }
    } catch {
      setValidationResult({
        valid: false,
        error: 'Failed to validate token. Please try again.',
      })
    } finally {
      setIsValidating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold">Connect Telegram</h2>
        <p className="text-muted-foreground">
          Create a bot with @BotFather and paste the token here
        </p>
      </div>

      <div className="rounded-lg border bg-muted/50 p-4">
        <h3 className="mb-2 font-medium">How to get your bot token:</h3>
        <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
          <li>
            Open{' '}
            <a
              href="https://t.me/BotFather"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              @BotFather <ExternalLink className="h-3 w-3" />
            </a>
          </li>
          <li>Send /newbot and follow the prompts</li>
          <li>Copy the token that looks like: 123456789:ABC...</li>
        </ol>
      </div>

      <div className="space-y-2">
        <Label htmlFor="telegram-token">Bot Token</Label>
        <div className="relative">
          <Input
            id="telegram-token"
            type={showToken ? 'text' : 'password'}
            placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz1234567890"
            value={token}
            onChange={(e) => {
              setToken(e.target.value)
              setValidationResult(null)
            }}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowToken(!showToken)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {validationResult && (
        <div
          className={`flex items-center gap-2 rounded-md p-3 text-sm ${
            validationResult.valid
              ? 'bg-green-500/15 text-green-600 dark:text-green-400'
              : 'bg-destructive/15 text-destructive'
          }`}
        >
          {validationResult.valid ? (
            <>
              <CheckCircle className="h-4 w-4" />
              <span>Connected to @{validationResult.bot?.username}</span>
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4" />
              <span>{validationResult.error}</span>
            </>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Button
          onClick={handleValidate}
          disabled={!token.trim() || isValidating}
          className="w-full"
        >
          {isValidating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify & Continue'
          )}
        </Button>
        <Button variant="ghost" onClick={onSkip} className="w-full">
          Configure Later
        </Button>
      </div>
    </div>
  )
}
