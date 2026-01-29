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
  Instagram,
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
    { step: "1", title: "Sign up", description: "Create your account and claim your spot. No credit card required to join the waitlist." },
    { step: "2", title: "Configure", description: "Add your API keys and preferences through a simple dashboard. No command line, ever." },
    { step: "3", title: "You're live", description: "Your MoltBot is deployed, secured, and monitored 24/7 by cybersecurity experts." },
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
      {/* Outer frame, titanium bezel */}
      <div className="rounded-[52px] bg-gradient-to-b from-[#2A2A2E] to-[#1C1C1E] p-[3px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.05)]">
        <div className="rounded-[49px] bg-[#1A1A1E] p-[10px]">
          {/* Screen */}
          <div className="relative flex aspect-[9/19.5] flex-col items-center overflow-hidden rounded-[40px] bg-[#0A0A0C]">
            {/* Dynamic Island */}
            <div className="mt-3 h-[28px] w-[100px] rounded-full bg-black" />

            {/* Status bar */}
            <div className="mt-2 flex w-full items-center justify-between px-8">
              <p className="text-[12px] font-semibold text-white/50">9:41</p>
              <div className="flex items-center gap-1">
                <div className="h-[10px] w-[10px] rounded-full border border-white/30" />
                <div className="flex gap-[2px]">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`h-[10px] w-[3px] rounded-full ${i <= 3 ? "bg-white/50" : "bg-white/20"}`} />
                  ))}
                </div>
              </div>
            </div>

            {/* App content */}
            <PhoneWaitlistUI />

            {/* Home indicator */}
            <div className="mb-2 h-[5px] w-[120px] rounded-full bg-white/20" />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Phone Waitlist UI ─── */
