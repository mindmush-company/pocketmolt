import Link from "next/link"
import { Terminal } from "lucide-react"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-center">
          <Link href="/" className="flex items-center space-x-2">
            <Terminal className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">PocketMolt</span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      <footer className="border-t py-6">
        <div className="container text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} PocketMolt. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
