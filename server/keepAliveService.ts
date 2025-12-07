/**
 * Render Keep-Alive Service
 * Prevents Render free tier from shutting down due to inactivity
 * Performs periodic health checks and light database operations
 */

import { db } from "./db";
import { users, systemHeartbeat } from "../shared/schema";
import { sql } from "drizzle-orm";

export class RenderKeepAliveService {
  private isRenderEnvironment: boolean;
  private appUrl: string;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.isRenderEnvironment = !!(
      process.env.RENDER || 
      process.env.RENDER_SERVICE_ID || 
      process.env.RENDER_EXTERNAL_URL
    );
    
    // Use Render external URL or fallback to localhost
    this.appUrl = process.env.RENDER_EXTERNAL_URL || 
                  process.env.RENDER_SERVICE_URL ||
                  'http://localhost:5000';
    
    // Always enable keep-alive service for testing and production
    console.log("🔄 Keep-alive service enabled - initializing with 40-second intervals");
    this.startKeepAlive();
  }

  /**
   * Start the keep-alive service with multiple strategies
   */
  private startKeepAlive(): void {
    // Strategy 1: Self-ping every 40 seconds
    this.healthCheckInterval = setInterval(async () => {
      await this.performSelfPing();
    }, 40 * 1000); // 40 seconds

    // Strategy 2: Light database operations every 2 minutes
    setInterval(async () => {
      await this.performLightDatabaseWork();
    }, 2 * 60 * 1000); // 2 minutes

    // Strategy 3: Background maintenance every 30 minutes
    setInterval(async () => {
      await this.performMaintenanceTasks();
    }, 30 * 60 * 1000); // 30 minutes

    console.log("✅ Keep-alive service started with multiple strategies");
    console.log(`🎯 Self-ping every 40 seconds to: ${this.appUrl}`);
    console.log(`🗄️ Database operations every 2 minutes`);
    console.log(`🛠️ Maintenance tasks every 30 minutes`);
  }

  /**
   * Ping the application itself to keep it active
   */
  private async performSelfPing(): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(this.appUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'AgriPredict-KeepAlive/1.0',
          'X-Keep-Alive': 'true'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        console.log(`🏓 Keep-alive ping successful: ${response.status} at ${new Date().toISOString()}`);
      } else {
        console.warn(`⚠️ Keep-alive ping failed: ${response.status} at ${new Date().toISOString()}`);
      }
    } catch (error) {
      console.error("💥 Keep-alive ping error:", error.message);
      // Try alternative endpoint
      await this.performAlternatePing();
    }
  }

  /**
   * Alternative ping method using internal endpoint
   */
  private async performAlternatePing(): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      const response = await fetch(`${this.appUrl}/api/ping`, {
        method: 'GET',
        headers: {
          'User-Agent': 'AgriPredict-KeepAlive/1.0',
          'X-Keep-Alive': 'true'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        console.log(`🏓 Alternative keep-alive ping successful`);
      }
    } catch (error) {
      console.error("💥 Alternative ping failed:", error.message);
    }
  }

  /**
   * Perform light database operations to keep connections active
   */
  private async performLightDatabaseWork(): Promise<void> {
    try {
      // Simple query to check database connectivity
      const result = await db.select({ count: sql`count(*)` }).from(users);
      
      if (result && result[0]) {
        console.log(`📊 Database keep-alive: ${result[0].count} users in system`);
      }

      // Update a system timestamp (if you have such a table)
      // This creates minimal database activity
      await this.updateSystemHeartbeat();

    } catch (error) {
      console.error("💥 Database keep-alive error:", error.message);
    }
  }

  /**
   * Update system heartbeat timestamp
   */
  private async updateSystemHeartbeat(): Promise<void> {
    try {
      // Insert or update heartbeat record
      await db.insert(systemHeartbeat).values({
        lastPing: new Date(),
        status: 'active'
      }).onConflictDoUpdate({
        target: systemHeartbeat.id,
        set: {
          lastPing: new Date(),
          status: 'active',
          updatedAt: new Date()
        }
      }).catch(() => {
        // Table might not exist yet, use simple query instead
        return db.select({ count: sql`1` }).from(users).limit(1);
      });

    } catch (error) {
      // Silently handle errors in heartbeat updates
      console.debug("Heartbeat update skipped:", error.message);
    }
  }

  /**
   * Perform maintenance tasks to keep the system active
   */
  private async performMaintenanceTasks(): Promise<void> {
    try {
      console.log("🛠️ Running maintenance keep-alive tasks...");

      // Task 1: Memory cleanup suggestion
      if (global.gc) {
        global.gc();
        console.log("🧹 Memory cleanup completed");
      }

      // Task 2: Log system status
      const memUsage = process.memoryUsage();
      console.log(`💾 Memory: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`);

      // Task 3: Check environment health
      console.log(`🌡️ Environment: ${process.env.NODE_ENV}, Platform: ${process.platform}`);

      console.log("✅ Maintenance tasks completed");

    } catch (error) {
      console.error("💥 Maintenance task error:", error.message);
    }
  }

  /**
   * Stop the keep-alive service
   */
  public stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    console.log("🛑 Keep-alive service stopped");
  }

  /**
   * Get service status
   */
  public getStatus(): object {
    return {
      enabled: this.isRenderEnvironment,
      appUrl: this.appUrl,
      isActive: !!this.healthCheckInterval,
      environment: {
        render: !!process.env.RENDER,
        renderServiceId: process.env.RENDER_SERVICE_ID,
        renderExternalUrl: process.env.RENDER_EXTERNAL_URL,
      }
    };
  }
}

// Create and export singleton instance
export const keepAliveService = new RenderKeepAliveService();

// Health check endpoint handler
export const handleHealthCheck = (req: any, res: any) => {
  const isKeepAlive = req.headers['x-keep-alive'] === 'true';
  
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    keepAlive: isKeepAlive,
    service: 'AgriPredict API'
  });
};

// Simple ping endpoint handler
export const handlePing = (req: any, res: any) => {
  res.status(200).json({
    pong: true,
    timestamp: new Date().toISOString()
  });
};