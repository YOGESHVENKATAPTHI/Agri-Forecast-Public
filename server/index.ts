import "./config.js";

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";
import { performBackgroundAnalysis } from "./backgroundAnalysis.js";
import { keepAliveService } from "./keepAliveService.js";

// Global error handlers for database connection issues
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  // Handle Neon serverless driver ErrorEvent issue  
  if (reason?.message?.includes('Cannot set property message') ||
      reason?.message?.includes('ErrorEvent') ||
      reason?.stack?.includes('@neondatabase/serverless')) {
    console.warn('Neon serverless driver rejection (handled):', reason?.message);
    return; // Don't crash the process
  }
  
  if (reason?.message?.includes('ENOTFOUND') || reason?.code === 'ENOTFOUND') {
    console.warn('Database connection issue detected - continuing with fallback behavior:', reason.message);
  } else {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  }
});

process.on('uncaughtException', (error: Error) => {
  // Handle Neon serverless driver ErrorEvent issue
  if (error.message?.includes('Cannot set property message') ||
      error.message?.includes('ErrorEvent') ||
      error.stack?.includes('@neondatabase/serverless')) {
    console.warn('Neon serverless driver error (handled):', error.message);
    return; // Don't crash the process
  }
  
  if (error.message?.includes('ENOTFOUND') || (error as any).code === 'ENOTFOUND') {
    console.warn('Database connection exception - continuing with fallback behavior:', error.message);
  } else {
    console.error('Uncaught Exception:', error);
    process.exit(1);
  }
});

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Initialize routes and error handling
async function initializeApp() {
  const server = await registerRoutes(app);

  // Start background analysis task (only in development)
  if (process.env.NODE_ENV === "development") {
    performBackgroundAnalysis();
  }

  // Initialize keep-alive service (will auto-detect Render environment)
  console.log("🔄 Initializing keep-alive service for hosting platform...");
  
  // Keep-alive service will automatically start if running on Render

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    let message = err.message || "Internal Server Error";

    // Handle database connection errors gracefully
    if (err.message?.includes('ENOTFOUND') || err.code === 'ENOTFOUND') {
      console.warn('Database connection error in request:', err.message);
      message = "Service temporarily unavailable - please try again in a moment";
      res.status(503).json({ message, retry: true });
      return;
    }

    res.status(status).json({ message });
    
    // Only throw if it's not a database connection error and not in production
    if (!err.message?.includes('ENOTFOUND') && err.code !== 'ENOTFOUND' && process.env.NODE_ENV !== 'production') {
      throw err;
    }
  });

  // For development mode, setup Vite
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
    
    // Start server in development
    const port = parseInt(process.env.PORT || '5000', 10);
    server.listen(port, () => {
      log(`serving on port ${port}`);
    });
  } else {
    // In production, just serve static files
    serveStatic(app);
  }

  return app;
}

// Initialize the app
initializeApp().then((app) => {
  // For production (like Render), start the server
  if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
    const port = parseInt(process.env.PORT || '10000', 10);
    app.listen(port, '0.0.0.0', () => {
      log(`🚀 Production server running on port ${port}`);
    });
  }
}).catch(console.error);

// Export app for Vercel
export default app;
