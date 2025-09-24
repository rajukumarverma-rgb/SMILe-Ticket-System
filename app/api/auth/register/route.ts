import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query, run } from '@/lib/sqlite-database'
import type { User } from '@/lib/types'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

// Register new user
export async function POST(request: NextRequest) {
  try {
    const { email, password, name, role, department, location } = await request.json()

    // Validate required fields
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['channel_partner', 'assignee', 'head_office', 'technical']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    )

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const saltRounds = 12
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // Create user
    const result = await run(
      `INSERT INTO users (email, password_hash, name, role, department, location)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [email, passwordHash, name, role, department || null, location || null]
    )

    const userId = result.lastID
    
    // Get the created user
    const userResult = await query(
      'SELECT id, email, name, role, department, location, created_at FROM users WHERE id = ?',
      [userId]
    )
    
    const user = userResult[0]
      
      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      )

      // Return user data (without password hash)
      const userResponse: User = {
        id: user.id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        location: user.location,
        createdAt: new Date(user.created_at)
      }

    return NextResponse.json({
      user: userResponse,
      token
    }, { status: 201 })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
