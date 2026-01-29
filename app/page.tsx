"use client"

import { useState, useRef, useEffect } from "react"
import { motion, useScroll, useTransform, useInView } from "framer-motion"

import { Button } from "@/components/ui/button"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import Lenis from "@studio-freight/lenis"
import {
  Lock,
  Terminal,
  CheckCircle,
  X,
  ShieldCheck,
  Network,
  Database,
  KeyRound,
  Linkedin,
  ArrowRight,
  ArrowUpRight,
  Eye,
  Fingerprint,
  ScanLine,
  ChevronDown,
} from "lucide-react"

gsap.registerPlugin(ScrollTrigger)

/* ─── Smooth scroll + GSAP integration ─── */
function useLenis() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    })
    lenis.on("scroll", ScrollTrigger.update)
    const tickerCallback = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tickerCallback)
    gsap.ticker.lagSmoothing(0)
    return () => {
      lenis.destroy()
      gsap.ticker.remove(tickerCallback)
    }
  }, [])
}

/* ─── Reveal wrapper ─── */
function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-60px" })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.8, delay, ease: [0.25, 0.4, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ─── Hero Background Pattern ─── */
function HeroPattern() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Silver metallic gradient sweep — top-left to bottom-right */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          background:
            "linear-gradient(135deg, transparent 0%, #C0C0C0 15%, transparent 30%, #D8D8D8 45%, transparent 55%, #A8A8A8 70%, transparent 85%)",
          backgroundSize: "200% 200%",
        }}
      />
      {/* Subtle horizontal brushed-metal lines */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, #ffffff 3px, #ffffff 4px)",
        }}
      />
      {/* Silver radial highlight — like light catching metal */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_35%,rgba(200,200,210,0.06),transparent_70%)]" />
      {/* Edge fade to black */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_40%,transparent_25%,#000000_100%)]" />
    </div>
  )
}

/* ─── FAQ Item ─── */
function FAQItem({ question, answer, delay = 0 }: { question: string; answer: string; delay?: number }) {
  const [open, setOpen] = useState(false)
  return (
    <motion.div
      className="border-b border-white/[0.06]"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-[16px] font-medium text-foreground">{question}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
        className="overflow-hidden"
      >
        <p className="pb-5 text-[15px] leading-relaxed text-muted-foreground">{answer}</p>
      </motion.div>
    </motion.div>
  )
}

/* ─── Live threat counter ─── */


/* ─── Security Feature Card ─── */
function SecurityCard({
  icon: Icon,
  title,
  description,
  delay = 0,
}: {
  icon: React.ElementType
  title: string
  description: string
  delay?: number
}) {
  return (
    <Reveal delay={delay} className="h-full">
      <div className="group relative flex h-full flex-col overflow-hidden rounded-[20px] border border-white/[0.08] bg-gradient-to-b from-white/[0.07] to-white/[0.03] backdrop-blur-sm transition-all duration-300 hover:-translate-y-[2px] hover:border-white/[0.12] shadow-[0_1px_2px_rgba(0,0,0,0.4),0_4px_8px_rgba(0,0,0,0.2),0_16px_32px_rgba(0,0,0,0.15)] hover:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_8px_16px_rgba(0,0,0,0.25),0_24px_48px_rgba(0,0,0,0.2)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.1),0_1px_2px_rgba(0,0,0,0.4),0_4px_8px_rgba(0,0,0,0.2),0_16px_32px_rgba(0,0,0,0.15)]">
        <div className="flex grow flex-col p-10 pb-8">
          <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.04] transition-colors duration-300 group-hover:bg-primary/10">
            <Icon className="h-5 w-5 text-foreground/60 transition-colors group-hover:text-primary" />
          </div>
          <h3 className="font-display mb-3 text-lg font-semibold text-foreground">
            {title}
          </h3>
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </Reveal>
  )
}

/* ─── Horizontal Timeline ─── */
function HorizontalTimeline() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 80%", "end 40%"],
  })
  const lineWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"])

  const steps = [
    { step: "1", title: "Sign up", description: "Create your account in seconds. No credit card, no complicated setup." },
    { step: "2", title: "Paste your keys", description: "Drop your API keys into the dashboard. That's the only thing you need to configure." },
    { step: "3", title: "Your bot is live", description: "MoltBot is deployed, encrypted, and monitored — running 24/7 without you lifting a finger." },
  ]

  return (
    <div ref={containerRef} className="relative">
      {/* Horizontal line track — desktop */}
      <div className="absolute left-0 right-0 top-6 hidden h-[2px] bg-white/[0.06] md:block">
        <motion.div
          className="h-full origin-left bg-primary"
          style={{ width: lineWidth }}
        />
      </div>

      {/* Vertical line track — mobile */}
      <div className="absolute left-6 top-6 bottom-6 w-[2px] bg-white/[0.06] md:hidden">
        <motion.div
          className="w-full origin-top bg-primary"
          style={{ height: lineWidth }}
        />
      </div>

      <div className="flex flex-col gap-10 md:grid md:grid-cols-3 md:gap-8">
        {steps.map((item, i) => (
          <HorizontalTimelineStep key={item.step} {...item} index={i} />
        ))}
      </div>
    </div>
  )
}

