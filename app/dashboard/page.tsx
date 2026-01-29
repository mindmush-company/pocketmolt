import { Suspense } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { BotCard, BotCardSkeleton } from "@/components/dashboard/bot-card"
import { createClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'

function SuccessMessage({ success }: { success?: string }) {
  if (success !== "true") return null
  
  return (
    <Alert className="mb-6 border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20 text-green-800 dark:text-green-300">
      <AlertTitle>Success!</AlertTitle>
      <AlertDescription>
        Bot creation in progress! Your bot will be ready shortly.
      </AlertDescription>
    </Alert>
  )
}

async function BotList() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: bots, error } = await supabase
    .from("bots")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load bots: {error.message}
        </AlertDescription>
      </Alert>
    )
  }

  if (!bots || bots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[1.3rem] border border-dashed p-8 text-center animate-in fade-in-50">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Plus className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">No bots yet</h3>
        <p className="mb-4 mt-2 text-sm text-muted-foreground max-w-sm">
          You haven't created any MoltBots yet. Get started by creating your first bot.
        </p>
        <Button asChild>
          <Link href="/dashboard/create">Create Your First Bot</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {bots.map((bot) => (
        <BotCard key={bot.id} bot={bot} />
      ))}
    </div>
  )
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const success = (await searchParams).success

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Button asChild>
            <Link href="/dashboard/create">
              <Plus className="mr-2 h-4 w-4" /> Create Bot
            </Link>
          </Button>
        </div>
      </div>
      
      <SuccessMessage success={success as string} />
      
      <Suspense fallback={
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <BotCardSkeleton />
          <BotCardSkeleton />
          <BotCardSkeleton />
        </div>
      }>
        <BotList />
      </Suspense>
    </div>
  )
}