function PhoneWaitlistUI() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")

  const handleSubmit = async () => {
    if (!email) return
    setStatus("loading")
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setStatus("success")
        setEmail("")
      } else {
        setStatus("error")
      }
    } catch {
      setStatus("error")
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center px-4 pt-4 pb-2">
      {/* App icon + branding */}
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10">
          <Terminal className="h-6 w-6 text-primary" />
        </div>
        <p className="text-[15px] font-semibold text-white">PocketMolt</p>
        <p className="max-w-[170px] text-center text-[12px] leading-snug text-white/40">
          Your MoltBot, secured &amp; ready to go
        </p>
      </div>

      {/* Email input + button */}
      <div className="w-full space-y-2.5 pb-6">
        {status === "success" ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <CheckCircle className="h-6 w-6 text-[#7D9D7A]" />
            <p className="text-[13px] font-medium text-white/80">You&apos;re on the list!</p>
          </div>
        ) : (
          <>
            <input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (status === "error") setStatus("idle")
              }}
              onFocus={(e) => {
                setTimeout(() => {
                  e.target.scrollIntoView({ behavior: "smooth", block: "center" })
                }, 300)
              }}
              className="w-full rounded-xl border border-white/[0.06] bg-white/[0.05] px-4 py-3 text-[14px] text-white placeholder:text-white/30 outline-none focus:border-primary/40 shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition-all"
            />
            <button
              onClick={handleSubmit}
              disabled={status === "loading"}
              className="w-full rounded-xl bg-gradient-to-b from-primary to-primary/85 py-3 text-[14px] font-semibold text-primary-foreground transition-all duration-200 hover:-translate-y-[1px] active:scale-[0.98] disabled:opacity-60 [box-shadow:inset_0_1px_0_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.3),0_8px_16px_rgba(220,38,38,0.2)] hover:[box-shadow:inset_0_1px_0_rgba(255,255,255,0.15),0_4px_8px_rgba(0,0,0,0.3),0_16px_32px_rgba(220,38,38,0.3)]"
            >
              {status === "loading" ? "Joining..." : "Join Waitlist"}
            </button>
          </>
        )}
        {status === "error" && (
          <p className="text-center text-[11px] text-red-400">Something went wrong. Try again.</p>
        )}
        <p className="text-center text-[11px] text-white/25">
          1,000 spots, first come, first serve
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
              {["How It Works", "Security", "Team"].map((item) => (
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
                className="h-9 rounded-lg bg-gradient-to-b from-primary to-primary/85 px-5 text-sm font-medium text-primary-foreground transition-all duration-200 hover:-translate-y-[1px] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.3),0_8px_16px_rgba(220,38,38,0.2)] hover:[box-shadow:inset_0_1px_0_rgba(255,255,255,0.15),0_4px_8px_rgba(0,0,0,0.3),0_16px_32px_rgba(220,38,38,0.3)]"
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
          {/* Ambient glow */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[15%] top-[20%] h-[600px] w-[600px] rounded-full bg-primary/6 blur-[180px]" />
            <div className="absolute left-[5%] top-[10%] h-[400px] w-[400px] rounded-full bg-[#D4A853]/5 blur-[130px]" />
            <div className="absolute right-[10%] bottom-[20%] h-[350px] w-[350px] rounded-full bg-[#7D9D7A]/4 blur-[120px]" />
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
                    Easily & Safely
                    <br />
                    Set Up <span className="text-primary">MoltBot</span>
                  </motion.h1>

                  <motion.p
                    className="max-w-[520px] text-lg leading-relaxed text-muted-foreground"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.4, 0.25, 1] }}
                  >
                    No terminal. No VPS. No headaches.{" "}
                    <span className="text-foreground font-medium">
                      Enterprise-grade security built in.
                    </span>{" "}
                    Everything is handled for you. Just sign up and go.
                  </motion.p>

                  <motion.div
                    className="flex flex-wrap items-center justify-center gap-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
                  >
                    <Button
                      onClick={() => setHeroFocusPhone(true)}
                      className="h-13 rounded-xl bg-gradient-to-b from-primary to-primary/85 px-8 text-[15px] font-medium text-primary-foreground transition-all duration-200 hover:-translate-y-[1px] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.3),0_8px_16px_rgba(220,38,38,0.2)] hover:[box-shadow:inset_0_1px_0_rgba(255,255,255,0.15),0_4px_8px_rgba(0,0,0,0.3),0_16px_32px_rgba(220,38,38,0.3)]"
                    >
                      Join Waitlist
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <a
                      href="#how-it-works"
                      className="inline-flex h-13 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-8 text-[15px] font-medium text-foreground transition-all duration-200 hover:-translate-y-[1px] hover:border-white/[0.12] hover:bg-white/[0.05]"
                    >
                      See how it works
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  </motion.div>

                  {/* Approved by Juan — small trust line */}
                  <motion.div
                    className="flex items-center gap-2.5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                  >
                    <img
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face"
                      alt="Juan"
                      className="h-6 w-6 rounded-full object-cover ring-1 ring-white/[0.1]"
                    />
                    <span className="text-[13px] text-muted-foreground">
                      Security approved by <span className="text-foreground/70 font-medium">Juan</span>, Senior Cybersecurity Expert
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
                { title: "End-to-end", desc: "encrypted", icon: Lock },
                { title: "Zero data", desc: "stored", icon: Database },
                { title: "mTLS", desc: "authenticated", icon: ShieldCheck },
                { title: "24/7", desc: "monitored", icon: Eye },
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


        {/* ── How It Works ── */}
        <section id="how-it-works" className="w-full py-24 md:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <Reveal>
              <div className="mb-20 max-w-2xl">
                <h2 className="font-display text-4xl font-bold text-foreground sm:text-5xl md:text-6xl">
                  How it works
                </h2>
                <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                  Three steps. Zero technical knowledge required.
                </p>
              </div>
            </Reveal>

            <HorizontalTimeline />
          </div>
        </section>

        {/* ── Cybersecurity Bento Grid ── */}
        <section className="relative w-full overflow-hidden py-24 md:py-32">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[20%] top-0 h-[600px] w-[600px] rounded-full bg-[#7D9D7A]/4 blur-[150px]" />
            <div className="absolute right-[10%] bottom-[10%] h-[400px] w-[400px] rounded-full bg-[#DC2626]/3 blur-[120px]" />
          </div>

          <div className="container relative mx-auto px-4 md:px-6">
            <Reveal>
              <div className="mb-16 max-w-3xl">
                <h2 className="font-display text-4xl font-bold text-foreground sm:text-5xl md:text-6xl">
                  Self-hosting MoltBot is{" "}
                  <span className="text-[#DC2626]">dangerous</span>
                </h2>
                <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                  Without proper security, your bot is an open door for hackers.
                  Exposed API keys, unencrypted traffic, no firewall. One
                  misconfiguration and your data is compromised.
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
                <div className="absolute inset-0 bg-gradient-to-b from-[#DC2626]/5 to-transparent opacity-40 transition-opacity duration-700 group-hover:opacity-60" />

                <div className="relative flex h-full flex-col p-8 md:p-10">
                  <div className="mb-8">
                    <h3 className="font-display text-2xl font-bold text-foreground">
                      Self-hosting leaves you exposed
                    </h3>
                    <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                      No firewall, no monitoring, no encryption by default. One misconfiguration and your data is compromised.
                    </p>
                  </div>

                  {/* Risk list */}
                  <ul className="mt-8 space-y-3">
                    {[
                      "Exposed to brute force & DDoS attacks",
                      "API keys stored in plaintext config files",
                      "No encryption unless you configure it",
                      "VPS security is your problem",
                      "No monitoring. You won't know until it's too late",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3 text-[14px] text-muted-foreground">
                        <X className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2626]/60" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>

              <div className="grid gap-8 md:grid-cols-2">
              {/* ── PocketMolt Protection ── */}
              <motion.div
                className="group relative overflow-hidden rounded-[24px] border border-[#7D9D7A]/[0.12] bg-gradient-to-br from-[#7D9D7A]/[0.06] to-white/[0.03] backdrop-blur-sm [box-shadow:inset_0_1px_0_rgba(125,157,122,0.06),0_1px_2px_rgba(0,0,0,0.4),0_8px_16px_rgba(0,0,0,0.2),0_32px_64px_rgba(0,0,0,0.1)]"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                {/* Hover gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#7D9D7A]/5 to-transparent opacity-40 transition-opacity duration-700 group-hover:opacity-60" />

                <div className="relative p-8 md:p-10">
                  <div className="mb-6">
                    <h3 className="font-display text-2xl font-bold text-foreground">
                      PocketMolt Protection
                    </h3>
                    <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                      Every connection is authenticated, every byte is encrypted, every threat is monitored.
                    </p>
                  </div>

                  {/* Floating protection UI */}
                  <div className="relative mt-4 rounded-[16px] border border-[#7D9D7A]/[0.06] bg-white/[0.02] p-5 backdrop-blur-sm [box-shadow:inset_0_1px_0_rgba(125,157,122,0.04)]">
                    <div className="space-y-3.5">
                      {[
                        { icon: Lock, label: "Mutual TLS on every connection" },
                        { icon: Network, label: "Firewall with strict inbound rules" },
                        { icon: Database, label: "Full encryption stack" },
                        { icon: Eye, label: "24/7 active monitoring" },
                        { icon: ScanLine, label: "Automated vulnerability scanning" },
                        { icon: Fingerprint, label: "Zero-trust architecture" },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-3">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#7D9D7A]/10">
                            <item.icon className="h-3.5 w-3.5 text-[#7D9D7A]" />
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
                      Night and day difference
                    </h3>
                  </div>

                  {/* Comparison table */}
                  <div className="overflow-hidden rounded-[16px] border border-white/[0.06]">
                    {/* Header row */}
                    <div className="grid grid-cols-[1fr_1fr] border-b border-white/[0.06] bg-white/[0.03]">
                      <div className="px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-[#DC2626]/70">Self-hosted</div>
                      <div className="border-l border-white/[0.06] px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-[#7D9D7A]">PocketMolt</div>
                    </div>

                    {/* Comparison rows */}
                    {[
                      { self: "No encryption", pocket: "AES-256 + TLS 1.3" },
                      { self: "Open ports", pocket: "Strict firewall rules" },
                      { self: "No monitoring", pocket: "24/7 expert monitoring" },
                      { self: "DIY security", pocket: "Approved by Juan" },
                      { self: "Plaintext configs", pocket: "Encrypted at rest" },
                    ].map((row, i) => (
                      <div key={row.self} className={`grid grid-cols-[1fr_1fr] ${i < 4 ? "border-b border-white/[0.04]" : ""}`}>
                        <div className="flex items-center gap-2.5 px-5 py-3.5 text-[13px] text-muted-foreground/50">
                          <X className="h-3.5 w-3.5 shrink-0 text-[#DC2626]/40" />
                          {row.self}
                        </div>
                        <div className="flex items-center gap-2.5 border-l border-white/[0.06] px-5 py-3.5 text-[13px] font-medium text-foreground/80">
                          <CheckCircle className="h-3.5 w-3.5 shrink-0 text-[#7D9D7A]" />
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
            <div className="absolute left-0 top-1/4 h-[400px] w-[400px] rounded-full bg-[#7D9D7A]/4 blur-[120px]" />
          </div>

          <div className="container relative mx-auto px-4 md:px-6">
            <Reveal>
              <div className="mb-20 max-w-2xl">
                <h2 className="font-display text-4xl font-bold text-foreground sm:text-5xl md:text-6xl">
                  Built like a <span className="text-[#7D9D7A]">fortress</span>
                </h2>
                <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                  Every component of PocketMolt is designed with security as the
                  foundation, not an afterthought.
                </p>
              </div>
            </Reveal>

            <div className="grid gap-8 sm:grid-cols-2">
              <SecurityCard icon={Lock} title="Mutual TLS (mTLS)" description="Both client and server authenticate each other with certificates. No impersonation, no man-in-the-middle attacks possible." delay={0} />
              <SecurityCard icon={Network} title="Network inbound rules" description="External access is blocked by default. Strict firewall rules ensure only authorized traffic reaches your environment." delay={0.1} />
              <SecurityCard icon={Database} title="Encryption at every layer" description="Database, communication channels, server internals: every single layer is encrypted. No gaps, no exceptions." delay={0.15} />
              <SecurityCard icon={KeyRound} title="Encryption at rest & in transit" description="AES-256 encryption for stored data, TLS 1.3 for data in motion. Protected whether sitting still or moving." delay={0.2} />
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
                  The people building and securing PocketMolt.
                </p>
              </div>
            </Reveal>

            {/* Horizontal scroll on mobile, grid on desktop */}
            <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
              <TeamCard
                name="Rafael"
                role="Founder"
                bio="Building the easiest way to deploy MoltBot. No terminal, no VPS, no headaches."
                image="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop&crop=face"
                socials={{ linkedin: "#", x: "#" }}
                delay={0}
              />
              <TeamCard
                name="Juan"
                role="Cybersecurity Lead"
                bio="Cybersecurity expert keeping PocketMolt safe 24/7."
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
          Be The First To Get Access
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
          <a
            href="#"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground/70 transition-all duration-200 hover:text-foreground hover:bg-white/[0.03] hover:-translate-y-[1px]"
          >
            <Instagram className="h-4 w-4" />
            Instagram
          </a>
        </motion.div>
      </footer>
    </div>
  )
}
