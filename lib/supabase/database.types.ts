export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bots: {
        Row: {
          id: string
          user_id: string
          name: string
          status: 'starting' | 'running' | 'stopped' | 'failed'
          hetzner_server_id: string | null
          private_ip: string | null
          encrypted_api_key: string | null
          telegram_bot_token_encrypted: string
          client_cert: string | null
          client_key_encrypted: string | null
          bot_emoji: string | null
          bot_theme: string | null
          primary_model: string | null
          dm_policy: 'pairing' | 'allowlist' | 'open' | null
          allow_from: string[] | null
          setup_completed: boolean | null
          litellm_key_encrypted: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          status: 'starting' | 'running' | 'stopped' | 'failed'
          hetzner_server_id?: string | null
          private_ip?: string | null
          encrypted_api_key?: string | null
          telegram_bot_token_encrypted?: string
          client_cert?: string | null
          client_key_encrypted?: string | null
          bot_emoji?: string | null
          bot_theme?: string | null
          primary_model?: string | null
          dm_policy?: 'pairing' | 'allowlist' | 'open' | null
          allow_from?: string[] | null
          setup_completed?: boolean | null
          litellm_key_encrypted?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          name?: string
          status?: 'starting' | 'running' | 'stopped' | 'failed'
          hetzner_server_id?: string | null
          private_ip?: string | null
          encrypted_api_key?: string | null
          telegram_bot_token_encrypted?: string
          client_cert?: string | null
          client_key_encrypted?: string | null
          bot_emoji?: string | null
          bot_theme?: string | null
          primary_model?: string | null
          dm_policy?: 'pairing' | 'allowlist' | 'open' | null
          allow_from?: string[] | null
          setup_completed?: boolean | null
          litellm_key_encrypted?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'bots_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          bot_id: string
          stripe_subscription_id: string
          status: 'active' | 'past_due' | 'canceled' | 'unpaid'
          current_period_end: string
          cancelled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          bot_id: string
          stripe_subscription_id: string
          status: 'active' | 'past_due' | 'canceled' | 'unpaid'
          current_period_end: string
          cancelled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          bot_id?: string
          stripe_subscription_id?: string
          status?: 'active' | 'past_due' | 'canceled' | 'unpaid'
          current_period_end?: string
          cancelled_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'subscriptions_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'subscriptions_bot_id_fkey'
            columns: ['bot_id']
            referencedRelation: 'bots'
            referencedColumns: ['id']
          }
        ]
      }
      pocketmolt_ca: {
        Row: {
          id: string
          ca_cert: string
          ca_key_encrypted: string
          server_cert: string | null
          server_key_encrypted: string | null
          created_at: string
          expires_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          ca_cert: string
          ca_key_encrypted: string
          server_cert?: string | null
          server_key_encrypted?: string | null
          created_at?: string
          expires_at: string
          is_active?: boolean
        }
        Update: {
          ca_cert?: string
          ca_key_encrypted?: string
          server_cert?: string | null
          server_key_encrypted?: string | null
          expires_at?: string
          is_active?: boolean
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          id: string
          user_id: string
          balance_cents: number
          lifetime_usage_cents: number
          last_topped_up_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          balance_cents?: number
          lifetime_usage_cents?: number
          last_topped_up_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          balance_cents?: number
          lifetime_usage_cents?: number
          last_topped_up_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_credits_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      usage_log: {
        Row: {
          id: string
          user_id: string
          bot_id: string
          model: string
          input_tokens: number
          output_tokens: number
          cost_cents: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          bot_id: string
          model: string
          input_tokens: number
          output_tokens: number
          cost_cents: number
          created_at?: string
        }
        Update: {
          user_id?: string
          bot_id?: string
          model?: string
          input_tokens?: number
          output_tokens?: number
          cost_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: 'usage_log_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'usage_log_bot_id_fkey'
            columns: ['bot_id']
            referencedRelation: 'bots'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_lifetime_usage: {
        Args: {
          p_user_id: string
          p_amount: number
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
