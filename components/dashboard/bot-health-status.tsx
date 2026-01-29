'use client'

import { useState, useEffect, useCallback } from 'react'
import { Activity, RefreshCw, Wifi, WifiOff, AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface BotHealthStatus {
  status: 'healthy' | 'unhealthy' | 'unreachable'
  gateway: boolean
  moltbotService: 'active' | 'inactive' | 'unknown'
  uptime?: string
  lastChecked: string
  error?: string
}

interface BotHealthStatusProps {
  botId: string
  botStatus: string
}

export function BotHealthStatus({ botId, botStatus }: BotHealthStatusProps) {
  const [health, setHealth] = useState<BotHealthStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchHealth = useCallback(async () => {
    if (botStatus !== 'running') {
      setHealth(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/bots/${botId}/health`)
      if (!response.ok) {
        throw new Error('Failed to fetch health status')
      }
      const data = await response.json()
      setHealth(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [botId, botStatus])

  useEffect(() => {
    fetchHealth()
    const interval = setInterval(fetchHealth, 30000)
    return () => clearInterval(interval)
  }, [fetchHealth])

  if (botStatus !== 'running') {
    return null
  }

  const getStatusIcon = () => {
    if (!health) return <Activity className="h-5 w-5 text-muted-foreground animate-pulse" />
    switch (health.status) {
      case 'healthy':
        return <Wifi className="h-5 w-5 text-green-500" />
      case 'unhealthy':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'unreachable':
        return <WifiOff className="h-5 w-5 text-red-500" />
    }
  }

  const getStatusColor = () => {
    if (!health) return 'text-muted-foreground'
    switch (health.status) {
      case 'healthy':
        return 'text-green-600 dark:text-green-400'
      case 'unhealthy':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'unreachable':
        return 'text-red-600 dark:text-red-400'
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {getStatusIcon()}
          Health Status
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchHealth}
          disabled={isLoading}
          className="h-8 w-8"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : health ? (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className={`text-sm font-medium capitalize ${getStatusColor()}`}>
                {health.status}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Gateway</span>
              <span className="text-sm">
                {health.gateway ? '✓ Connected' : '✗ Disconnected'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">MoltBot Service</span>
              <span className="text-sm capitalize">{health.moltbotService}</span>
            </div>
            {health.uptime && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Uptime</span>
                <span className="text-sm">{health.uptime}</span>
              </div>
            )}
            {health.error && (
              <div className="mt-2 p-2 rounded bg-destructive/10 text-destructive text-xs">
                {health.error}
              </div>
            )}
            <div className="pt-2 border-t">
              <span className="text-xs text-muted-foreground">
                Last checked: {new Date(health.lastChecked).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Checking health...</p>
        )}
      </CardContent>
    </Card>
  )
}
