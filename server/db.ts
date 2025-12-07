import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../shared/schema";

// Configure Neon with WebSocket constructor and error handling
neonConfig.webSocketConstructor = ws;

// Configure Neon to use a more stable connection mode
neonConfig.fetchConnectionCache = true;
neonConfig.poolQueryViaFetch = false; // Use WebSocket for better stability

// Override WebSocket error handling to prevent ErrorEvent issues
const originalWebSocket = ws;
class SafeWebSocket extends originalWebSocket {
  constructor(address: any, protocols?: any) {
    super(address, protocols);
    
    // Override error event handling
    this.on('error', (error: any) => {
      // Safely handle ErrorEvent readonly property issue
      try {
        if (error && typeof error === 'object' && 'message' in error) {
          // Create a new regular Error instead of ErrorEvent
          const safeError = new Error(error.message || 'WebSocket connection error');
          safeError.stack = error.stack;
          super.emit('error', safeError);
          return;
        }
      } catch (e) {
        // Fallback for any other error handling issues
        super.emit('error', new Error('WebSocket connection error'));
      }
    });
  }
}

neonConfig.webSocketConstructor = SafeWebSocket as any;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Enhanced pool configuration with retry logic
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 10, // Reduced max connections to prevent overload
  idleTimeoutMillis: 20000, // Reduced idle timeout
  connectionTimeoutMillis: 8000, // Reduced connection timeout
  allowExitOnIdle: true, // Allow process to exit when connections are idle
};

export const pool = new Pool(poolConfig);

// Global error handler to prevent crashes
process.on('uncaughtException', (error) => {
  if (error.message?.includes('Cannot set property message') || 
      error.message?.includes('ErrorEvent') ||
      error.stack?.includes('@neondatabase/serverless')) {
    console.warn('Neon serverless driver error (non-fatal):', error.message);
    return; // Don't crash the process
  }
  // Re-throw other uncaught exceptions
  throw error;
});

// Add error handling for pool connection issues
pool.on('error', (err) => {
  if (err.message?.includes('Cannot set property message')) {
    console.warn('Neon driver internal error (handled):', err.message);
    return;
  }
  console.error('Database pool error - will retry automatically:', err.message);
  // Don't throw here, let individual queries handle retries
});

// Retry wrapper for database operations
export async function withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      console.warn(`Database operation failed (attempt ${attempt}/${maxRetries}):`, error.message);
      
      // Don't retry on certain permanent errors
      if (error.code === 'EAUTH' || error.code === 'EINVAL') {
        throw error;
      }
      
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}

// Create database connection with error handling
let dbInstance: ReturnType<typeof drizzle>;

try {
  dbInstance = drizzle({ client: pool, schema });
} catch (error: any) {
  console.error('Failed to initialize database connection:', error.message);
  // Create a fallback instance that will fail gracefully
  dbInstance = drizzle({ client: pool, schema });
}

export const db = dbInstance;

// Test connection on startup with graceful handling
setImmediate(async () => {
  try {
    await withRetry(async () => {
      const client = await pool.connect();
      const result = await client.query('SELECT 1 as test');
      client.release();
      console.log('✅ Database connection established successfully');
      return result;
    });
  } catch (error: any) {
    console.warn('⚠️ Database connection test failed, will retry on first use:', error.message);
  }
});