function HorizontalTimelineStep({
  step,
  title,
  description,
  index,
}: {
  step: string
  title: string
  description: string
  index: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-20% 0px -20% 0px" })

  return (
    <motion.div
      ref={ref}
      className="flex gap-5 md:flex-col md:gap-0"
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.6, delay: index * 0.15, ease: [0.25, 0.4, 0.25, 1] }}
    >
      {/* Dot */}
      <motion.div
        className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold md:mb-8"
        animate={{
          borderColor: isInView ? "var(--primary)" : "rgba(255,255,255,0.08)",
          backgroundColor: isInView ? "var(--primary)" : "transparent",
          color: isInView ? "var(--primary-foreground)" : "rgba(255,255,255,0.25)",
        }}
        transition={{ duration: 0.5, delay: index * 0.15 + 0.2, ease: [0.25, 0.4, 0.25, 1] }}
      >
        {step}
        {isInView && (
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/20 blur-[12px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: index * 0.15 + 0.2 }}
          />
        )}
      </motion.div>

      {/* Content */}
      <div className="pt-1 md:pt-0">
        <h3 className="font-display text-lg font-bold text-foreground md:text-2xl">
          {title}
        </h3>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground md:mt-3 md:text-[15px]">
          {description}
        </p>
      </div>
    </motion.div>
  )
}

