"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TicketIcon, ClockIcon, CheckCircleIcon, AlertCircleIcon } from "lucide-react"
import type { DashboardStats } from "@/lib/types"

interface StatsCardsProps {
  stats: DashboardStats
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "Total Tickets",
      value: stats.totalTickets,
      icon: TicketIcon,
      description: "All tickets in system",
    },
    {
      title: "Open Tickets",
      value: stats.openTickets,
      icon: AlertCircleIcon,
      description: "Awaiting assignment",
    },
    {
      title: "In Progress",
      value: stats.inProgressTickets,
      icon: ClockIcon,
      description: "Currently being worked on",
    },
    {
      title: "Resolved",
      value: stats.resolvedTickets,
      icon: CheckCircleIcon,
      description: "Successfully completed",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
