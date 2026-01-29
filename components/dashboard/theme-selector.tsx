'use client'

import { THEME_LABELS } from '@/lib/validation/bot-config'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'

interface ThemeSelectorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

const themeEmojis: Record<string, string> = {
  helpful: '🤝',
  professional: '💼',
  casual: '😎',
  concise: '⚡',
}

export function ThemeSelector({ value, onChange, disabled }: ThemeSelectorProps) {
  return (
    <div className="space-y-3">
      <Label>Bot Personality</Label>
      <RadioGroup
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        className="grid grid-cols-2 gap-3"
      >
        {Object.entries(THEME_LABELS).map(([key, { label, description }]) => (
          <div key={key} className="relative">
            <RadioGroupItem
              value={key}
              id={`theme-${key}`}
              className="peer sr-only"
            />
            <Label
              htmlFor={`theme-${key}`}
              className={cn(
                'flex cursor-pointer flex-col items-start gap-1 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground',
                'peer-data-[state=checked]:border-primary',
                'peer-focus:ring-2 peer-focus:ring-ring peer-focus:ring-offset-2',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{themeEmojis[key]}</span>
                <span className="font-medium">{label}</span>
              </div>
              <span className="text-xs text-muted-foreground">{description}</span>
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  )
}
