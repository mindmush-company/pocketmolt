import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { hetzner } from "@/lib/hetzner"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  const { botId } = await params

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: bot, error: botError } = await supabase
      .from("bots")
      .select("*")
      .eq("id", botId)
      .eq("user_id", user.id)
      .single()

    if (botError || !bot) {
      return NextResponse.json(
        { error: "Bot not found or access denied" },
        { status: 404 }
      )
    }

    if (bot.status !== "running") {
      return NextResponse.json(
        { error: `Cannot stop bot in '${bot.status}' state` },
        { status: 400 }
      )
    }

    if (!bot.hetzner_server_id) {
      return NextResponse.json(
        { error: "Bot has no associated server" },
        { status: 400 }
      )
    }

    await hetzner.servers.powerOff(bot.hetzner_server_id)

    const { error: updateError } = await supabase
      .from("bots")
      .update({ status: "stopped" })
      .eq("id", botId)

    if (updateError) {
      console.error("Failed to update bot status:", updateError)
      return NextResponse.json(
        { error: "Failed to update bot status" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Stop bot error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
