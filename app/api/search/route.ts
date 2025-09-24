import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { query } from '@/lib/sqlite-database'
import type { UserRole } from '@/lib/types'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

async function verifyToken(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return decoded
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const decoded = await verifyToken(request)
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = decoded.role as UserRole
    const userId = decoded.id || decoded.userId

    // Get search parameters from URL
    const { searchParams } = new URL(request.url)
    const searchTerm = searchParams.get('q') || ''
    const entity = searchParams.get('entity') || 'all' // all, tickets, users, comments
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!searchTerm.trim()) {
      return NextResponse.json({
        success: true,
        results: {
          tickets: [],
          users: [],
          comments: []
        },
        totalResults: 0
      })
    }

    const results: any = {
      tickets: [],
      users: [],
      comments: []
    }

    // Search tickets
    if (entity === 'all' || entity === 'tickets') {
      let ticketQuery = `
        SELECT t.*, 
               u1.name as created_by_name, u1.email as created_by_email,
               u2.name as assigned_to_name, u2.email as assigned_to_email
        FROM tickets t
        LEFT JOIN users u1 ON t.created_by = u1.id
        LEFT JOIN users u2 ON t.assigned_to = u2.id
        WHERE (
          t.title LIKE ? OR 
          t.description LIKE ? OR 
          t.category LIKE ? OR
          u1.name LIKE ? OR
          u2.name LIKE ?
        )
      `
      const ticketParams: any[] = []
      const searchPattern = `%${searchTerm}%`
      ticketParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern)

      // Role-based access control
      if (userRole === 'channel_partner') {
        ticketQuery += ` AND t.created_by = ?`
        ticketParams.push(userId)
      } else if (userRole === 'assignee') {
        ticketQuery += ` AND (t.assigned_to = ? OR t.created_by = ?)`
        ticketParams.push(userId, userId)
      }

      ticketQuery += ` ORDER BY t.created_at DESC LIMIT ?`
      ticketParams.push(limit)

      const tickets = await query(ticketQuery, ticketParams)
      results.tickets = tickets.map((ticket: any) => ({
        id: ticket.id.toString(),
        title: ticket.title,
        description: ticket.description,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        createdBy: ticket.created_by,
        assignedTo: ticket.assigned_to,
        createdAt: new Date(ticket.created_at),
        updatedAt: new Date(ticket.updated_at),
        dueDate: ticket.due_date ? new Date(ticket.due_date) : undefined,
        tags: ticket.tags ? ticket.tags.split(',') : [],
        createdByName: ticket.created_by_name,
        createdByEmail: ticket.created_by_email,
        assignedToName: ticket.assigned_to_name,
        assignedToEmail: ticket.assigned_to_email,
        type: 'ticket'
      }))
    }

    // Search users (only for head_office and technical)
    if ((entity === 'all' || entity === 'users') && ['head_office', 'technical'].includes(userRole)) {
      const userQuery = `
        SELECT u.*, 
               COUNT(t.id) as ticket_count
        FROM users u
        LEFT JOIN tickets t ON u.id = t.assigned_to
        WHERE (
          u.name LIKE ? OR 
          u.email LIKE ? OR 
          u.department LIKE ? OR
          u.location LIKE ?
        )
        GROUP BY u.id
        ORDER BY u.name ASC
        LIMIT ?
      `
      const searchPattern = `%${searchTerm}%`
      const users = await query(userQuery, [searchPattern, searchPattern, searchPattern, searchPattern, limit])
      
      results.users = users.map((user: any) => ({
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        location: user.location,
        createdAt: new Date(user.created_at),
        ticketCount: user.ticket_count || 0,
        type: 'user'
      }))
    }

    // Search comments
    if (entity === 'all' || entity === 'comments') {
      let commentQuery = `
        SELECT c.*, 
               t.title as ticket_title,
               u.name as user_name,
               u.email as user_email
        FROM ticket_comments c
        LEFT JOIN tickets t ON c.ticket_id = t.id
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.content LIKE ?
      `
      const commentParams = [`%${searchTerm}%`]

      // Role-based access control for comments
      if (userRole === 'channel_partner') {
        commentQuery += ` AND t.created_by = ?`
        commentParams.push(userId)
      } else if (userRole === 'assignee') {
        commentQuery += ` AND (t.assigned_to = ? OR t.created_by = ?)`
        commentParams.push(userId, userId)
      }

      commentQuery += ` ORDER BY c.created_at DESC LIMIT ?`
      commentParams.push(limit)

      const comments = await query(commentQuery, commentParams)
      results.comments = comments.map((comment: any) => ({
        id: comment.id.toString(),
        ticketId: comment.ticket_id,
        userId: comment.user_id,
        content: comment.content,
        isInternal: comment.is_internal,
        createdAt: new Date(comment.created_at),
        ticketTitle: comment.ticket_title,
        userName: comment.user_name,
        userEmail: comment.user_email,
        type: 'comment'
      }))
    }

    // Calculate total results
    const totalResults = results.tickets.length + results.users.length + results.comments.length

    return NextResponse.json({
      success: true,
      results,
      totalResults,
      searchTerm,
      entity
    })

  } catch (error) {
    console.error('Global search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
