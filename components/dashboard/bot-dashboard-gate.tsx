'use client'

import { useState, useEffect, useCallback, ReactNode } from 'react'
import { Loader2, Wifi, WifiOff, RefreshCw, Server } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface BotHealthStatus {
  status: 'healthy' | 'unhealthy' | 'unreachable'
  gateway: boolean
  moltbotService: 'active' | 'inactive' | 'unknown'
  uptime?: string
  lastChecked: string
  error?: string
}

interface BotDashboardGateProps {
  botId: string
  botStatus: string
  botName: string
  children: ReactNode
}

const POLL_INTERVAL_MS = 5000
const MAX_WAIT_TIME_MS = 180000

export function BotDashboardGate({ botId, botStatus, children }: BotDashboardGateProps) {
  const [health, setHealth] = useState<BotHealthStatus | null>(null)
  const [, setIsLoading] = useState(true)
  const [attemptCount, setAttemptCount] = useState(0)
  const [startTime] = useState(Date.now())
  const [showDashboard, setShowDashboard] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchHealth = useCallback(async () => {
    if (botStatus !== 'running') {
      return
    }

    try {
      const response = await fetch(`/api/bots/${botId}/health`)
      if (!response.ok) {
        throw new Error('Failed to fetch health status')
      }
      const data: BotHealthStatus = await response.json()
      setHealth(data)
      setAttemptCount(prev => prev + 1)
      
      if (data.status === 'healthy' && data.gateway) {
        setShowDashboard(true)
        setIsLoading(false)
      }
    } catch (err) {
      console.error('Health check failed:', err)
      setAttemptCount(prev => prev + 1)
    }
  }, [botId, botStatus])

  useEffect(() => {
    if (botStatus !== 'running') {
      setShowDashboard(true)
      setIsLoading(false)
      return
    }

    fetchHealth()

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      
      if (elapsed > MAX_WAIT_TIME_MS && !showDashboard) {
        setError('Bot is taking longer than expected to connect. You can wait or try restarting.')
        setIsLoading(false)
        clearInterval(interval)
        return
      }
      
      if (!showDashboard) {
        fetchHealth()
      }
    }, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [fetchHealth, botStatus, startTime, showDashboard])

  if (showDashboard) {
    return <>{children}</>
  }

  const elapsed = Date.now() - startTime
  const estimatedStartupTimeMs = 60000
  const progress = Math.min(95, (elapsed / estimatedStartupTimeMs) * 100)

  const getStatusMessage = () => {
    if (error) return error
    if (!health) return 'Connecting to your bot...'
    if (health.status === 'unreachable') return 'Waiting for gateway to start...'
    if (!health.gateway) return 'Gateway starting up...'
    return 'Almost ready...'
  }

  const getStatusDetail = () => {
    if (attemptCount === 0) return 'Establishing connection'
    if (attemptCount < 5) return 'Bot server is booting up'
    if (attemptCount < 10) return 'Installing and configuring MoltBot'
    if (attemptCount < 15) return 'Starting gateway service'
    return 'Gateway is initializing (this can take up to 60 seconds)'
  }

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                {error ? (
                  <WifiOff className="h-8 w-8 text-destructive" />
                ) : health?.status === 'healthy' ? (
                  <Wifi className="h-8 w-8 text-green-500" />
                ) : (
                  <Server className="h-8 w-8 text-primary animate-pulse" />
                )}
              </div>
              {!error && !showDashboard && (
                <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-background flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{getStatusMessage()}</h3>
              <p className="text-sm text-muted-foreground">
                {error ? (
                  'The bot may still be starting up.'
                ) : (
                  getStatusDetail()
                )}
              </p>
            </div>

            {!error && (
              <div className="w-full space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {Math.round(elapsed / 1000)}s elapsed
                  {attemptCount > 0 && ` - ${attemptCount} checks`}
                </p>
              </div>
            )}

            {error && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setError(null)
                    setIsLoading(true)
                    fetchHealth()
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowDashboard(true)}
                >
                  Continue Anyway
                </Button>
              </div>
            )}

            {health && !error && (
              <div className="text-xs text-muted-foreground space-y-1 w-full pt-2 border-t">
                <div className="flex justify-between">
                  <span>Gateway</span>
                  <span className={health.gateway ? 'text-green-500' : 'text-yellow-500'}>
                    {health.gateway ? 'Connected' : 'Connecting...'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Service</span>
                  <span className={health.moltbotService === 'active' ? 'text-green-500' : 'text-yellow-500'}>
                    {health.moltbotService}
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
