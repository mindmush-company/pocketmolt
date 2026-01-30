'use client'

import { MessageCircle, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface StepChannelProps {
  onSelectTelegram: () => void
  onSelectWhatsApp: () => void
  onSkip: () => void
}

export function StepChannel({ onSelectTelegram, onSelectWhatsApp, onSkip }: StepChannelProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold">Choose a Platform</h2>
        <p className="text-muted-foreground">
          Where do you want to talk to your bot?
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card
          className="cursor-pointer transition-all hover:border-primary hover:bg-muted/50"
          onClick={onSelectTelegram}
        >
          <div className="flex flex-col items-center gap-4 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold">Telegram</h3>
              <p className="text-sm text-muted-foreground">
                Easy setup with @BotFather. Best for personal use.
              </p>
            </div>
          </div>
        </Card>

        <Card
          className="cursor-pointer transition-all hover:border-primary hover:bg-muted/50"
          onClick={onSelectWhatsApp}
        >
          <div className="flex flex-col items-center gap-4 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
              <Smartphone className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold">WhatsApp</h3>
              <p className="text-sm text-muted-foreground">
                Connect via QR code. Works like WhatsApp Web.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Button variant="ghost" onClick={onSkip} className="w-full">
        Configure Later
      </Button>
    </div>
  )
}