/* ─── Team Member Card ─── */
function TeamCard({
  name,
  role,
  bio,
  image,
  socials,
  delay = 0,
}: {
  name: string
  role: string
  bio: string
  image?: string
  socials?: { linkedin?: string; x?: string }
  delay?: number
}) {
  return (
    <Reveal delay={delay} className="h-full min-w-[260px] snap-center">
      <div className="group relative flex h-full flex-col overflow-hidden rounded-[16px] border border-white/[0.08] bg-gradient-to-b from-white/[0.07] to-white/[0.03] backdrop-blur-sm transition-all duration-300 hover:-translate-y-[2px] hover:border-white/[0.12] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.1),0_1px_2px_rgba(0,0,0,0.4),0_4px_8px_rgba(0,0,0,0.2)]">
        {/* Portrait */}
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-gradient-to-br from-white/[0.04] to-white/[0.01]">
          {image ? (
            <img src={image} alt={name} loading="lazy" className="h-full w-full object-cover object-top" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.04]">
                <span className="font-display text-2xl font-bold text-white/20">
                  {name.split(" ").map(n => n[0]).join("")}
                </span>
              </div>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/60 to-transparent" />
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col p-5 pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/80">{role}</p>
          <h3 className="font-display mt-1 text-base font-bold text-foreground">{name}</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{bio}</p>

          {socials && (
            <div className="mt-auto flex items-center gap-2 pt-4">
              {socials.linkedin && (
                <a
                  href={socials.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04] text-muted-foreground transition-all duration-200 hover:bg-white/[0.08] hover:text-foreground"
                >
                  <Linkedin className="h-3 w-3" />
                </a>
              )}
              {socials.x && (
                <a
                  href={socials.x}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04] text-muted-foreground transition-all duration-200 hover:bg-white/[0.08] hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </Reveal>
  )
}

/* ─── iPhone Mockup ─── */
function IPhoneMockup({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      {/* Ambient glow behind phone */}
      <div className="pointer-events-none absolute -inset-12 rounded-full bg-[#A855F7]/[0.06] blur-[80px]" />

      {/* Outer titanium bezel — multi-layer for realism */}
      <div className="relative rounded-[56px] bg-gradient-to-b from-[#3A3A3F] via-[#2A2A2E] to-[#1A1A1E] p-[2.5px] [box-shadow:0_40px_80px_-20px_rgba(0,0,0,0.7),0_20px_40px_-10px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.12)]">
        {/* Inner bezel ring */}
        <div className="rounded-[53.5px] bg-gradient-to-b from-[#222225] to-[#161618] p-[2px]">
          <div className="rounded-[51.5px] bg-[#1A1A1E] p-[9px]">
            {/* Screen */}
            <div className="relative flex aspect-[9/19.5] flex-col items-center overflow-hidden rounded-[43px] bg-[#050507]">
              {/* Subtle screen edge highlight */}
              <div className="pointer-events-none absolute inset-0 rounded-[43px] ring-1 ring-inset ring-white/[0.04]" />

              {/* Dynamic Island */}
              <div className="relative mt-3 h-[30px] w-[110px] rounded-full bg-black [box-shadow:inset_0_0_4px_rgba(0,0,0,0.8),0_0_0_0.5px_rgba(255,255,255,0.04)]">
                {/* Camera lens dot */}
                <div className="absolute right-[22px] top-1/2 h-[8px] w-[8px] -translate-y-1/2 rounded-full bg-[#0D0D10] ring-1 ring-[#1a1a20]">
                  <div className="absolute inset-[2px] rounded-full bg-[#1a1a2a] [box-shadow:inset_0_0_2px_rgba(100,100,255,0.15)]" />
                </div>
              </div>

              {/* Status bar */}
              <div className="mt-1.5 flex w-full items-center justify-between px-8">
                <p className="text-[12px] font-semibold text-white/60">9:41</p>
                <div className="flex items-center gap-1.5">
                  {/* Signal bars */}
                  <div className="flex items-end gap-[2px]">
                    {[5, 7, 9, 11].map((h, i) => (
                      <div key={i} className={`w-[3px] rounded-full ${i <= 2 ? "bg-white/60" : "bg-white/20"}`} style={{ height: `${h}px` }} />
                    ))}
                  </div>
                  {/* Wi-Fi */}
                  <svg className="h-[12px] w-[12px] text-white/60" viewBox="0 0 24 24" fill="currentColor"><path d="M12 18c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 .45 1 1 1zm-4.24-4.24l1.41 1.41C10.07 14.27 10.97 14 12 14s1.93.27 2.83.17l1.41-1.41C14.9 11.59 13.51 11 12 11s-2.9.59-4.24 1.76zM2.81 8.81l1.41 1.41C6.36 8.08 9.05 7 12 7s5.64 1.08 7.78 3.22l1.41-1.41C18.68 6.3 15.53 5 12 5S5.32 6.3 2.81 8.81z"/></svg>
                  {/* Battery */}
                  <div className="flex items-center gap-[2px]">
                    <div className="h-[11px] w-[20px] rounded-[3px] border border-white/30 p-[1.5px]">
                      <div className="h-full w-[70%] rounded-[1.5px] bg-white/60" />
                    </div>
                    <div className="h-[5px] w-[1.5px] rounded-r-full bg-white/30" />
                  </div>
                </div>
              </div>

              {/* App content */}
              <PhoneWaitlistUI />

              {/* Home indicator */}
              <div className="mb-2 h-[5px] w-[134px] rounded-full bg-white/25" />
            </div>
          </div>
        </div>
      </div>

      {/* Side buttons — left */}
      <div className="absolute left-[-2px] top-[120px] h-[28px] w-[3px] rounded-l-full bg-gradient-to-b from-[#3A3A3F] to-[#2A2A2E] [box-shadow:-1px_0_2px_rgba(0,0,0,0.3)]" />
      <div className="absolute left-[-2px] top-[165px] h-[52px] w-[3px] rounded-l-full bg-gradient-to-b from-[#3A3A3F] to-[#2A2A2E] [box-shadow:-1px_0_2px_rgba(0,0,0,0.3)]" />
      <div className="absolute left-[-2px] top-[225px] h-[52px] w-[3px] rounded-l-full bg-gradient-to-b from-[#3A3A3F] to-[#2A2A2E] [box-shadow:-1px_0_2px_rgba(0,0,0,0.3)]" />
      {/* Side button — right (power) */}
      <div className="absolute right-[-2px] top-[180px] h-[68px] w-[3px] rounded-r-full bg-gradient-to-b from-[#3A3A3F] to-[#2A2A2E] [box-shadow:1px_0_2px_rgba(0,0,0,0.3)]" />
    </div>
  )
}

/* ─── Phone Waitlist UI ─── */
function PhoneWaitlistUI() {
  const [email, setEmail] = useState("")
  const [consent, setConsent] = useState(false)
  const [honeypot, setHoneypot] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "rate-limited">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  const handleSubmit = async () => {
    if (!email || !consent) return
    setStatus("loading")
    setErrorMsg("")
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, consent, website: honeypot }),
      })
      if (res.ok) {
        setStatus("success")
        setEmail("")
      } else {
        const data = await res.json().catch(() => ({}))
        if (res.status === 429) {
          setStatus("rate-limited")
          setErrorMsg(data.error ?? "Too many requests. Try again later.")
        } else {
          setStatus("error")
          setErrorMsg(data.error ?? "Something went wrong. Try again.")
        }
      }
    } catch {
      setStatus("error")
      setErrorMsg("Something went wrong. Try again.")
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center px-5 pt-6 pb-2">
      {/* App icon + branding */}
      <div className="flex flex-1 flex-col items-center justify-center gap-5">
        {/* Premium app icon with layered glow */}
        <div className="relative">
          <div className="absolute -inset-3 rounded-3xl bg-[#A855F7]/10 blur-xl" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-[18px] bg-gradient-to-br from-[#A855F7] via-[#9333EA] to-[#7C3AED] [box-shadow:0_4px_16px_rgba(168,85,247,0.35),inset_0_1px_0_rgba(255,255,255,0.2)]">
            <Terminal className="h-7 w-7 text-white" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <p className="font-display text-[17px] font-bold tracking-tight text-white">PocketMolt</p>
          <p className="max-w-[180px] text-center text-[12px] leading-snug text-white/35">
            Deploy your MoltBot in minutes
          </p>
        </div>

        {/* Trust indicators */}
        <div className="flex items-center gap-3 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-1.5">
          <div className="flex items-center gap-1.5">
            <div className="h-[6px] w-[6px] rounded-full bg-emerald-400 [box-shadow:0_0_6px_rgba(52,211,153,0.5)]" />
            <span className="text-[10px] font-medium text-white/40">Encrypted</span>
          </div>
          <div className="h-3 w-px bg-white/[0.08]" />
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-[10px] w-[10px] text-white/30" />
            <span className="text-[10px] font-medium text-white/40">Secured</span>
          </div>
        </div>
      </div>

      {/* Email input + button */}
      <div className="w-full space-y-3 pb-5">
        {status === "success" ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#A855F7]/10 bg-[#A855F7]/[0.04] py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#A855F7]/10">
              <CheckCircle className="h-5 w-5 text-[#A855F7]" />
            </div>
            <p className="text-[14px] font-semibold text-white/90">You&apos;re on the list!</p>
            <p className="text-[11px] text-white/35">We&apos;ll be in touch soon</p>
          </div>
        ) : (
          <>
            <div className="relative">
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (status === "error" || status === "rate-limited") setStatus("idle")
                }}
                onFocus={(e) => {
                  setTimeout(() => {
                    e.target.scrollIntoView({ behavior: "smooth", block: "center" })
                  }, 300)
                }}
                className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3.5 text-[14px] text-white placeholder:text-white/25 outline-none transition-all duration-200 focus:border-[#A855F7]/30 focus:bg-white/[0.06] focus:[box-shadow:0_0_0_3px_rgba(168,85,247,0.08)]"
              />
            </div>
            {/* Honeypot — hidden from humans, bots fill it */}
            <input
              type="text"
              name="website"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0 }}
            />
            <button
              onClick={handleSubmit}
              disabled={status === "loading" || !consent}
              className="w-full rounded-2xl bg-gradient-to-b from-[#A855F7] to-[#8B33E0] py-3.5 text-[14px] font-semibold text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-40 [box-shadow:0_0_0_1px_rgba(168,85,247,0.5),0_4px_16px_rgba(168,85,247,0.3),0_1px_2px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.15)]"
            >
              {status === "loading" ? "Joining..." : "Join Waitlist"}
            </button>
            {/* GDPR consent */}
            <label className="flex items-start gap-2.5 cursor-pointer pt-0.5">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-white/20 bg-white/5 accent-[#A855F7]"
              />
              <span className="text-[10px] leading-snug text-white/30">
                I agree to the{" "}
                <a href="/terms" target="_blank" className="underline hover:text-white/45">Terms of Service</a>{" "}
                and to receive updates. No spam, unsubscribe anytime.
              </span>
            </label>
          </>
        )}
        {(status === "error" || status === "rate-limited") && (
          <p className="text-center text-[11px] text-red-400">{errorMsg}</p>
        )}
        <p className="text-center text-[10px] tracking-wide text-white/20">
          1,000 spots &middot; first come, first serve
        </p>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   ═══ MAIN PAGE ═══
   ═══════════════════════════════════════════════ */
