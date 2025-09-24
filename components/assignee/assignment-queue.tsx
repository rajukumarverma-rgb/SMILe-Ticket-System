"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ClockIcon, UserIcon, AlertTriangleIcon } from "lucide-react"
import type { Ticket, TicketStatus } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"
import { TicketService } from "@/lib/ticket-service"
import { AuthService } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface AssignmentQueueProps {
  tickets: Ticket[]
  onUpdate?: () => void
}

const statusColors = {
  open: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  in_progress: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  pending_approval: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  resolved: "bg-green-500/10 text-green-500 border-green-500/20",
  closed: "bg-gray-500/10 text-gray-500 border-gray-500/20",
}

const priorityColors = {
  low: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  medium: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  urgent: "bg-red-500/10 text-red-500 border-red-500/20",
}

export function AssignmentQueue({ tickets, onUpdate }: AssignmentQueueProps) {
  const [updatingTickets, setUpdatingTickets] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  const user = AuthService.getCurrentUser()
  const openTickets = tickets.filter((ticket) => ticket.status === "open")
  const myTickets = tickets.filter((ticket) => ticket.assignedTo === user?.id)

  const handleTakeTicket = async (ticketId: string) => {
    if (!user) return

    setUpdatingTickets((prev) => new Set(prev).add(ticketId))
    try {
      await TicketService.assignTicket(ticketId, user.id)
      await TicketService.updateTicketStatus(ticketId, "in_progress")
      toast({
        title: "Ticket assigned",
        description: "You have successfully taken this ticket.",
      })
      onUpdate?.()
    } catch (error) {
      toast({
        title: "Error assigning ticket",
        description: "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setUpdatingTickets((prev) => {
        const newSet = new Set(prev)
        newSet.delete(ticketId)
        return newSet
      })
    }
  }

  const handleStatusUpdate = async (ticketId: string, newStatus: TicketStatus) => {
    setUpdatingTickets((prev) => new Set(prev).add(ticketId))
    try {
      await TicketService.updateTicketStatus(ticketId, newStatus)
      toast({
        title: "Status updated",
        description: `Ticket status changed to ${newStatus.replace("_", " ")}.`,
      })
      onUpdate?.()
    } catch (error) {
      toast({
        title: "Error updating status",
        description: "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setUpdatingTickets((prev) => {
        const newSet = new Set(prev)
        newSet.delete(ticketId)
        return newSet
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Available Tickets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangleIcon className="w-5 h-5" />
            Available Tickets ({openTickets.length})
          </CardTitle>
          <CardDescription>Unassigned tickets waiting for someone to take them</CardDescription>
        </CardHeader>
        <CardContent>
          {openTickets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No unassigned tickets available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {openTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-start justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-sm truncate">{ticket.title}</h4>
                      <Badge className={priorityColors[ticket.priority]}>{ticket.priority}</Badge>
                      <Badge variant="outline" className="text-xs">
                        {ticket.category.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{ticket.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>#{ticket.id}</span>
                      <span>{formatDistanceToNow(ticket.createdAt, { addSuffix: true })}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/dashboard/tickets/${ticket.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      onClick={() => handleTakeTicket(ticket.id)}
                      disabled={updatingTickets.has(ticket.id)}
                    >
                      {updatingTickets.has(ticket.id) ? "Taking..." : "Take Ticket"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Assigned Tickets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="w-5 h-5" />
            My Assigned Tickets ({myTickets.length})
          </CardTitle>
          <CardDescription>Tickets currently assigned to you</CardDescription>
        </CardHeader>
        <CardContent>
          {myTickets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No tickets assigned to you</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myTickets.map((ticket) => (
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
                      <span>{formatDistanceToNow(ticket.updatedAt, { addSuffix: true })}</span>
                      {ticket.dueDate && (
                        <span className="flex items-center gap-1">
                          <ClockIcon className="w-3 h-3" />
                          Due {formatDistanceToNow(ticket.dueDate, { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={ticket.status}
                      onValueChange={(value: TicketStatus) => handleStatusUpdate(ticket.id, value)}
                      disabled={updatingTickets.has(ticket.id)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="pending_approval">Pending Approval</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                    <Link href={`/dashboard/tickets/${ticket.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
