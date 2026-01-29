'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Eye,
  EyeOff,
  Key,
  Save,
  Loader2,
  CheckCircle,
  XCircle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { ThemeSelector } from '@/components/dashboard/theme-selector'
import { DmPolicySelector } from '@/components/dashboard/dm-policy-selector'
import { telegramTokenSchema } from '@/lib/validation/bot-config'

const formSchema = z.object({
  telegramBotToken: z.string().optional(),
  botEmoji: z.string().max(4).optional(),
  botTheme: z.enum(['helpful', 'professional', 'casual', 'concise']).optional(),
  dmPolicy: z.enum(['pairing', 'allowlist', 'open']).optional(),
})

type FormValues = z.infer<typeof formSchema>

interface BotConfigFormProps {
  botId: string
  hasApiKey: boolean
  hasTelegramToken: boolean
  initialEmoji?: string
  initialTheme?: string
  initialDmPolicy?: string
}

interface TokenValidation {
  valid: boolean
  error?: string
  bot?: { username: string }
}

const emojiOptions = ['🤖', '🧠', '✨', '🎯', '🚀', '💡', '🔮', '🌟']

export function BotConfigForm({
  botId,
  hasTelegramToken,
  initialEmoji = '🤖',
  initialTheme = 'helpful',
  initialDmPolicy = 'pairing',
}: BotConfigFormProps) {
  const router = useRouter()
  const [showToken, setShowToken] = useState(false)
  const [isValidatingToken, setIsValidatingToken] = useState(false)
  const [tokenValidation, setTokenValidation] = useState<TokenValidation | null>(null)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      telegramBotToken: '',
      botEmoji: initialEmoji,
      botTheme: initialTheme as FormValues['botTheme'],
      dmPolicy: initialDmPolicy as FormValues['dmPolicy'],
    },
  })

  const { isSubmitting } = form.formState

  const validateToken = async () => {
    const token = form.getValues('telegramBotToken')
    if (!token) return

    const formatResult = telegramTokenSchema.safeParse(token)
    if (!formatResult.success) {
      setTokenValidation({
        valid: false,
        error: formatResult.error.issues[0].message,
      })
      return
    }

    setIsValidatingToken(true)
    setTokenValidation(null)

    try {
      const response = await fetch(`/api/bots/${botId}/configure/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramBotToken: token }),
      })

      const data: TokenValidation = await response.json()
      setTokenValidation(data)
    } catch {
      setTokenValidation({
        valid: false,
        error: 'Failed to validate token. Please try again.',
      })
    } finally {
      setIsValidatingToken(false)
    }
  }

  const onSubmit = async (values: FormValues) => {
    setSubmitStatus('idle')
    setSubmitError(null)

    const payload: Record<string, unknown> = {}

    if (values.telegramBotToken) {
      payload.telegramBotToken = values.telegramBotToken
    }
    if (values.botEmoji) {
      payload.botEmoji = values.botEmoji
    }
    if (values.botTheme) {
      payload.botTheme = values.botTheme
    }
    if (values.dmPolicy) {
      payload.dmPolicy = values.dmPolicy
    }

    if (Object.keys(payload).length === 0) {
      setSubmitError('No changes to save')
      setSubmitStatus('error')
      return
    }

    try {
      const response = await fetch(`/api/bots/${botId}/configure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save configuration')
      }

      setSubmitStatus('success')
      form.reset({
        telegramBotToken: '',
        botEmoji: values.botEmoji,
        botTheme: values.botTheme,
        dmPolicy: values.dmPolicy,
      })
      setTokenValidation(null)
      router.refresh()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'An error occurred')
      setSubmitStatus('error')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Bot Configuration
        </CardTitle>
        <CardDescription>
          Configure your bot settings and Telegram connection.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="telegramBotToken"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Telegram Bot Token
                    {hasTelegramToken && (
                      <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                        ✓ Configured
                      </span>
                    )}
                  </FormLabel>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <FormControl>
                        <Input
                          type={showToken ? 'text' : 'password'}
                          placeholder={
                            hasTelegramToken
                              ? '••••••••••••••••'
                              : '123456789:ABC...'
                          }
                          {...field}
                          onChange={(e) => {
                            field.onChange(e)
                            setTokenValidation(null)
                          }}
                          className="pr-10"
                        />
                      </FormControl>
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showToken ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={validateToken}
                      disabled={!field.value || isValidatingToken}
                    >
                      {isValidatingToken ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Verify'
                      )}
                    </Button>
                  </div>
                  <FormDescription>
                    Create a bot with{' '}
                    <a
                      href="https://t.me/BotFather"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-foreground"
                    >
                      @BotFather
                    </a>{' '}
                    and paste the token here
                  </FormDescription>
                  <FormMessage />
                  {tokenValidation && (
                    <div
                      className={`flex items-center gap-2 rounded-md p-2 text-sm ${
                        tokenValidation.valid
                          ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                          : 'bg-destructive/15 text-destructive'
                      }`}
                    >
                      {tokenValidation.valid ? (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          <span>Valid - @{tokenValidation.bot?.username}</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4" />
                          <span>{tokenValidation.error}</span>
                        </>
                      )}
                    </div>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="botEmoji"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bot Avatar</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {emojiOptions.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => field.onChange(e)}
                        className={`flex h-10 w-10 items-center justify-center rounded-lg border-2 text-xl transition-colors ${
                          field.value === e
                            ? 'border-primary bg-primary/10'
                            : 'border-muted hover:border-muted-foreground/50'
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="botTheme"
              render={({ field }) => (
                <FormItem>
                  <ThemeSelector
                    value={field.value || 'helpful'}
                    onChange={field.onChange}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dmPolicy"
              render={({ field }) => (
                <FormItem>
                  <DmPolicySelector
                    value={field.value || 'pairing'}
                    onChange={field.onChange}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {submitStatus === 'error' && submitError && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {submitError}
              </div>
            )}

            {submitStatus === 'success' && (
              <div className="rounded-md bg-green-500/15 p-3 text-sm text-green-600 dark:text-green-400">
                Configuration saved successfully!
              </div>
            )}

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Configuration
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
