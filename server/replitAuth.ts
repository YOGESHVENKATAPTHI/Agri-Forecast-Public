import * as client from "openid-client";
import { Strategy as OidcStrategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import memorystore from "memorystore";
import { pool } from "./db";

// In-memory user store for development
const devUsers: any = {};

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week

  if (process.env.DATABASE_URL) {
    try {
      const pgStore = connectPg(session);
      const sessionStore = new pgStore({
        pool: pool, // Use the existing Neon pool
        tableName: 'sessions',
        createTableIfMissing: true, // Allow table creation for sessions
        ttl: sessionTtl,
        // Add error handling
        errorLog: (err: Error) => {
          console.warn('Session store error (continuing with memory fallback):', err.message);
        },
      });

      // Handle session store connection errors gracefully
      sessionStore.on?.('error', (err: Error) => {
        console.warn('Session store connection error (sessions may not persist):', err.message);
      });

      return session({
        secret: process.env.SESSION_SECRET!,
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        cookie: {
          httpOnly: true,
          secure: false, // Allow HTTP in development
          maxAge: sessionTtl,
        },
      });
    } catch (error: any) {
      console.warn('Failed to initialize PostgreSQL session store, falling back to memory store:', error.message);
      // Fall through to memory store
    }
  }

  if (process.env.REPL_ID === 'dummy_repl_id') {
    // Use memory store for local development
    const MemoryStore = memorystore(session);
    return session({
      secret: process.env.SESSION_SECRET!,
      store: new MemoryStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: false, // Allow HTTP in development
        maxAge: sessionTtl,
      },
    });
  }

  try {
    const pgStore = connectPg(session);
    const sessionStore = new pgStore({
      pool: pool, // Use the existing Neon pool
      createTableIfMissing: true, // Allow table creation for sessions
      ttl: sessionTtl,
      tableName: "sessions",
      // Add error handling
      errorLog: (err: Error) => {
        console.warn('Session store error (will continue with memory store):', err.message);
      },
    });

    // Handle session store connection errors gracefully
    sessionStore.on?.('error', (err: Error) => {
      console.warn('Session store connection error (sessions may not persist):', err.message);
    });

    return session({
      secret: process.env.SESSION_SECRET!,
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: true,
        maxAge: sessionTtl,
      },
    });
  } catch (error: any) {
    console.warn('Failed to initialize PostgreSQL session store, falling back to memory store:', error.message);
    // Fallback to memory store
    const MemoryStore = memorystore(session);
    return session({
      secret: process.env.SESSION_SECRET!,
      store: new MemoryStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: true,
        maxAge: sessionTtl,
      },
    });
  }
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // For local development, use local auth
  if (process.env.REPL_ID === 'dummy_repl_id') {
    passport.serializeUser((user: any, done) => done(null, user));
    passport.deserializeUser((user: any, done) => done(null, user));

    app.post('/api/login', async (req, res) => {
      const { username, password } = req.body;
      
      try {
        // Check both memory store and database
        let user = devUsers[username];
        if (!user) {
          // Try to find user in database
          const dbUser = await storage.getUserByEmail(username);
          if (dbUser) {
            user = {
              id: dbUser.id,
              email: dbUser.email,
              password: dbUser.password || password, // Use provided password if DB doesn't have one
              firstName: dbUser.firstName,
              lastName: dbUser.lastName
            };
            devUsers[username] = user; // Cache in memory
          }
        }
        
        if (user && user.password === password) {
          req.login({
            claims: {
              sub: user.id,
              email: user.email,
              first_name: user.firstName,
              last_name: user.lastName
            }
          }, (err) => {
            if (err) return res.status(500).json({ message: 'Login failed' });
            res.json({ success: true });
          });
        } else {
          res.status(401).json({ message: 'Invalid credentials' });
        }
      } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Login failed' });
      }
    });

    app.post('/api/signup', async (req, res) => {
      try {
        const { email, password, firstName, lastName, phoneNumber, latitude, longitude, language } = req.body;
        
        if (devUsers[email]) {
          return res.status(400).json({ message: 'User already exists' });
        }

        // Strip '+' from phone number if present
        const cleanPhoneNumber = phoneNumber ? phoneNumber.replace(/^\+/, '') : phoneNumber;

        const userId = `user_${Date.now()}`;
        const user = {
          id: userId,
          email,
          password, // Plain text for dev
          firstName,
          lastName,
          phoneNumber: cleanPhoneNumber,
          language: language || 'en',
        };

        devUsers[email] = user;

        // Also create in DB for persistence with location and password
        await storage.upsertUser({
          id: userId,
          email,
          firstName,
          lastName,
          phoneNumber: cleanPhoneNumber,
          password, // Save password to database
          latitude: latitude && latitude !== 0 ? latitude : undefined,
          longitude: longitude && longitude !== 0 ? longitude : undefined,
          language: language || 'en',
        });

        res.json({ success: true, user: { id: userId, email, firstName, lastName, language: language || 'en' } });
      } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Signup failed' });
      }
    });

    app.get('/api/logout', (req, res, next) => {
      req.logout((err) => {
        if (err) { return next(err); }
        req.session.destroy((err) => {
          res.redirect('/');
        });
      });
    });

    return;
  }

  // Replit auth not used in local dev
}

export async function isAuthenticated(req: any, res: any, next: any) {
  // For local development (when using dummy REPL_ID), check if user is logged in
  if (process.env.REPL_ID === 'dummy_repl_id') {
    if (!req.user || !req.user.claims) {
      return res.status(401).json({ message: "Please log in to continue" });
    }
    return next();
  }

  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
}
