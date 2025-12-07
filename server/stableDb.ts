/**
 * Alternative stable database connection for Neon PostgreSQL
 * This provides a fallback when the serverless driver has issues
 */

import { Client } from 'pg';

export class StableNeonConnection {
  private client: Client | null = null;
  private isConnecting = false;
  private connectionPromise: Promise<Client> | null = null;

  constructor(private connectionString: string) {}

  async getConnection(): Promise<Client> {
    if (this.client && !this.client.ended) {
      return this.client;
    }

    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise;
    }

    this.isConnecting = true;
    this.connectionPromise = this.createConnection();

    try {
      this.client = await this.connectionPromise;
      return this.client;
    } finally {
      this.isConnecting = false;
      this.connectionPromise = null;
    }
  }

  private async createConnection(): Promise<Client> {
    const client = new Client({
      connectionString: this.connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    });

    // Add error handling
    client.on('error', (error) => {
      console.warn('PostgreSQL client error:', error.message);
      this.client = null; // Reset connection on error
    });

    client.on('end', () => {
      console.log('PostgreSQL connection ended');
      this.client = null;
    });

    await client.connect();
    console.log('✅ Stable PostgreSQL connection established');
    
    return client;
  }

  async query(text: string, params?: any[]): Promise<any> {
    const client = await this.getConnection();
    return client.query(text, params);
  }

  async disconnect(): Promise<void> {
    if (this.client && !this.client.ended) {
      await this.client.end();
      this.client = null;
    }
  }
}

// Create stable connection instance
export const stableDb = process.env.DATABASE_URL 
  ? new StableNeonConnection(process.env.DATABASE_URL)
  : null;