'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ThemeSelector } from '@/components/dashboard/theme-selector'
import { DmPolicySelector } from '@/components/dashboard/dm-policy-selector'

interface StepPersonalizeProps {
  initialEmoji?: string
  initialTheme?: string
  initialDmPolicy?: string
  onComplete: (emoji: string, theme: string, dmPolicy: string) => void
  onBack: () => void
}

const emojiOptions = ['🤖', '🧠', '✨', '🎯', '🚀', '💡', '🔮', '🌟']

export function StepPersonalize({
  initialEmoji = '🤖',
  initialTheme = 'helpful',
  initialDmPolicy = 'pairing',
  onComplete,
  onBack,
}: StepPersonalizeProps) {
  const [emoji, setEmoji] = useState(initialEmoji)
  const [theme, setTheme] = useState(initialTheme)
  const [dmPolicy, setDmPolicy] = useState(initialDmPolicy)

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold">Personalize Your Bot</h2>
        <p className="text-muted-foreground">
          Choose how your bot looks and behaves
        </p>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium">Bot Avatar</label>
        <div className="flex flex-wrap gap-2">
          {emojiOptions.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              className={`flex h-12 w-12 items-center justify-center rounded-lg border-2 text-2xl transition-colors ${
                emoji === e
                  ? 'border-primary bg-primary/10'
                  : 'border-muted hover:border-muted-foreground/50'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <ThemeSelector value={theme} onChange={setTheme} />

      <DmPolicySelector value={dmPolicy} onChange={setDmPolicy} />

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button onClick={() => onComplete(emoji, theme, dmPolicy)} className="flex-1">
          Continue
        </Button>
      </div>
    </div>
  )
}
