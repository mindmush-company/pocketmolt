import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "A valid email is required." },
        { status: 400 }
      )
    }

    // TODO: Wire up to your email service (Mailchimp, Resend, Supabase table, etc.)
    // For now, just log and return success.
    console.log("[waitlist] New signup:", email)

    return NextResponse.json({ message: "You're on the list!" })
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    )
  }
}
