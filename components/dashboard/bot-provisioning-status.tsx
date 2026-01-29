"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Server, Cloud, Settings, CheckCircle2, Circle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface ProvisioningStep {
  id: string
  label: string
  description: string
  icon: React.ReactNode
}

const PROVISIONING_STEPS: ProvisioningStep[] = [
  {
    id: "payment",
    label: "Payment confirmed",
    description: "Your subscription is active",
    icon: <CheckCircle2 className="h-5 w-5" />,
  },
  {
    id: "server",
    label: "Creating server",
    description: "Provisioning a dedicated VPS in Germany",
    icon: <Server className="h-5 w-5" />,
  },
  {
    id: "software",
    label: "Installing MoltBot",
    description: "Setting up Node.js and MoltBot software",
    icon: <Cloud className="h-5 w-5" />,
  },
  {
    id: "config",
    label: "Configuring gateway",
    description: "Securing connections and starting services",
    icon: <Settings className="h-5 w-5" />,
  },
]

const STEP_TIMING_SECONDS = {
  serverCreation: 30,
  softwareInstall: 120,
  gatewayConfig: 180,
}

interface BotProvisioningStatusProps {
  botId: string
  botName: string
  initialStatus: string
  createdAt: string
}

export function BotProvisioningStatus({
  botId,
  botName,
  initialStatus,
  createdAt,
}: BotProvisioningStatusProps) {
  const router = useRouter()
  const [status, setStatus] = useState(initialStatus)
  const [currentStep, setCurrentStep] = useState(1)
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    const createdTime = new Date(createdAt).getTime()
    
    const updateElapsed = () => {
      const now = Date.now()
      setElapsedTime(Math.floor((now - createdTime) / 1000))
    }
    
    updateElapsed()
    const interval = setInterval(updateElapsed, 1000)
    return () => clearInterval(interval)
  }, [createdAt])

  useEffect(() => {
    if (elapsedTime < STEP_TIMING_SECONDS.serverCreation) {
      setCurrentStep(1)
    } else if (elapsedTime < STEP_TIMING_SECONDS.softwareInstall) {
      setCurrentStep(2)
    } else if (elapsedTime < STEP_TIMING_SECONDS.gatewayConfig) {
      setCurrentStep(3)
    } else {
      setCurrentStep(3)
    }
  }, [elapsedTime])

  useEffect(() => {
    if (status !== "starting") return

    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/bots/${botId}/health`)
        if (res.ok) {
          const data = await res.json()
          if (data.botStatus && data.botStatus !== "starting") {
            setStatus(data.botStatus)
            if (data.botStatus === "running") {
              router.refresh()
            }
          }
        }
      } catch {
        /* polling errors are expected during provisioning */
      }
    }

    const interval = setInterval(pollStatus, 5000)
    return () => clearInterval(interval)
  }, [botId, status, router])

  if (status !== "starting") {
    return null
  }

  const progress = Math.min((currentStep / PROVISIONING_STEPS.length) * 100 + 10, 95)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins > 0) {
      return `${mins}m ${secs}s`
    }
    return `${secs}s`
  }

  return (
    <Card className="border-yellow-500/50 bg-yellow-500/5">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Loader2 className="h-6 w-6 animate-spin text-yellow-500" />
          </div>
          <div>
            <CardTitle>Setting up {botName}</CardTitle>
            <CardDescription>
              This usually takes 2-3 minutes. You can stay on this page or come back later.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="text-muted-foreground">{formatTime(elapsedTime)} elapsed</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="space-y-4">
          {PROVISIONING_STEPS.map((step, index) => {
            const isComplete = index < currentStep
            const isCurrent = index === currentStep
            const isPending = index > currentStep

            return (
              <div
                key={step.id}
                className={`flex items-start gap-3 transition-opacity ${
                  isPending ? "opacity-40" : ""
                }`}
              >
                <div
                  className={`mt-0.5 ${
                    isComplete
                      ? "text-green-500"
                      : isCurrent
                      ? "text-yellow-500"
                      : "text-muted-foreground"
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : isCurrent ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      isComplete
                        ? "text-green-500"
                        : isCurrent
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="rounded-lg bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground">
            <strong>What&apos;s happening:</strong> We&apos;re creating a dedicated server just for
            your bot in our German datacenter. Once ready, you&apos;ll be able to configure your
            API keys and start chatting with your AI assistant.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
