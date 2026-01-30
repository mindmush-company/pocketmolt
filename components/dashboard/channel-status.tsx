"use client"

import Link from "next/link"
import { MessageCircle, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface ChannelStatusProps {
  botId: string
  channelType: 'telegram' | 'whatsapp' | 'none'
  whatsappConnectedAt: string | null
  telegramBotName?: string
}

export function ChannelStatus({ 
  botId, 
  channelType, 
  whatsappConnectedAt,
  telegramBotName 
}: ChannelStatusProps) {
  
  const isConnected = channelType !== 'none'

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold leading-none tracking-tight">Channel Connection</h3>
          {isConnected && (
             <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">
               ✓ Connected
             </Badge>
          )}
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
          <div className="flex items-center gap-4">
            {channelType === 'telegram' && (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium">Telegram</div>
                  {telegramBotName && (
                    <div className="text-sm text-muted-foreground">@{telegramBotName}</div>
                  )}
                </div>
              </>
            )}

            {channelType === 'whatsapp' && (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium">WhatsApp</div>
                  {whatsappConnectedAt && (
                    <div className="text-sm text-muted-foreground">
                      Connected {new Date(whatsappConnectedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </>
            )}

            {channelType === 'none' && (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium">No Channel Connected</div>
                  <div className="text-sm text-muted-foreground">Connect Telegram or WhatsApp</div>
                </div>
              </>
            )}
          </div>

          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/bots/${botId}/setup?step=channel`}>
              {channelType === 'none' ? 'Connect Channel' : 'Switch Channel'}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
