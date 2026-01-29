'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StepTelegram } from './step-telegram'
import { StepPersonalize } from './step-personalize'
import { StepComplete } from './step-complete'
import { Card, CardContent } from '@/components/ui/card'

interface SetupWizardProps {
  botId: string
  botName: string
}

type WizardStep = 'telegram' | 'personalize' | 'complete'

interface WizardState {
  telegramToken?: string
  telegramUsername?: string
  emoji: string
  theme: string
  dmPolicy: string
}

export function SetupWizard({ botId, botName }: SetupWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState<WizardStep>('telegram')
  const [state, setState] = useState<WizardState>({
    emoji: '🤖',
    theme: 'helpful',
    dmPolicy: 'pairing',
  })

  const handleTelegramComplete = (token: string, username: string) => {
    setState((prev) => ({ ...prev, telegramToken: token, telegramUsername: username }))
    setStep('personalize')
  }

  const handleTelegramSkip = () => {
    setStep('personalize')
  }

  const handlePersonalizeComplete = (emoji: string, theme: string, dmPolicy: string) => {
    setState((prev) => ({ ...prev, emoji, theme, dmPolicy }))
    setStep('complete')
  }

  const handleWizardComplete = () => {
    router.refresh()
  }

  const currentStepIndex = step === 'telegram' ? 0 : step === 'personalize' ? 1 : 2

  return (
    <Card className="mx-auto max-w-lg">
      <CardContent className="pt-6">
        <div className="mb-8 flex justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-2 w-12 rounded-full transition-colors ${
                i <= currentStepIndex ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {step === 'telegram' && (
          <StepTelegram
            botId={botId}
            onComplete={handleTelegramComplete}
            onSkip={handleTelegramSkip}
          />
        )}

        {step === 'personalize' && (
          <StepPersonalize
            initialEmoji={state.emoji}
            initialTheme={state.theme}
            initialDmPolicy={state.dmPolicy}
            onComplete={handlePersonalizeComplete}
            onBack={() => setStep('telegram')}
          />
        )}

        {step === 'complete' && (
          <StepComplete
            botId={botId}
            botName={botName}
            telegramUsername={state.telegramUsername}
            emoji={state.emoji}
            theme={state.theme}
            dmPolicy={state.dmPolicy}
            telegramToken={state.telegramToken}
            onComplete={handleWizardComplete}
            onBack={() => setStep('personalize')}
          />
        )}
      </CardContent>
    </Card>
  )
}
