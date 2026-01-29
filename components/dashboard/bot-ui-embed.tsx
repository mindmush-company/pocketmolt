'use client'

import { useState } from 'react'
import { ExternalLink, Maximize2, Minimize2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface BotUIEmbedProps {
  botId: string
  botStatus: string
  botName: string
}

export function BotUIEmbed({ botId, botStatus, botName }: BotUIEmbedProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  if (botStatus !== 'running') {
    return null
  }

  const uiUrl = `/api/bots/${botId}/ui`

  const handleIframeLoad = () => {
    setIsLoading(false)
    setError(null)
  }

  const handleIframeError = () => {
    setIsLoading(false)
    setError('Failed to load bot UI. The bot may still be starting up.')
  }

  return (
    <Card className={isExpanded ? 'col-span-2' : ''}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Control Panel</CardTitle>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8"
            title={isExpanded ? 'Minimize' : 'Maximize'}
          >
            {isExpanded ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-8 w-8"
            title="Open in new tab"
          >
            <a href={uiUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {error ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            <p>{error}</p>
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                setError(null)
                setIsLoading(true)
              }}
            >
              Try again
            </Button>
          </div>
        ) : (
          <div className="relative">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                <div className="animate-pulse text-sm text-muted-foreground">
                  Loading {botName} Control Panel...
                </div>
              </div>
            )}
            <iframe
              src={uiUrl}
              title={`${botName} Control Panel`}
              className="w-full border-0 rounded-b-lg"
              style={{ height: isExpanded ? '600px' : '400px' }}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
