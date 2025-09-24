import sqlite3 from 'sqlite3'
import { promisify } from 'util'

// SQLite database configuration
const dbPath = process.env.DB_PATH || './ticket_system.db'
let db: sqlite3.Database | null = null

// Initialize SQLite database
export function initializeSQLite(): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ SQLite connection failed:', err)
        reject(err)
      } else {
        console.log('✅ SQLite database connected successfully')
        resolve(db!)
      }
    })
  })
}

// Test database connection
export async function testConnection() {
  try {
    if (!db) {
      await initializeSQLite()
    }
    console.log('✅ Database connected successfully')
    return true
  } catch (err) {
    console.error('❌ Database connection failed:', err)
    return false
  }
}

// Initialize database tables
export async function initializeDatabase() {
  if (!db) {
    await initializeSQLite()
  }

  const run = promisify(db!.run.bind(db!))
  
  try {
    // Create users table
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('channel_partner', 'assignee', 'head_office', 'technical', 'developer_support')),
        department TEXT,
        location TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create tickets table
    await run(`
      CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL CHECK (category IN ('technical', 'billing', 'general', 'feature_request', 'bug_report')),
        priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'pending_approval', 'resolved', 'closed')),
        created_by INTEGER REFERENCES users(id),
        assigned_to INTEGER REFERENCES users(id),
        assigned_role TEXT CHECK (assigned_role IN ('technical', 'assignee')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        due_date DATETIME,
        tags TEXT
      )
    `)

    // Add assigned_role column if it doesn't exist (for existing databases)
    try {
      await run(`ALTER TABLE tickets ADD COLUMN assigned_role TEXT CHECK (assigned_role IN ('technical', 'assignee'))`)
    } catch (err) {
      // Column already exists, ignore error
    }

    // Create ticket comments table
    await run(`
      CREATE TABLE IF NOT EXISTS ticket_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_internal BOOLEAN DEFAULT FALSE
      )
    `)

    // Create indexes for better performance
    await run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`)
    await run(`CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);`)
    await run(`CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by);`)
    await run(`CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);`)
    await run(`CREATE INDEX IF NOT EXISTS idx_comments_ticket_id ON ticket_comments(ticket_id);`)

    console.log('✅ Database tables initialized successfully')
  } catch (err) {
    console.error('❌ Database initialization failed:', err)
    throw err
  }
}

// Database query helper
export async function query(sql: string, params: any[] = []): Promise<any[]> {
  if (!db) {
    await initializeSQLite()
  }
  
  const all = promisify(db!.all.bind(db!))
  return await all(sql, params)
}

// Database run helper (for INSERT, UPDATE, DELETE)
export async function run(sql: string, params: any[] = []): Promise<sqlite3.RunResult> {
  if (!db) {
    await initializeSQLite()
  }
  
  return new Promise((resolve, reject) => {
    db!.run(sql, params, function(this: sqlite3.RunResult, err: Error | null) {
      if (err) {
        reject(err)
      } else {
        resolve(this)
      }
    })
  })
}

// Close database connection
export function closeDatabase() {
  if (db) {
    db.close()
    db = null
  }
}
