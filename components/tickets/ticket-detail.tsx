"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { CalendarIcon, UserIcon, MessageSquareIcon, ClockIcon } from "lucide-react"
import type { Ticket, TicketStatus, TicketPriority } from "@/lib/types"
import { formatDistanceToNow, format } from "date-fns"
import { TicketService } from "@/lib/ticket-service"
import { AuthService } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { TicketActions } from "./ticket-actions"

interface TicketDetailProps {
  ticket: Ticket
  onUpdate?: () => void
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

export function TicketDetail({ ticket, onUpdate }: TicketDetailProps) {
  const [newComment, setNewComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const user = AuthService.getCurrentUser()

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setIsSubmitting(true)
    try {
      await TicketService.addComment(ticket.id, newComment.trim())
      setNewComment("")
      toast({
        title: "Comment added",
        description: "Your comment has been added to the ticket.",
      })
      onUpdate?.()
    } catch (error) {
      toast({
        title: "Error adding comment",
        description: "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Ticket Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle className="text-2xl">{ticket.title}</CardTitle>
                  <Badge className={statusColors[ticket.status]}>{ticket.status.replace("_", " ")}</Badge>
                  <Badge className={priorityColors[ticket.priority]}>{ticket.priority}</Badge>
                </div>
                <CardDescription>Ticket #{ticket.id}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-muted-foreground leading-relaxed">{ticket.description}</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Created:</span>
                    <div>{format(ticket.createdAt, "MMM d, yyyy")}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ClockIcon className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Updated:</span>
                    <div>{formatDistanceToNow(ticket.updatedAt, { addSuffix: true })}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Category:</span>
                    <div className="capitalize">{ticket.category.replace("_", " ")}</div>
                  </div>
                </div>
                {ticket.dueDate && (
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <span className="text-muted-foreground">Due:</span>
                      <div>{format(ticket.dueDate, "MMM d, yyyy")}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquareIcon className="w-5 h-5" />
              Comments ({ticket.comments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {ticket.comments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No comments yet</p>
              ) : (
                ticket.comments.map((comment, index) => (
                  <div key={comment.id}>
                    <div className="flex items-start gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src="/placeholder.svg" />
                        <AvatarFallback className="text-xs">
                          {comment.userId === "1" ? "JP" : comment.userId === "2" ? "SA" : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {comment.userId === "1"
                              ? "John Partner"
                              : comment.userId === "2"
                                ? "Sarah Assignee"
                                : comment.userId === "3"
                                  ? "Mike Admin"
                                  : comment.userId === "4"
                                    ? "Lisa Tech"
                                    : "User"}
                          </span>
                          {comment.isInternal && (
                            <Badge variant="secondary" className="text-xs">
                              Internal
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{comment.content}</p>
                      </div>
                    </div>
                    {index < ticket.comments.length - 1 && <Separator className="mt-6" />}
                  </div>
                ))
              )}

              {/* Add Comment Form */}
              <Separator />
              <form onSubmit={handleAddComment} className="space-y-4">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={3}
                />
                <Button type="submit" disabled={isSubmitting || !newComment.trim()}>
                  {isSubmitting ? "Adding..." : "Add Comment"}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        <TicketActions ticket={ticket} onUpdate={onUpdate} />
      </div>
    </div>
  )
}
