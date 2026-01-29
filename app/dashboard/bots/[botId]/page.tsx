import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft, Server, Calendar, Hash, Activity } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BotActions } from "@/components/dashboard/bot-actions"
import { BotConfigForm } from "@/components/dashboard/bot-config-form"
import { BotHealthStatus } from "@/components/dashboard/bot-health-status"
import { BotUIEmbed } from "@/components/dashboard/bot-ui-embed"
import { BotProvisioningStatus } from "@/components/dashboard/bot-provisioning-status"
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

function getConfigStatus(bot: { encrypted_api_key: string; telegram_bot_token_encrypted: string }) {
  return {
    hasApiKey: bot.encrypted_api_key !== '',
    hasTelegramToken: bot.telegram_bot_token_encrypted !== '',
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

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">{bot.name}</h2>
        <Badge
          variant="outline"
          className={`${statusColors[bot.status]} text-white border-none capitalize`}
        >
          {bot.status}
        </Badge>
      </div>

      {bot.status === 'starting' && (
        <BotProvisioningStatus
          botId={bot.id}
          botName={bot.name}
          initialStatus={bot.status}
          createdAt={bot.created_at}
        />
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bot Control</CardTitle>
          </CardHeader>
          <CardContent>
            <BotActions botId={bot.id} initialStatus={bot.status} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center text-sm">
              <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground w-24">Created:</span>
              <span className="font-medium">
                {new Date(bot.created_at).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
            
            <div className="flex items-center text-sm">
               <Hash className="mr-2 h-4 w-4 text-muted-foreground" />
               <span className="text-muted-foreground w-24">Bot ID:</span>
               <span className="font-mono text-xs text-muted-foreground">{bot.id}</span>
            </div>

            {bot.hetzner_server_id && (
              <div className="flex items-center text-sm">
                <Server className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground w-24">Server ID:</span>
                <span className="font-mono">{bot.hetzner_server_id}</span>
              </div>
            )}

            {serverInfo?.public_net?.ipv4?.ip && (
              <div className="flex items-center text-sm">
                <Activity className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground w-24">IP Address:</span>
                <span className="font-mono">{serverInfo.public_net.ipv4.ip}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <BotConfigForm
          botId={bot.id}
          hasApiKey={configStatus.hasApiKey}
          hasTelegramToken={configStatus.hasTelegramToken}
        />

        <BotHealthStatus botId={bot.id} botStatus={bot.status} />
      </div>

      {bot.status === 'running' && (
        <BotUIEmbed
          botId={bot.id}
          botStatus={bot.status}
          botName={bot.name}
        />
      )}
    </div>
  )
}
