import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { CalendarIcon, CircleIcon } from "lucide-react"

interface Bot {
  id: string
  name: string
  status: 'starting' | 'running' | 'stopped' | 'failed'
  created_at: string
}

const statusColors = {
  starting: "bg-yellow-500",
  running: "bg-green-500",
  stopped: "bg-gray-500",
  failed: "bg-red-500",
}

export function BotCard({ bot }: { bot: Bot }) {
  return (
    <Card className="rounded-[1.3rem] overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold">{bot.name}</CardTitle>
        <Badge variant="outline" className={`${statusColors[bot.status]} text-white border-none capitalize`}>
          {bot.status}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="flex items-center text-sm text-muted-foreground mt-2">
          <CalendarIcon className="mr-1 h-3 w-3" />
          Created {new Date(bot.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full" asChild>
          <Link href={`/dashboard/bots/${bot.id}`}>View Details</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

export function BotCardSkeleton() {
  return (
    <Card className="rounded-[1.3rem] overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="h-6 w-1/2 bg-muted rounded animate-pulse" />
        <div className="h-5 w-16 bg-muted rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="h-4 w-1/3 bg-muted rounded animate-pulse mt-2" />
      </CardContent>
      <CardFooter>
        <div className="h-9 w-full bg-muted rounded animate-pulse" />
      </CardFooter>
    </Card>
  )
}
