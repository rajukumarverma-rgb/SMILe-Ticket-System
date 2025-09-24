"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Ticket, TicketStatus, TicketPriority } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"

interface RecentTicketsProps {
  tickets: Ticket[]
  title?: string
  showCreateButton?: boolean
}

const statusColors: Record<TicketStatus, string> = {
  open: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  in_progress: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  pending_approval: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  resolved: "bg-green-500/10 text-green-500 border-green-500/20",
  closed: "bg-gray-500/10 text-gray-500 border-gray-500/20",
}

const priorityColors: Record<TicketPriority, string> = {
  low: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  medium: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  urgent: "bg-red-500/10 text-red-500 border-red-500/20",
}

export function RecentTickets({ tickets, title = "Recent Tickets", showCreateButton = false }: RecentTicketsProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>Latest ticket activity and updates</CardDescription>
          </div>
          {showCreateButton && (
            <Link href="/dashboard/tickets/create">
              <Button size="sm">Create Ticket</Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {tickets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No tickets found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.slice(0, 5).map((ticket) => (
              <div
                key={ticket.id}
                className="flex items-start justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-sm truncate">{ticket.title}</h4>
                    <Badge className={statusColors[ticket.status]}>{ticket.status.replace("_", " ")}</Badge>
                    <Badge className={priorityColors[ticket.priority]}>{ticket.priority}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{ticket.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>#{ticket.id}</span>
                    <span>{formatDistanceToNow(ticket.createdAt, { addSuffix: true })}</span>
                    {ticket.category && <span className="capitalize">{ticket.category.replace("_", " ")}</span>}
                  </div>
                </div>
                <Link href={`/dashboard/tickets/${ticket.id}`}>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
