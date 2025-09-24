import bcrypt from 'bcryptjs'
import { initializeDatabase, query, run, closeDatabase } from '../lib/sqlite-database'

async function createDemoUsers() {
  console.log('🚀 Creating demo users...')
  
  try {
    // Initialize database
    await initializeDatabase()
    
    // Check if users already exist
    const existingUsers = await query('SELECT COUNT(*) as count FROM users')
    if (existingUsers[0].count > 0) {
      console.log('✅ Users already exist, skipping creation')
      return
    }
    
    // Demo users data
    const demoUsers = [
      {
        email: 'partner@company.com',
        password: 'password',
        name: 'Channel Partner',
        role: 'channel_partner',
        department: 'Sales',
        location: 'New York'
      },
      {
        email: 'assignee@company.com',
        password: 'password',
        name: 'Ticket Assignee',
        role: 'assignee',
        department: 'Support',
        location: 'Chicago'
      },
      {
        email: 'admin@company.com',
        password: 'password',
        name: 'Head Office Admin',
        role: 'head_office',
        department: 'Management',
        location: 'San Francisco'
      },
      {
        email: 'tech@company.com',
        password: 'password',
        name: 'Technical Support',
        role: 'technical',
        department: 'IT',
        location: 'Seattle'
      }
    ]
    
    // Create users
    for (const userData of demoUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 12)
      
      await run(
        'INSERT INTO users (email, password_hash, name, role, department, location) VALUES (?, ?, ?, ?, ?, ?)',
        [userData.email, hashedPassword, userData.name, userData.role, userData.department, userData.location]
      )
      
      console.log(`✅ Created user: ${userData.email} (${userData.role})`)
    }
    
    console.log('\n🎉 Demo users created successfully!')
    console.log('\n📋 Login Credentials:')
    console.log('Email: partner@company.com | Password: password (Channel Partner)')
    console.log('Email: assignee@company.com | Password: password (Assignee)')
    console.log('Email: admin@company.com | Password: password (Head Office)')
    console.log('Email: tech@company.com | Password: password (Technical)')
    
  } catch (error) {
    console.error('❌ Error creating demo users:', error)
  } finally {
    closeDatabase()
  }
}

// Run if this file is executed directly
if (require.main === module) {
  createDemoUsers()
}

export { createDemoUsers }
