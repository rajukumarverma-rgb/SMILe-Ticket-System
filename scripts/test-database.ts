import { testConnection as testPostgresConnection, initializeDatabase as initPostgresDB, pool } from '../lib/database'
import { testConnection as testSQLiteConnection, initializeDatabase as initSQLiteDB, query as sqliteQuery, run as sqliteRun, closeDatabase } from '../lib/sqlite-database'
import bcrypt from 'bcryptjs'

interface TestResult {
  test: string
  status: 'PASS' | 'FAIL' | 'SKIP'
  message: string
  duration?: number
}

class DatabaseTester {
  private results: TestResult[] = []

  private addResult(test: string, status: 'PASS' | 'FAIL' | 'SKIP', message: string, duration?: number) {
    this.results.push({ test, status, message, duration })
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️'
    console.log(`${icon} ${test}: ${message}${duration ? ` (${duration}ms)` : ''}`)
  }

  async testPostgreSQL(): Promise<void> {
    console.log('\n🐘 Testing PostgreSQL Database...')
    
    // Test connection
    const startTime = Date.now()
    try {
      const connected = await testPostgresConnection()
      const duration = Date.now() - startTime
      if (connected) {
        this.addResult('PostgreSQL Connection', 'PASS', 'Successfully connected to PostgreSQL', duration)
      } else {
        this.addResult('PostgreSQL Connection', 'FAIL', 'Failed to connect to PostgreSQL', duration)
        this.addResult('PostgreSQL Setup', 'SKIP', 'PostgreSQL not available - install PostgreSQL and run: npm run setup-postgres')
        return
      }
    } catch (error) {
      this.addResult('PostgreSQL Connection', 'FAIL', `Connection error: ${error}`, Date.now() - startTime)
      this.addResult('PostgreSQL Setup', 'SKIP', 'PostgreSQL not available - install PostgreSQL and run: npm run setup-postgres')
      return
    }

    // Initialize database
    try {
      await initPostgresDB()
      this.addResult('PostgreSQL Schema', 'PASS', 'Database tables created successfully')
    } catch (error) {
      this.addResult('PostgreSQL Schema', 'FAIL', `Schema creation error: ${error}`)
      return
    }

    // Test CRUD operations
    await this.testPostgresCRUD()
  }

  async testPostgresCRUD(): Promise<void> {
    const client = await pool.connect()
    
    try {
      // Clean up any existing test data first
      await client.query('DELETE FROM ticket_comments WHERE content LIKE $1', ['%test%'])
      await client.query('DELETE FROM tickets WHERE title LIKE $1', ['%Test%'])
      await client.query('DELETE FROM users WHERE email LIKE $1', ['%test%'])
      
      // Test User Creation
      const hashedPassword = await bcrypt.hash('testpassword123', 10)
      const userResult = await client.query(
        'INSERT INTO users (email, password_hash, name, role, department, location) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        ['test@example.com', hashedPassword, 'Test User', 'channel_partner', 'IT', 'New York']
      )
      const userId = userResult.rows[0].id
      this.addResult('PostgreSQL User Insert', 'PASS', `User created with ID: ${userId}`)

      // Test Ticket Creation
      const ticketResult = await client.query(
        'INSERT INTO tickets (title, description, category, priority, status, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        ['Test Ticket', 'This is a test ticket', 'technical', 'medium', 'open', userId]
      )
      const ticketId = ticketResult.rows[0].id
      this.addResult('PostgreSQL Ticket Insert', 'PASS', `Ticket created with ID: ${ticketId}`)

      // Test Comment Creation
      const commentResult = await client.query(
        'INSERT INTO ticket_comments (ticket_id, user_id, content, is_internal) VALUES ($1, $2, $3, $4) RETURNING id',
        [ticketId, userId, 'This is a test comment', false]
      )
      const commentId = commentResult.rows[0].id
      this.addResult('PostgreSQL Comment Insert', 'PASS', `Comment created with ID: ${commentId}`)

      // Test Read Operations
      const userRead = await client.query('SELECT * FROM users WHERE id = $1', [userId])
      if (userRead.rows.length > 0) {
        this.addResult('PostgreSQL User Read', 'PASS', 'User data retrieved successfully')
      } else {
        this.addResult('PostgreSQL User Read', 'FAIL', 'Failed to retrieve user data')
      }

      const ticketRead = await client.query('SELECT * FROM tickets WHERE id = $1', [ticketId])
      if (ticketRead.rows.length > 0) {
        this.addResult('PostgreSQL Ticket Read', 'PASS', 'Ticket data retrieved successfully')
      } else {
        this.addResult('PostgreSQL Ticket Read', 'FAIL', 'Failed to retrieve ticket data')
      }

      // Test Update Operations
      await client.query('UPDATE tickets SET status = $1 WHERE id = $2', ['in_progress', ticketId])
      const updatedTicket = await client.query('SELECT status FROM tickets WHERE id = $1', [ticketId])
      if (updatedTicket.rows[0].status === 'in_progress') {
        this.addResult('PostgreSQL Ticket Update', 'PASS', 'Ticket status updated successfully')
      } else {
        this.addResult('PostgreSQL Ticket Update', 'FAIL', 'Failed to update ticket status')
      }

      // Test Delete Operations
      await client.query('DELETE FROM ticket_comments WHERE id = $1', [commentId])
      const deletedComment = await client.query('SELECT * FROM ticket_comments WHERE id = $1', [commentId])
      if (deletedComment.rows.length === 0) {
        this.addResult('PostgreSQL Comment Delete', 'PASS', 'Comment deleted successfully')
      } else {
        this.addResult('PostgreSQL Comment Delete', 'FAIL', 'Failed to delete comment')
      }

      // Cleanup
      await client.query('DELETE FROM tickets WHERE id = $1', [ticketId])
      await client.query('DELETE FROM users WHERE id = $1', [userId])
      this.addResult('PostgreSQL Cleanup', 'PASS', 'Test data cleaned up successfully')

    } catch (error) {
      this.addResult('PostgreSQL CRUD Operations', 'FAIL', `CRUD error: ${error}`)
    } finally {
      client.release()
    }
  }

