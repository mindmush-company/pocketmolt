import { z } from 'zod'

// Telegram bot token format: <bot_id>:<token_string>
// bot_id: 8-10 digits
// token_string: 35 alphanumeric characters with underscores and hyphens
export const telegramTokenSchema = z
  .string()
  .min(1, 'Telegram bot token is required')
  .regex(
    /^\d{8,10}:[A-Za-z0-9_-]{35}$/,
    'Invalid Telegram bot token format. Expected format: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz1234567890'
  )

// Phone number in E.164 format
export const phoneNumberSchema = z
  .string()
  .regex(/^\+?[1-9]\d{6,14}$/, 'Invalid phone number format. Use E.164 format (e.g., +15551234567)')

// Bot emoji - single emoji character
export const botEmojiSchema = z
  .string()
  .max(4, 'Emoji must be a single character')
  .optional()
  .default('🤖')

// Bot theme/personality options
export const botThemeSchema = z
  .enum(['helpful', 'professional', 'casual', 'concise'])
  .optional()
  .default('helpful')

// DM policy options
export const dmPolicySchema = z
  .enum(['pairing', 'allowlist', 'open'])
  .optional()
  .default('pairing')

// Full bot configuration schema
export const botConfigSchema = z.object({
  telegramBotToken: telegramTokenSchema.optional(),
  botEmoji: botEmojiSchema,
  botTheme: botThemeSchema,
  primaryModel: z.string().optional(),
  dmPolicy: dmPolicySchema,
  allowFrom: z.array(phoneNumberSchema).optional().default([]),
})

// Type inference from schema
export type BotConfig = z.infer<typeof botConfigSchema>

// Validation result type
export interface ValidationResult {
  valid: boolean
  errors?: Record<string, string>
}

// Helper to validate and return friendly errors
export function validateBotConfig(data: unknown): ValidationResult {
  const result = botConfigSchema.safeParse(data)
  
  if (result.success) {
    return { valid: true }
  }
  
  const errors: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const path = issue.path.join('.')
    errors[path] = issue.message
  }
  
  return { valid: false, errors }
}

// Theme display labels
export const THEME_LABELS: Record<string, { label: string; description: string }> = {
  helpful: {
    label: 'Helpful',
    description: 'Friendly and eager to assist',
  },
  professional: {
    label: 'Professional',
    description: 'Formal and business-like',
  },
  casual: {
    label: 'Casual',
    description: 'Relaxed and conversational',
  },
  concise: {
    label: 'Concise',
    description: 'Brief, to-the-point responses',
  },
}

// DM Policy display labels
export const DM_POLICY_LABELS: Record<string, { label: string; description: string }> = {
  pairing: {
    label: 'Pairing (Recommended)',
    description: 'New users must pair their device first',
  },
  allowlist: {
    label: 'Allowlist',
    description: 'Only specified phone numbers can chat',
  },
  open: {
    label: 'Open',
    description: 'Anyone can message (not recommended)',
  },
}
