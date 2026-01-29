"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Play, Square, RotateCw, Loader2, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface BotActionsProps {
  botId: string
  initialStatus: "starting" | "running" | "stopped" | "failed"
}

export function BotActions({ botId, initialStatus }: BotActionsProps) {
  const router = useRouter()
  const [status, setStatus] = useState(initialStatus)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleStart = async () => {
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch(`/api/bots/${botId}/start`, {
        method: "POST",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to start bot")
      }

      setStatus("running")
      setSuccessMessage("Bot is starting...")
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start bot")
    } finally {
      setIsLoading(false)
    }
  }

  const handleStop = async () => {
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch(`/api/bots/${botId}/stop`, {
        method: "POST",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to stop bot")
      }

      setStatus("stopped")
      setSuccessMessage("Bot is stopping...")
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to stop bot")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRestart = async () => {
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch(`/api/bots/${botId}/restart`, {
        method: "POST",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to restart bot")
      }

      setStatus("starting")
      setSuccessMessage("Bot is restarting...")
      router.refresh()

      setTimeout(() => {
        setStatus("running")
        router.refresh()
      }, 5000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to restart bot")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-900/20 dark:text-green-300">
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <div className="flex space-x-4">
        {status === "stopped" && (
          <Button
            onClick={handleStart}
            disabled={isLoading}
            className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4 fill-current" />
                Start Bot
              </>
            )}
          </Button>
        )}

        {status === "running" && (
          <>
            <Button
              onClick={handleStop}
              disabled={isLoading}
              variant="destructive"
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Stopping...
                </>
              ) : (
                <>
                  <Square className="mr-2 h-4 w-4 fill-current" />
                  Stop Bot
                </>
              )}
            </Button>
            <Button
              onClick={handleRestart}
              disabled={isLoading}
              variant="outline"
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restarting...
                </>
              ) : (
                <>
                  <RotateCw className="mr-2 h-4 w-4" />
                  Restart
                </>
              )}
            </Button>
          </>
        )}

        {status === "starting" && (
          <Button disabled variant="outline" className="w-full sm:w-auto">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Starting...
          </Button>
        )}
        
        {status === "failed" && (
            <Button disabled variant="destructive" className="w-full sm:w-auto">
              Bot Failed
            </Button>
        )}
      </div>
    </div>
  )
}
