"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function CreateBotForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [botName, setBotName] = React.useState("")

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    if (botName.length < 3 || botName.length > 50) {
      setError("Bot name must be between 3 and 50 characters")
      setIsLoading(false)
      return
    }

    if (!/^[a-zA-Z0-9\s-]+$/.test(botName)) {
      setError("Bot name can only contain letters, numbers, spaces, and hyphens")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ botName }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong")
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initiate checkout")
      setIsLoading(false)
    }
  }

  return (
    <div className="flex justify-center items-center">
      <Card className="w-full max-w-lg rounded-[1.3rem]">
        <form onSubmit={onSubmit}>
          <CardHeader>
            <CardTitle>Create New Bot</CardTitle>
            <CardDescription>
              Deploy a new MoltBot instance. Hosting is €30/month.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="bot-name">Bot Name</Label>
              <Input
                id="bot-name"
                placeholder="My Awesome Bot"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                disabled={isLoading}
                required
                minLength={3}
                maxLength={50}
              />
              <p className="text-sm text-muted-foreground">
                This name will help you identify your bot in the dashboard.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Proceed to Payment
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