export default function Home() {
  useLenis()

  const [heroFocusPhone, setHeroFocusPhone] = useState(false)
  const heroRef = useRef<HTMLElement>(null)
  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  })
  const heroOpacity = useTransform(heroScroll, [0, 0.7], [1, 0])
  const heroY = useTransform(heroScroll, [0, 0.7], [0, -80])

  return (
    <div className="flex min-h-screen flex-col">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.04] bg-black/80 backdrop-blur-xl [box-shadow:0_1px_0_rgba(255,255,255,0.03)]">
        <div className="container flex h-16 items-center justify-between">
          <a
            className="flex cursor-pointer items-center"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <span className="font-display text-lg font-semibold">PocketMolt</span>
          </a>
          <div className="flex items-center gap-1 md:gap-2">
            <nav className="flex items-center">
              {["Demo", "Security", "Team"].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                  className="hidden rounded-lg px-4 py-2 text-sm text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-white/[0.03] md:block"
                >
                  {item}
                </a>
              ))}
            </nav>
            <a href="#waitlist" className="ml-1 md:ml-3">
              <Button
                size="sm"
                className="h-9 rounded-lg border border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(220,218,214,0.9)_50%,rgba(180,178,174,0.85)_100%)] px-5 text-sm font-semibold text-[#111] backdrop-blur-sm transition-all duration-300 hover:-translate-y-[1px] hover:brightness-105 [box-shadow:inset_0_1px_0_rgba(255,255,255,0.8),inset_0_-1px_2px_rgba(0,0,0,0.06),0_0_0_0.5px_rgba(255,255,255,0.3),0_2px_8px_rgba(0,0,0,0.25),0_8px_20px_rgba(0,0,0,0.15)] hover:[box-shadow:inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-1px_2px_rgba(0,0,0,0.06),0_0_0_0.5px_rgba(255,255,255,0.4),0_4px_12px_rgba(0,0,0,0.3),0_12px_28px_rgba(0,0,0,0.2),0_0_20px_rgba(255,255,255,0.05)]"
              >
                Join Waitlist
              </Button>
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ── */}
        <section ref={heroRef} className="relative flex min-h-[100dvh] flex-col justify-center overflow-hidden pt-24 md:pt-32">
          {/* Star field */}
          <HeroPattern />

          {/* Ambient glow */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[15%] top-[20%] h-[600px] w-[600px] rounded-full bg-primary/6 blur-[180px]" />
            <div className="absolute left-[5%] top-[10%] h-[400px] w-[400px] rounded-full bg-[#6366F1]/5 blur-[130px]" />
            <div className="absolute right-[10%] bottom-[20%] h-[350px] w-[350px] rounded-full bg-[#A855F7]/4 blur-[120px]" />
          </div>

          <motion.div style={{ opacity: heroOpacity, y: heroY }} className="relative w-full">
            <div className="container mx-auto px-4 md:px-6">
              <div className="flex flex-col items-center text-center">
                {/* Content — always centered */}
                <motion.div
                  className="flex flex-col items-center gap-8"
                  animate={{
                    y: heroFocusPhone ? -40 : 0,
                    opacity: heroFocusPhone ? 0 : 1,
                    scale: heroFocusPhone ? 0.96 : 1,
                  }}
                  transition={{ duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
                  style={{ pointerEvents: heroFocusPhone ? "none" : "auto" }}
                >
                  <motion.h1
                    className="font-display text-[3.5rem] font-extrabold tracking-tighter text-foreground sm:text-[4.5rem] md:text-[5.5rem] xl:text-[6rem] leading-[0.95]"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.1, ease: [0.25, 0.4, 0.25, 1] }}
                  >
                    MoltBot in Your
                    <br />
                    Pocket in Seconds
                  </motion.h1>

                  <motion.p
                    className="max-w-[520px] text-lg leading-relaxed text-muted-foreground"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.4, 0.25, 1] }}
                  >
                    PocketMolt is the app that deploys, secures, and monitors your MoltBot for you.{" "}
                    <span className="text-foreground font-medium">
                      No server setup. No security configs. No maintenance.
                    </span>{" "}
                    Just paste your keys and you&apos;re live.
                  </motion.p>

                  <motion.div
                    className="flex flex-wrap items-center justify-center gap-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
                  >
                    <Button
                      onClick={() => setHeroFocusPhone(true)}
                      className="h-13 rounded-xl border border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(220,218,214,0.9)_50%,rgba(180,178,174,0.85)_100%)] px-8 text-[15px] font-semibold text-[#111] backdrop-blur-sm transition-all duration-300 hover:-translate-y-[1px] hover:brightness-105 [box-shadow:inset_0_1px_0_rgba(255,255,255,0.8),inset_0_-1px_2px_rgba(0,0,0,0.06),0_0_0_0.5px_rgba(255,255,255,0.3),0_2px_8px_rgba(0,0,0,0.25),0_8px_20px_rgba(0,0,0,0.15),0_0_40px_rgba(255,255,255,0.04)] hover:[box-shadow:inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-1px_2px_rgba(0,0,0,0.06),0_0_0_0.5px_rgba(255,255,255,0.4),0_4px_12px_rgba(0,0,0,0.3),0_16px_32px_rgba(0,0,0,0.2),0_0_50px_rgba(255,255,255,0.06)]"
                    >
                      Join Waitlist
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <a
                      href="#demo"
                      className="inline-flex h-13 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-8 text-[15px] font-medium text-foreground transition-all duration-200 hover:-translate-y-[1px] hover:border-white/[0.12] hover:bg-white/[0.05]"
                    >
                      See how it works
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  </motion.div>

                  {/* Scarcity trust line */}
                  <motion.div
                    className="flex items-center gap-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                  >
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[13px] text-muted-foreground">
                      Initial launch capped at <span className="text-foreground/70 font-medium">1,000 users</span>
                    </span>
                  </motion.div>
                </motion.div>

                {/* iPhone — sits low, partially behind the security bar like in a pocket */}
                <motion.div
                  className="relative mt-12 md:mt-16"
                  animate={{
                    y: heroFocusPhone ? -300 : 80,
                    scale: heroFocusPhone ? 1.15 : 1,
                    zIndex: heroFocusPhone ? 20 : 1,
                  }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-[100px]" />
                  <motion.div
                    animate={{ y: heroFocusPhone ? 0 : [0, -6, 0] }}
                    transition={heroFocusPhone ? { duration: 0.4 } : { duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <IPhoneMockup className="w-[260px] md:w-[300px]" />
                  </motion.div>

                  {/* Back button — sits right below the phone */}
                  <motion.button
                    onClick={() => setHeroFocusPhone(false)}
                    className="mx-auto mt-8 flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                    animate={{
                      opacity: heroFocusPhone ? 1 : 0,
                    }}
                    transition={{ duration: 0.4, delay: heroFocusPhone ? 0.5 : 0 }}
                    style={{ pointerEvents: heroFocusPhone ? "auto" : "none" }}
                  >
                    ← Back
                  </motion.button>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Security features row pinned to hero bottom — acts as the "pocket" */}
          <motion.div
            className="absolute inset-x-0 bottom-0 z-10 border-t border-white/[0.08] bg-black/95 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <div className="container mx-auto grid grid-cols-2 gap-y-0 px-4 py-0 md:grid-cols-4 md:px-6">
              {[
                { title: "Fully encrypted", desc: "by default", icon: Lock },
                { title: "Your data", desc: "stays yours", icon: Database },
                { title: "Always on", desc: "99.9% uptime", icon: ShieldCheck },
                { title: "Monitored", desc: "around the clock", icon: Eye },
              ].map((item, i) => (
                <div
                  key={item.title}
                  className={`flex items-center gap-4 px-6 py-6 ${
                    i < 3 ? "md:border-r md:border-white/[0.06]" : ""
                  } ${i < 2 ? "border-b border-white/[0.06] md:border-b-0" : i === 2 ? "border-b border-white/[0.06] md:border-b-0" : ""}`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04]">
                    <item.icon className="h-4 w-4 text-primary/70" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[14px] font-semibold text-foreground">{item.title}</span>
                    <span className="text-[12px] text-foreground/40">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </section>


        {/* ── VSL Video ── */}
        <section id="demo" className="relative w-full py-24 md:py-32">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/4 blur-[180px]" />
          </div>

          <div className="container relative mx-auto px-4 md:px-6">
            <Reveal>
              <div className="mb-12 max-w-2xl mx-auto text-center">
                <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl md:text-5xl">
                  See how it works
                </h2>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  See how fast you can go from zero to a running, secured MoltBot — without touching a terminal.
                </p>
              </div>
            </Reveal>

            <motion.div
              className="mx-auto max-w-4xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="relative overflow-hidden rounded-[20px] border border-white/[0.08] bg-white/[0.03] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.06),0_4px_12px_rgba(0,0,0,0.4),0_24px_48px_rgba(0,0,0,0.2)]">
                {/* 16:9 aspect ratio container */}
                <div className="relative aspect-video w-full bg-black/40">
                  {/* Placeholder — replace with actual video iframe when ready */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.05] backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-white/[0.08]">
                      <svg className="ml-1 h-6 w-6 text-foreground/70" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    <span className="text-[13px] text-muted-foreground">Video coming soon</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Cybersecurity Bento Grid ── */}
        <section className="relative w-full overflow-hidden py-24 md:py-32">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[20%] top-0 h-[600px] w-[600px] rounded-full bg-[#A855F7]/4 blur-[150px]" />
            <div className="absolute right-[10%] bottom-[10%] h-[400px] w-[400px] rounded-full bg-[#A855F7]/3 blur-[120px]" />
          </div>

          <div className="container relative mx-auto px-4 md:px-6">
            <Reveal>
              <div className="mb-16 max-w-3xl">
                <h2 className="font-display text-4xl font-bold text-foreground sm:text-5xl md:text-6xl">
                  Why not just
                  self-host?
                </h2>
                <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                  Because one wrong config and your bot is wide open. Leaked API keys,
                  no firewall, no encryption. Most people find out they were hacked
                  weeks after it happened.
                </p>
              </div>
            </Reveal>

            {/* Bento Grid */}
            <div className="grid gap-8">
              {/* ── Full-width card: Threat Landscape ── */}
              <motion.div
                className="group relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-gradient-to-b from-white/[0.07] to-white/[0.03] backdrop-blur-sm [box-shadow:inset_0_1px_0_rgba(255,255,255,0.1),0_1px_2px_rgba(0,0,0,0.4),0_8px_16px_rgba(0,0,0,0.2),0_32px_64px_rgba(0,0,0,0.1)]"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                {/* Hover gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#A855F7]/5 to-transparent opacity-40 transition-opacity duration-700 group-hover:opacity-60" />

                <div className="relative flex h-full flex-col p-8 md:p-10">
                  <div className="mb-8">
                    <h3 className="font-display text-2xl font-bold text-foreground">
                      What you&apos;re risking on your own
                    </h3>
                    <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                      Self-hosting means you&apos;re responsible for every layer of security. Most setups have critical gaps from day one.
                    </p>
                  </div>

                  {/* Risk list */}
                  <ul className="mt-8 space-y-3">
                    {[
                      "Your bot can be taken down by a simple DDoS attack",
                      "API keys sit in plaintext — anyone with access can read them",
                      "Traffic is unencrypted unless you set it up yourself",
                      "You're responsible for patching, updates, and firewall rules",
                      "No alerts — you won't know you've been breached until it's too late",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3 text-[14px] text-muted-foreground">
                        <X className="mt-0.5 h-4 w-4 shrink-0 text-[#A855F7]/60" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>

              <div className="grid gap-8 md:grid-cols-2">
              {/* ── PocketMolt Protection ── */}
              <motion.div
                className="group relative overflow-hidden rounded-[24px] border border-[#A855F7]/[0.12] bg-gradient-to-br from-[#A855F7]/[0.06] to-white/[0.03] backdrop-blur-sm [box-shadow:inset_0_1px_0_rgba(168,85,247,0.06),0_1px_2px_rgba(0,0,0,0.4),0_8px_16px_rgba(0,0,0,0.2),0_32px_64px_rgba(0,0,0,0.1)]"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                {/* Hover gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#A855F7]/5 to-transparent opacity-40 transition-opacity duration-700 group-hover:opacity-60" />

                <div className="relative p-8 md:p-10">
                  <div className="mb-6">
                    <h3 className="font-display text-2xl font-bold text-foreground">
                      What PocketMolt handles for you
                    </h3>
                    <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                      All of this is set up automatically when you deploy through PocketMolt. Zero config required.
                    </p>
                  </div>

                  {/* Floating protection UI */}
                  <div className="relative mt-4 rounded-[16px] border border-[#A855F7]/[0.06] bg-white/[0.02] p-5 backdrop-blur-sm [box-shadow:inset_0_1px_0_rgba(168,85,247,0.04)]">
                    <div className="space-y-3.5">
                      {[
                        { icon: Lock, label: "Every connection verified & encrypted" },
                        { icon: Network, label: "Firewall blocks unauthorized access" },
                        { icon: Database, label: "Your data encrypted at rest & in transit" },
                        { icon: Eye, label: "Threats detected before they reach you" },
                        { icon: ScanLine, label: "Vulnerabilities patched automatically" },
                        { icon: Fingerprint, label: "Nobody gets in without authorization" },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-3">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#A855F7]/10">
                            <item.icon className="h-3.5 w-3.5 text-[#A855F7]" />
                          </div>
                          <p className="text-[14px] font-medium text-foreground">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* ── Bottom right card: Comparison Table ── */}
              <motion.div
                className="group relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-gradient-to-b from-white/[0.07] to-white/[0.03] backdrop-blur-sm [box-shadow:inset_0_1px_0_rgba(255,255,255,0.1),0_1px_2px_rgba(0,0,0,0.4),0_8px_16px_rgba(0,0,0,0.2),0_32px_64px_rgba(0,0,0,0.1)]"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent opacity-40 transition-opacity duration-700 group-hover:opacity-60" />

                <div className="relative p-8 md:p-10">
                  <div className="mb-8">
                    <h3 className="font-display text-2xl font-bold text-foreground">
                      The difference is everything
                    </h3>
                  </div>

                  {/* Comparison table */}
                  <div className="overflow-hidden rounded-[16px] border border-white/[0.06]">
                    {/* Header row */}
                    <div className="grid grid-cols-[1fr_1fr] border-b border-white/[0.06] bg-white/[0.03]">
                      <div className="px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-[#A855F7]/70">Self-hosted</div>
                      <div className="border-l border-white/[0.06] px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-[#A855F7]">PocketMolt</div>
                    </div>

                    {/* Comparison rows */}
                    {[
                      { self: "Data exposed in transit", pocket: "Encrypted end-to-end" },
                      { self: "Open to the internet", pocket: "Locked down by default" },
                      { self: "You find out after the hack", pocket: "Alerts before damage" },
                      { self: "Hours of manual setup", pocket: "Live in minutes" },
                      { self: "Keys in plaintext files", pocket: "Secrets vault, encrypted" },
                    ].map((row, i) => (
                      <div key={row.self} className={`grid grid-cols-[1fr_1fr] ${i < 4 ? "border-b border-white/[0.04]" : ""}`}>
                        <div className="flex items-center gap-2.5 px-5 py-3.5 text-[13px] text-muted-foreground/50">
                          <X className="h-3.5 w-3.5 shrink-0 text-[#A855F7]/40" />
                          {row.self}
                        </div>
                        <div className="flex items-center gap-2.5 border-l border-white/[0.06] px-5 py-3.5 text-[13px] font-medium text-foreground/80">
                          <CheckCircle className="h-3.5 w-3.5 shrink-0 text-[#A855F7]" />
                          {row.pocket}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
              </div>

            </div>
          </div>
        </section>

        {/* ── Security Deep Dive ── */}
        <section id="security" className="relative w-full py-24 md:py-32">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-0 top-1/4 h-[400px] w-[400px] rounded-full bg-[#A855F7]/4 blur-[120px]" />
          </div>

          <div className="container relative mx-auto px-4 md:px-6">
            <Reveal>
              <div className="mb-20 max-w-2xl">
                <h2 className="font-display text-4xl font-bold text-foreground sm:text-5xl md:text-6xl">
                  Security you don&apos;t have to think about
                </h2>
                <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                  Every layer of protection is built in from the start. You get enterprise-grade
                  security without configuring a single thing.
                </p>
              </div>
            </Reveal>

            <div className="grid gap-8 sm:grid-cols-2">
              <SecurityCard icon={Lock} title="Verified connections only" description="Both sides of every connection prove their identity with certificates. Impersonation and interception are impossible." delay={0} />
              <SecurityCard icon={Network} title="Locked down by default" description="All external access is blocked unless explicitly allowed. Only authorized traffic reaches your bot." delay={0.1} />
              <SecurityCard icon={Database} title="Nothing stored in plaintext" description="Your database, configs, and API keys are encrypted at every layer. No gaps, no exceptions." delay={0.15} />
              <SecurityCard icon={KeyRound} title="Protected at rest & in motion" description="AES-256 for stored data, TLS 1.3 for data in transit. Your information is safe whether it's sitting still or moving." delay={0.2} />
            </div>

          </div>
        </section>

        {/* ── Team ── */}
        <section id="team" className="w-full py-24 md:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <Reveal>
              <div className="mb-12 max-w-2xl">
                <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl md:text-5xl">
                  Meet the team
                </h2>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  The people making sure your MoltBot runs safely, so you never have to worry about it.
                </p>
              </div>
            </Reveal>

            {/* Horizontal scroll on mobile, grid on desktop */}
            <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
              <TeamCard
                name="Rafael"
                role="Founder"
                bio="Obsessed with making MoltBot deployment something anyone can do — no tech skills needed."
                image="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop&crop=face"
                socials={{ linkedin: "#", x: "#" }}
                delay={0}
              />
              <TeamCard
                name="Juan"
                role="Cybersecurity Lead"
                bio="Makes sure every bot deployed through PocketMolt is locked down and monitored 24/7."
                image="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600&h=800&fit=crop&crop=face"
                socials={{ linkedin: "#" }}
                delay={0.1}
              />
              <TeamCard
                name="Team Member"
                role="Role"
                bio="Replace this with a short bio about the team member and their contribution."
                image="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&h=800&fit=crop&crop=face"
                socials={{ linkedin: "#", x: "#" }}
                delay={0.2}
              />
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="w-full py-24 md:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <Reveal>
              <div className="mb-12 max-w-2xl">
                <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl md:text-5xl">
                  Frequently asked questions
                </h2>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  Everything you need to know about PocketMolt.
                </p>
              </div>
            </Reveal>

            <div className="grid gap-0 md:grid-cols-2 md:gap-x-16">
              {[
                { q: "What exactly is PocketMolt?", a: "PocketMolt is an app that deploys and runs your MoltBot for you. You sign up, paste your API keys, and your bot is live — fully hosted, secured, and monitored. No servers, no terminal, no maintenance." },
                { q: "Do I need any technical knowledge?", a: "None. If you can copy and paste an API key, you can use PocketMolt. The entire setup happens through a simple dashboard." },
                { q: "Is my data safe?", a: "Yes. Everything is encrypted — your keys, your data, your traffic. We use the same security standards as banks and enterprise software. And a dedicated cybersecurity expert monitors every deployment." },
                { q: "What happens after I join the waitlist?", a: "When your spot opens, you get instant access to deploy your MoltBot. The initial launch is limited to 1,000 users so we can guarantee quality for everyone." },
                { q: "I already self-host MoltBot. Can I switch?", a: "Yes. We built a migration path that moves your configs and data over securely. You keep everything, just without the maintenance burden." },
                { q: "What will it cost?", a: "Pricing will be announced at launch. Everyone on the waitlist gets early-bird pricing locked in." },
              ].map((item, i) => (
                <FAQItem key={item.q} question={item.q} answer={item.a} delay={i * 0.05} />
              ))}
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer CTA ── */}
      <footer id="waitlist" className="relative flex min-h-[800px] flex-col items-center overflow-hidden bg-background pt-[120px] pb-20 max-md:min-h-0 max-md:pt-20">
        {/* Glow behind phone */}
        <div className="pointer-events-none absolute left-1/2 top-[55%] h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[100px]" />

        {/* Headline */}
        <motion.h2
          className="font-display relative z-10 mx-auto max-w-[800px] px-4 text-center text-[2.5rem] font-extrabold leading-[1.1] tracking-tighter text-foreground sm:text-5xl md:text-[4rem] lg:text-[5rem]"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true }}
        >
          Get Your MoltBot Running
        </motion.h2>

        {/* iPhone Mockup */}
        <motion.div
          className="relative z-10 mt-16"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
          viewport={{ once: true }}
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            <IPhoneMockup className="mx-auto w-[260px] md:w-[300px]" />
          </motion.div>
        </motion.div>

        {/* Social Links */}
        <motion.div
          className="relative z-10 mt-12 flex items-center gap-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          viewport={{ once: true }}
        >
          <a
            href="#"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground/70 transition-all duration-200 hover:text-foreground hover:bg-white/[0.03] hover:-translate-y-[1px]"
          >
            <X className="h-4 w-4" />
            X.com
          </a>
        </motion.div>
      </footer>
    </div>
  )
}