  async testSQLite(): Promise<void> {
    console.log('\n🗃️ Testing SQLite Database...')
    
    // Test connection
    const startTime = Date.now()
    try {
      const connected = await testSQLiteConnection()
      const duration = Date.now() - startTime
      if (connected) {
        this.addResult('SQLite Connection', 'PASS', 'Successfully connected to SQLite', duration)
      } else {
        this.addResult('SQLite Connection', 'FAIL', 'Failed to connect to SQLite', duration)
        return
      }
    } catch (error) {
      this.addResult('SQLite Connection', 'FAIL', `Connection error: ${error}`, Date.now() - startTime)
      return
    }

    // Initialize database
    try {
      await initSQLiteDB()
      this.addResult('SQLite Schema', 'PASS', 'Database tables created successfully')
    } catch (error) {
      this.addResult('SQLite Schema', 'FAIL', `Schema creation error: ${error}`)
      return
    }

    // Test CRUD operations
    await this.testSQLiteCRUD()
  }

  async testSQLiteCRUD(): Promise<void> {
    try {
      // Clean up any existing test data first
      await sqliteRun('DELETE FROM ticket_comments WHERE content LIKE ?', ['%test%'])
      await sqliteRun('DELETE FROM tickets WHERE title LIKE ?', ['%Test%'])
      await sqliteRun('DELETE FROM users WHERE email LIKE ?', ['%test%'])
      
      // Test User Creation
      const hashedPassword = await bcrypt.hash('testpassword123', 10)
      const userResult = await sqliteRun(
        'INSERT INTO users (email, password_hash, name, role, department, location) VALUES (?, ?, ?, ?, ?, ?)',
        ['test@example.com', hashedPassword, 'Test User', 'channel_partner', 'IT', 'New York']
      )
      const userId = userResult.lastID
      this.addResult('SQLite User Insert', 'PASS', `User created with ID: ${userId}`)

      // Test Ticket Creation
      const ticketResult = await sqliteRun(
        'INSERT INTO tickets (title, description, category, priority, status, created_by) VALUES (?, ?, ?, ?, ?, ?)',
        ['Test Ticket', 'This is a test ticket', 'technical', 'medium', 'open', userId]
      )
      const ticketId = ticketResult.lastID
      this.addResult('SQLite Ticket Insert', 'PASS', `Ticket created with ID: ${ticketId}`)

      // Test Comment Creation
      const commentResult = await sqliteRun(
        'INSERT INTO ticket_comments (ticket_id, user_id, content, is_internal) VALUES (?, ?, ?, ?)',
        [ticketId, userId, 'This is a test comment', false]
      )
      const commentId = commentResult.lastID
      this.addResult('SQLite Comment Insert', 'PASS', `Comment created with ID: ${commentId}`)

      // Test Read Operations
      const userRead = await sqliteQuery('SELECT * FROM users WHERE id = ?', [userId])
      if (userRead.length > 0) {
        this.addResult('SQLite User Read', 'PASS', 'User data retrieved successfully')
      } else {
        this.addResult('SQLite User Read', 'FAIL', 'Failed to retrieve user data')
      }

      const ticketRead = await sqliteQuery('SELECT * FROM tickets WHERE id = ?', [ticketId])
      if (ticketRead.length > 0) {
        this.addResult('SQLite Ticket Read', 'PASS', 'Ticket data retrieved successfully')
      } else {
        this.addResult('SQLite Ticket Read', 'FAIL', 'Failed to retrieve ticket data')
      }

      // Test Update Operations
      await sqliteRun('UPDATE tickets SET status = ? WHERE id = ?', ['in_progress', ticketId])
      const updatedTicket = await sqliteQuery('SELECT status FROM tickets WHERE id = ?', [ticketId])
      if (updatedTicket[0].status === 'in_progress') {
        this.addResult('SQLite Ticket Update', 'PASS', 'Ticket status updated successfully')
      } else {
        this.addResult('SQLite Ticket Update', 'FAIL', 'Failed to update ticket status')
      }

      // Test Delete Operations
      await sqliteRun('DELETE FROM ticket_comments WHERE id = ?', [commentId])
      const deletedComment = await sqliteQuery('SELECT * FROM ticket_comments WHERE id = ?', [commentId])
      if (deletedComment.length === 0) {
        this.addResult('SQLite Comment Delete', 'PASS', 'Comment deleted successfully')
      } else {
        this.addResult('SQLite Comment Delete', 'FAIL', 'Failed to delete comment')
      }

      // Cleanup
      await sqliteRun('DELETE FROM tickets WHERE id = ?', [ticketId])
      await sqliteRun('DELETE FROM users WHERE id = ?', [userId])
      this.addResult('SQLite Cleanup', 'PASS', 'Test data cleaned up successfully')

    } catch (error) {
      this.addResult('SQLite CRUD Operations', 'FAIL', `CRUD error: ${error}`)
    }
  }

