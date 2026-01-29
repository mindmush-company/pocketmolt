"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    })

    setIsLoading(false)

    if (resetError) {
      setError(resetError.message)
      return
    }

    setSuccess(true)
  }

  if (success) {
    return (
      <Card className="border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription>
            We&apos;ve sent a password reset link to <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground text-sm">
            Click the link in your email to reset your password. The link will expire in 24 hours.
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <Link href="/login">
            <Button variant="link" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="border-border">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Reset your password</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a reset link
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Sending..." : "Send reset link"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <Link href="/login">
          <Button variant="link" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
