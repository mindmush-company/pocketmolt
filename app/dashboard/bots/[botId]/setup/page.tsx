import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SetupWizard } from "@/components/dashboard/setup-wizard"
import { createClient } from "@/lib/supabase/server"

interface SetupPageProps {
  params: Promise<{ botId: string }>
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
    .select("id, name, user_id, status")
    .eq("id", botId)
    .eq("user_id", user.id)
    .single()

  if (error || !bot) {
    return null
  }

  return bot
}

export default async function SetupPage({ params }: SetupPageProps) {
  const { botId } = await params
  const bot = await getBot(botId)

  if (!bot) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/bots/${botId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Configure {bot.name}</h2>
      </div>

      <SetupWizard botId={bot.id} botName={bot.name} />
    </div>
  )
}