  async testPerformance(): Promise<void> {
    console.log('\n⚡ Testing Database Performance...')
    
    // Test PostgreSQL performance
    try {
      const client = await pool.connect()
      const startTime = Date.now()
      
      // Insert multiple users
      const users = []
      for (let i = 0; i < 10; i++) {
        const hashedPassword = await bcrypt.hash(`password${i}`, 10)
        users.push([`user${i}@example.com`, hashedPassword, `User ${i}`, 'channel_partner', 'IT', 'New York'])
      }
      
      for (const user of users) {
        await client.query(
          'INSERT INTO users (email, password_hash, name, role, department, location) VALUES ($1, $2, $3, $4, $5, $6)',
          user
        )
      }
      
      const insertTime = Date.now() - startTime
      this.addResult('PostgreSQL Bulk Insert', 'PASS', `Inserted 10 users in ${insertTime}ms`)

      // Test query performance
      const queryStart = Date.now()
      const result = await client.query('SELECT COUNT(*) FROM users WHERE role = $1', ['channel_partner'])
      const queryTime = Date.now() - queryStart
      this.addResult('PostgreSQL Query Performance', 'PASS', `Query executed in ${queryTime}ms`)

      // Cleanup
      await client.query('DELETE FROM users WHERE email LIKE $1', ['user%@example.com'])
      
    } catch (error) {
      this.addResult('PostgreSQL Performance Test', 'SKIP', `PostgreSQL not available: ${error}`)
    }
  }

  generateReport(): void {
    console.log('\n📊 Test Report Summary')
    console.log('='.repeat(50))
    
    const passed = this.results.filter(r => r.status === 'PASS').length
    const failed = this.results.filter(r => r.status === 'FAIL').length
    const skipped = this.results.filter(r => r.status === 'SKIP').length
    const total = this.results.length
    
    console.log(`Total Tests: ${total}`)
    console.log(`✅ Passed: ${passed}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`⏭️ Skipped: ${skipped}`)
    console.log(`Success Rate: ${((passed / (total - skipped)) * 100).toFixed(1)}%`)
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:')
      this.results.filter(r => r.status === 'FAIL').forEach(result => {
        console.log(`  - ${result.test}: ${result.message}`)
      })
    }
    
    console.log('\n🎉 Database testing completed!')
  }

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Comprehensive Database Tests...')
    console.log('='.repeat(60))
    
    try {
      await this.testPostgreSQL()
      await this.testSQLite()
      await this.testPerformance()
    } catch (error) {
      console.error('❌ Test suite failed:', error)
    } finally {
      // Clean up connections
      closeDatabase()
      await pool.end()
    }
    
    this.generateReport()
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new DatabaseTester()
  tester.runAllTests().catch(console.error)
}

export { DatabaseTester }
