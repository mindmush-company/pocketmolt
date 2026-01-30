import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BotDashboardGate } from "@/components/dashboard/bot-dashboard-gate"
import { BotActions } from "@/components/dashboard/bot-actions"
import { BotConfigForm } from "@/components/dashboard/bot-config-form"
import { BotHealthStatus } from "@/components/dashboard/bot-health-status"
import { BotUIEmbed } from "@/components/dashboard/bot-ui-embed"
import { BotProvisioningStatus } from "@/components/dashboard/bot-provisioning-status"
import { SetupWizard } from "@/components/dashboard/setup-wizard"
import { ChannelStatus } from "@/components/dashboard/channel-status"
import { createClient } from "@/lib/supabase/server"
import { hetzner } from "@/lib/hetzner"

interface BotDetailsProps {
  params: Promise<{ botId: string }>
}

const statusColors: Record<string, string> = {
  starting: "bg-yellow-500",
  running: "bg-green-500",
  stopped: "bg-gray-500",
  failed: "bg-red-500",
}

async function getBot(botId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: bot, error } = await supabase
    .from("bots")
    .select("*")
    .eq("id", botId)
    .eq("user_id", user.id)
    .single()

  if (error || !bot) {
    return null
  }

  let serverInfo = null
  if (bot.hetzner_server_id && bot.status === "running") {
    try {
      const { server } = await hetzner.servers.get(bot.hetzner_server_id)
      serverInfo = server
    } catch (e) {
      console.error("Failed to fetch server info", e)
    }
  }

  return { bot, serverInfo }
}

function getConfigStatus(bot: { 
  encrypted_api_key: string | null
  telegram_bot_token_encrypted: string | null
  setup_completed: boolean | null 
  channel_type: 'telegram' | 'whatsapp' | 'none'
}) {
  return {
    hasApiKey: bot.encrypted_api_key !== '' && bot.encrypted_api_key !== null,
    hasTelegramToken: bot.telegram_bot_token_encrypted !== '' && bot.telegram_bot_token_encrypted !== null,
    setupCompleted: bot.setup_completed ?? false,
    channelConfigured: bot.channel_type !== 'none'
  }
}

export default async function BotDetailsPage({ params }: BotDetailsProps) {
  const { botId } = await params
  const data = await getBot(botId)

  if (!data) {
    notFound()
  }

  const { bot, serverInfo } = data
  const configStatus = getConfigStatus(bot)

  // Show setup wizard if setup not completed OR (no channel configured AND not running)
  const showSetupWizard = !configStatus.setupCompleted && (!configStatus.channelConfigured && bot.status !== 'running')

  if (showSetupWizard) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">Set Up {bot.name}</h2>
        </div>

        {bot.status === 'starting' && (
          <BotProvisioningStatus
            botId={bot.id}
            botName={bot.name}
            initialStatus={bot.status}
            createdAt={bot.created_at}
          />
        )}

        <SetupWizard botId={bot.id} botName={bot.name} />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <Button variant="ghost" size="icon" className="-ml-3" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h2 className="text-2xl font-bold tracking-tight">{bot.name}</h2>
            <Badge
              variant="outline"
              className={`${statusColors[bot.status]} text-white border-none capitalize px-2 py-0.5`}
            >
              {bot.status}
            </Badge>
          </div>
          <div className="flex items-center text-sm text-muted-foreground pl-9 gap-4">
             <span>Created {new Date(bot.created_at).toLocaleDateString()}</span>
             {bot.status === 'running' && (
                 <BotHealthStatus botId={bot.id} botStatus={bot.status} variant="inline" />
             )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 pl-9 md:pl-0">
          <BotActions botId={bot.id} initialStatus={bot.status} />
        </div>
      </div>

      <BotDashboardGate botId={bot.id} botStatus={bot.status} botName={bot.name}>
        {bot.status === 'starting' && (
          <BotProvisioningStatus
            botId={bot.id}
            botName={bot.name}
            initialStatus={bot.status}
            createdAt={bot.created_at}
          />
        )}

        <ChannelStatus 
           botId={bot.id} 
           channelType={bot.channel_type} 
           whatsappConnectedAt={bot.whatsapp_connected_at}
           telegramBotName={undefined}
        />

        <div className="grid gap-6 md:grid-cols-1">
          <BotConfigForm
            botId={bot.id}
            hasApiKey={configStatus.hasApiKey}
            hasTelegramToken={configStatus.hasTelegramToken}
            initialEmoji={bot.bot_emoji ?? '🤖'}
            initialTheme={bot.bot_theme ?? 'helpful'}
            initialDmPolicy={bot.dm_policy ?? 'pairing'}
          />
        </div>

        {bot.status === 'running' && (
          <BotUIEmbed
            botId={bot.id}
            botStatus={bot.status}
            botName={bot.name}
          />
        )}

        <div className="pt-8">
          <details className="group">
             <summary className="flex cursor-pointer items-center text-sm text-muted-foreground hover:text-foreground select-none list-none">
               <ChevronRight className="mr-2 h-4 w-4 transition-transform group-open:rotate-90" />
               Technical Details
             </summary>
             <div className="mt-4 grid gap-4 rounded-lg border p-4 bg-muted/30 text-sm">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <div className="font-medium text-foreground">Identifiers</div>
                   <div className="flex items-center justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Bot ID</span>
                      <span className="font-mono text-xs">{bot.id}</span>
                   </div>
                   {bot.hetzner_server_id && (
                      <div className="flex items-center justify-between py-1 border-b border-border/50">
                        <span className="text-muted-foreground">Server ID</span>
                        <span className="font-mono text-xs">{bot.hetzner_server_id}</span>
                      </div>
                   )}
                 </div>
                 
                 <div className="space-y-2">
                    <div className="font-medium text-foreground">Network</div>
                     {serverInfo?.public_net?.ipv4?.ip && (
                      <div className="flex items-center justify-between py-1 border-b border-border/50">
                        <span className="text-muted-foreground">Public IP (NAT)</span>
                        <span className="font-mono text-xs">{serverInfo.public_net.ipv4.ip}</span>
                      </div>
                    )}
                    {bot.private_ip && (
                      <div className="flex items-center justify-between py-1 border-b border-border/50">
                        <span className="text-muted-foreground">Private IP</span>
                        <span className="font-mono text-xs">{bot.private_ip}</span>
                      </div>
                    )}
                 </div>
               </div>
             </div>
          </details>
        </div>
      </BotDashboardGate>
    </div>
  )
}
