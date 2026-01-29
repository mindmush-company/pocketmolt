'use client'

import { DM_POLICY_LABELS } from '@/lib/validation/bot-config'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'
import { Shield, Users, Globe } from 'lucide-react'

interface DmPolicySelectorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

const policyIcons: Record<string, React.ReactNode> = {
  pairing: <Shield className="h-4 w-4" />,
  allowlist: <Users className="h-4 w-4" />,
  open: <Globe className="h-4 w-4" />,
}

export function DmPolicySelector({ value, onChange, disabled }: DmPolicySelectorProps) {
  return (
    <div className="space-y-3">
      <Label>Who Can Message Your Bot</Label>
      <RadioGroup
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        className="space-y-2"
      >
        {Object.entries(DM_POLICY_LABELS).map(([key, { label, description }]) => (
          <div key={key} className="relative">
            <RadioGroupItem
              value={key}
              id={`dm-policy-${key}`}
              className="peer sr-only"
            />
            <Label
              htmlFor={`dm-policy-${key}`}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground',
                'peer-data-[state=checked]:border-primary',
                'peer-focus:ring-2 peer-focus:ring-ring peer-focus:ring-offset-2',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              <div className="mt-0.5 text-muted-foreground">
                {policyIcons[key]}
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-medium">{label}</span>
                <span className="text-xs text-muted-foreground">{description}</span>
              </div>
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  )
}
