'use client'

import { useState } from 'react'
import { Loader2, CheckCircle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface StepCompleteProps {
  botId: string
  botName: string
  channelType: 'telegram' | 'whatsapp' | 'none'
  telegramUsername?: string
  emoji: string
  theme: string
  dmPolicy: string
  telegramToken?: string
  onComplete: () => void
  onBack: () => void
}

export function StepComplete({
  botId,
  botName,
  channelType,
  telegramUsername,
  emoji,
  theme,
  dmPolicy,
  telegramToken,
  onComplete,
  onBack,
}: StepCompleteProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFinish = async () => {
    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/bots/${botId}/configure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramBotToken: channelType === 'telegram' ? telegramToken : undefined,
          channelType,
          botEmoji: emoji,
          botTheme: theme,
          dmPolicy,
          setupCompleted: true,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save configuration')
      }

      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-4xl">
          {emoji}
        </div>
        <h2 className="text-2xl font-bold">Ready to Launch!</h2>
        <p className="text-muted-foreground">
          Review your settings and activate your bot
        </p>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Bot Name</dt>
            <dd className="font-medium">{botName}</dd>
          </div>
          {telegramUsername && channelType === 'telegram' && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Telegram</dt>
              <dd className="font-medium">@{telegramUsername}</dd>
            </div>
          )}
          {channelType === 'whatsapp' && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">WhatsApp</dt>
              <dd className="font-medium text-green-600 dark:text-green-400">Connected</dd>
            </div>
          )}
          {channelType === 'none' && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Channel</dt>
              <dd className="font-medium text-muted-foreground">Not configured</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Personality</dt>
            <dd className="font-medium capitalize">{theme}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Access</dt>
            <dd className="font-medium capitalize">{dmPolicy}</dd>
          </div>
        </dl>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
        <div className="text-sm">
          <p className="font-medium">What happens next?</p>
          <p className="text-muted-foreground">
            {channelType === 'telegram' && 'Your bot will start and connect to Telegram. You can message it directly to start a conversation!'}
            {channelType === 'whatsapp' && 'Your bot is connected to WhatsApp. Send a message from your phone to start chatting!'}
            {channelType === 'none' && 'Your bot will start but won\'t be connected to any messaging platform yet. You can configure this later.'}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1" disabled={isSaving}>
          Back
        </Button>
        <Button onClick={handleFinish} className="flex-1" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Activate Bot
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
