import { NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import { createHash } from "crypto"

/* ─── Email validation ─── */
const waitlistSchema = z.object({
  email: z.string().email("A valid email is required."),
  consent: z.boolean().refine((v) => v === true, "Consent is required."),
  website: z.string().optional(), // honeypot
})

/* ─── In-memory rate limiter ─── */
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT_WINDOW = 10 * 60 * 1000 // 10 minutes
const RATE_LIMIT_MAX = 3

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const timestamps = rateLimitMap.get(ip) ?? []
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW)

  if (recent.length >= RATE_LIMIT_MAX) return true

  recent.push(now)
  rateLimitMap.set(ip, recent)
  return false
}

// Clean stale entries every 15 minutes
setInterval(() => {
  const now = Date.now()
  for (const [ip, timestamps] of rateLimitMap.entries()) {
    const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW)
    if (recent.length === 0) rateLimitMap.delete(ip)
    else rateLimitMap.set(ip, recent)
  }
}, 15 * 60 * 1000)

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 16)
}

/* ─── Klaviyo (v3 API) ─── */
async function subscribeToKlaviyo(email: string) {
  const apiKey = process.env.KLAVIYO_API_KEY
  const listId = process.env.KLAVIYO_LIST_ID
  if (!apiKey || !listId) return

  try {
    // 1. Create or update the profile
    const profileRes = await fetch("https://a.klaviyo.com/api/profile-import/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Klaviyo-API-Key ${apiKey}`,
        revision: "2024-10-15",
      },
      body: JSON.stringify({
        data: {
          type: "profile",
          attributes: {
            email,
            properties: { waitlist_source: "pocketmolt" },
          },
        },
      }),
    })

    const profileData = await profileRes.json()
    const profileId = profileData?.data?.id
    if (!profileId) return

    // 2. Subscribe profile to the list
    await fetch(`https://a.klaviyo.com/api/lists/${listId}/relationships/profiles/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Klaviyo-API-Key ${apiKey}`,
        revision: "2024-10-15",
      },
      body: JSON.stringify({
        data: [{ type: "profile", id: profileId }],
      }),
    })
  } catch (err) {
    console.error("[waitlist] Klaviyo error:", err)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate input
    const result = waitlistSchema.safeParse(body)
    if (!result.success) {
      const firstError = result.error.issues[0]?.message ?? "Invalid request."
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const { email, website } = result.data

    // Honeypot check — bots fill hidden fields
    if (website) {
      // Silently return success to fool the bot
      return NextResponse.json({ message: "You're on the list!" })
    }

    // Rate limiting by IP
    const forwarded = request.headers.get("x-forwarded-for")
    const ip = forwarded?.split(",")[0]?.trim() ?? "unknown"

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      )
    }

    // Store in Supabase (upsert to handle duplicates gracefully)
    const supabase = createAdminClient()
    const normalizedEmail = email.toLowerCase().trim()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: dbError } = await (supabase as any)
      .from("waitlist")
      .upsert(
        {
          email: normalizedEmail,
          ip_hash: hashIp(ip),
          consent_given: true,
        },
        { onConflict: "email", ignoreDuplicates: true }
      )

    if (dbError) {
      console.error("[waitlist] DB error:", dbError.message)
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 }
      )
    }

    // Subscribe to Klaviyo (fire and forget — don't block the response)
    subscribeToKlaviyo(normalizedEmail)

    return NextResponse.json({ message: "You're on the list!" })
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    )
  }
}
