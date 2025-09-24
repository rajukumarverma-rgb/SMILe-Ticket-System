import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { query } from '@/lib/sqlite-database'
import type { User } from '@/lib/types'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

// Get current user from token
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any
      
      const result = await query(
        'SELECT id, email, name, role, department, location, created_at FROM users WHERE id = ?',
        [decoded.userId]
      )

      if (result.length === 0) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      const user = result[0]
        const userResponse: User = {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          department: user.department,
          location: user.location,
          createdAt: new Date(user.created_at)
        }

      return NextResponse.json({ user: userResponse })

    } catch (jwtError) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
