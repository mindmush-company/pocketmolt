'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StepChannel } from './step-channel'
import { StepTelegram } from './step-telegram'
import { StepWhatsApp } from './step-whatsapp'
import { StepPersonalize } from './step-personalize'
import { StepComplete } from './step-complete'
import { Card, CardContent } from '@/components/ui/card'

interface SetupWizardProps {
  botId: string
  botName: string
}

type WizardStep = 'channel' | 'telegram' | 'whatsapp' | 'personalize' | 'complete'
type ChannelType = 'telegram' | 'whatsapp' | 'none'

interface WizardState {
  channelType: ChannelType
  telegramToken?: string
  telegramUsername?: string
  emoji: string
  theme: string
  dmPolicy: string
}

export function SetupWizard({ botId, botName }: SetupWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState<WizardStep>('channel')
  const [state, setState] = useState<WizardState>({
    channelType: 'none',
    emoji: '🤖',
    theme: 'helpful',
    dmPolicy: 'pairing',
  })

  const handleSelectTelegram = () => {
    setState((prev) => ({ ...prev, channelType: 'telegram' }))
    setStep('telegram')
  }

  const handleSelectWhatsApp = () => {
    setState((prev) => ({ ...prev, channelType: 'whatsapp' }))
    setStep('whatsapp')
  }

  const handleChannelSkip = () => {
    setState((prev) => ({ ...prev, channelType: 'none' }))
    setStep('personalize')
  }

  const handleTelegramComplete = (token: string, username: string) => {
    setState((prev) => ({ ...prev, telegramToken: token, telegramUsername: username }))
    setStep('personalize')
  }

  const handleTelegramSkip = () => {
    setStep('personalize')
  }

  const handleWhatsAppComplete = () => {
    setStep('personalize')
  }

  const handlePersonalizeComplete = (emoji: string, theme: string, dmPolicy: string) => {
    setState((prev) => ({ ...prev, emoji, theme, dmPolicy }))
    setStep('complete')
  }

  const handleWizardComplete = () => {
    router.refresh()
  }

  const getStepIndex = (): number => {
    switch (step) {
      case 'channel':
        return 0
      case 'telegram':
      case 'whatsapp':
        return 1
      case 'personalize':
        return 2
      case 'complete':
        return 3
      default:
        return 0
    }
  }

  const currentStepIndex = getStepIndex()
  const totalSteps = 4

  return (
    <Card className="mx-auto max-w-lg">
      <CardContent className="pt-6">
        <div className="mb-8 flex justify-center gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-2 w-12 rounded-full transition-colors ${
                i <= currentStepIndex ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {step === 'channel' && (
          <StepChannel
            onSelectTelegram={handleSelectTelegram}
            onSelectWhatsApp={handleSelectWhatsApp}
            onSkip={handleChannelSkip}
          />
        )}

        {step === 'telegram' && (
          <StepTelegram
            botId={botId}
            onComplete={handleTelegramComplete}
            onSkip={handleTelegramSkip}
          />
        )}

        {step === 'whatsapp' && (
          <StepWhatsApp
            botId={botId}
            onComplete={handleWhatsAppComplete}
            onBack={() => setStep('channel')}
          />
        )}

        {step === 'personalize' && (
          <StepPersonalize
            initialEmoji={state.emoji}
            initialTheme={state.theme}
            initialDmPolicy={state.dmPolicy}
            onComplete={handlePersonalizeComplete}
            onBack={() => setStep(state.channelType === 'whatsapp' ? 'whatsapp' : state.channelType === 'telegram' ? 'telegram' : 'channel')}
          />
        )}

        {step === 'complete' && (
          <StepComplete
            botId={botId}
            botName={botName}
            channelType={state.channelType}
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
