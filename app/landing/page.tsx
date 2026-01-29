import Link from "next/link"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, Shield, Zap, Server, Terminal } from "lucide-react"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="mr-4 flex">
            <Link className="mr-6 flex items-center space-x-2" href="/">
              <span className="hidden font-bold sm:inline-block">PocketMolt</span>
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-2">
            <nav className="flex items-center space-x-2">
              <Link href="/signup">
                <Button size="sm" variant="default" className="rounded-full">
                  Sign Up
                </Button>
              </Link>
              <ModeToggle />
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-32">
          <div className="container flex max-w-[64rem] flex-col items-center gap-4 text-center">
            <h1 className="font-heading text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter">
              Your Personal AI Assistant, <br className="hidden sm:inline" />
              Managed for You
            </h1>
            <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
              Deploy MoltBot in minutes. No technical setup required. We handle the servers, you bring the curiosity.
            </p>
            <div className="space-x-4">
              <Link href="/signup">
                <Button size="lg" className="rounded-full h-12 px-8 text-lg font-bold">
                  Get Started
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="lg" className="rounded-full h-12 px-8 text-lg">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section id="features" className="container space-y-6 py-8 md:py-12 lg:py-24 bg-secondary/20 rounded-3xl my-8">
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
            <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl font-bold">
              Features
            </h2>
            <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
              Everything you need to run your own powerful AI assistant without the headache of managing infrastructure.
            </p>
          </div>
          <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
            <Card className="flex flex-col justify-between border-none shadow-md">
              <CardHeader>
                <Server className="h-10 w-10 text-primary mb-2" />
                <CardTitle>No Technical Setup</CardTitle>
                <CardDescription>
                  Forget about VPS, Docker, SSH, and Linux commands. We handle the infrastructure so you don't have to.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="flex flex-col justify-between border-none shadow-md">
              <CardHeader>
                <Shield className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Your Own API Keys</CardTitle>
                <CardDescription>
                  Maintain full control and privacy. Bring your own Anthropic or OpenAI keys. You pay only for what you use.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="flex flex-col justify-between border-none shadow-md">
              <CardHeader>
                <Zap className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Telegram Integration</CardTitle>
                <CardDescription>
                  Chat with your bot instantly via Telegram. It's like having a super-smart friend in your contact list.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        <section id="pricing" className="container py-8 md:py-12 lg:py-24">
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
            <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl font-bold">
              Simple Pricing
            </h2>
            <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
              Transparent pricing with no hidden fees.
            </p>
          </div>
          <div className="mx-auto mt-8 max-w-sm">
            <Card className="flex flex-col border-2 border-primary shadow-xl scale-105">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-4xl font-bold">€30<span className="text-lg font-normal text-muted-foreground">/month</span></CardTitle>
                <CardDescription>Per MoltBot instance</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 pt-6">
                <ul className="grid gap-3 text-sm font-medium">
                  <li className="flex items-center">
                    <Check className="mr-2 h-5 w-5 text-primary" />
                    Managed VPS Hosting
                  </li>
                  <li className="flex items-center">
                    <Check className="mr-2 h-5 w-5 text-primary" />
                    Automatic Updates
                  </li>
                  <li className="flex items-center">
                    <Check className="mr-2 h-5 w-5 text-primary" />
                    24/7 Uptime Monitoring
                  </li>
                  <li className="flex items-center">
                    <Check className="mr-2 h-5 w-5 text-primary" />
                    Secure Environment
                  </li>
                  <li className="flex items-center">
                    <Check className="mr-2 h-5 w-5 text-primary" />
                    Telegram Bot Setup
                  </li>
                </ul>
                <Link href="/signup" className="w-full mt-4">
                  <Button className="w-full rounded-full h-12 font-bold text-lg" size="lg">
                    Start Now
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
            <Terminal className="h-6 w-6" />
            <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
              Built for you to explore AI.
            </p>
          </div>
          <div className="flex gap-4">
             <Link href="#" className="text-sm font-medium underline underline-offset-4 text-muted-foreground hover:text-primary">
              Privacy
            </Link>
            <Link href="#" className="text-sm font-medium underline underline-offset-4 text-muted-foreground hover:text-primary">
              Terms
            </Link>
            <Link href="#" className="text-sm font-medium underline underline-offset-4 text-muted-foreground hover:text-primary">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
