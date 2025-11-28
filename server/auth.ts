// From blueprint:javascript_auth_all_persistance - Authentication system implementation
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { loginUserSchema, registerUserSchema, User as SchemaUser } from "@shared/schema";
import { z } from "zod";
import { authRateLimit, registrationRateLimit } from "./middleware/authRateLimit";
import { logger } from "./logger";
import { csrfProtection } from "./middleware/csrf";

type AuthUser = Omit<SchemaUser, 'password'>;

declare global {
  namespace Express {
    interface User extends AuthUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupLocalAuth(app: Express) {
  // Unified session serialization for both local and OIDC users
  // Set up serialization (will override replitAuth but handle both types)
  passport.serializeUser((user: any, done) => {
      // Handle OIDC users (with expires_at), social users (with authProvider), and local users
      if (user.expires_at) {
        // OIDC user - store full object for token refresh
        done(null, { type: 'oidc', user });
      } else if (user.authProvider === 'social' || user.socialProvider) {
        // Social auth user - store ID and provider info
        done(null, { type: 'social', id: user.id, provider: user.socialProvider });
      } else {
        // Local user - store ID only
        done(null, { type: 'local', id: user.id });
      }
    });

    passport.deserializeUser(async (data: any, done) => {
      try {
        if (data.type === 'oidc') {
          // OIDC user - return stored object
          return done(null, data.user);
        } else if (data.type === 'local' || data.type === 'social') {
          // Local or social user - fetch from database
          const user = await storage.getUser(data.id);
          if (!user) return done(null, false);
          
          // Don't include password in session
          const { password, ...userWithoutPassword } = user;
          
          // For social users, add provider info back to session
          if (data.type === 'social' && data.provider) {
            userWithoutPassword.socialProvider = data.provider;
          }
          
          done(null, userWithoutPassword);
        } else {
          done(null, false);
        }
      } catch (error) {
        done(error);
      }
    });

  // Local username/password authentication strategy
  passport.use("local", new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user || !user.password || user.authProvider !== "local") {
        return done(null, false, { message: "Invalid username or password" });
      }
      
      const isValid = await comparePasswords(password, user.password);
      if (!isValid) {
        return done(null, false, { message: "Invalid username or password" });
      }
      
      // Don't include password in session
      const { password: _, ...userWithoutPassword } = user;
      return done(null, userWithoutPassword);
    } catch (error) {
      return done(error);
    }
  }));

  // Local auth routes with rate limiting and CSRF protection
  app.post("/api/register", registrationRateLimit, csrfProtection, async (req, res, next) => {
    try {
      // Validate request body
      const validatedData = registerUserSchema.parse(req.body);
      
      // Check if username or email already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const existingEmail = await storage.getUserByEmail(validatedData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(validatedData.password);
      const userData = {
        username: validatedData.username,
        email: validatedData.email,
        password: hashedPassword,
        role: "fan" as const, // SECURITY: Always create users as fans, ignore client role
        firstName: validatedData.firstName || null,
        lastName: validatedData.lastName || null,
        authProvider: "local" as const,
        status: "active" as const,
        profileImageUrl: null,
        onlineStatus: false,
        lastSeenAt: new Date(),
      };

      const user = await storage.createUser(userData);
      
      // Log in the user
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Don't return password
        const { password: _, ...userResponse } = user;
        res.status(201).json(userResponse);
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login", authRateLimit, csrfProtection, (req, res, next) => {
    try {
      // Validate request body
      const validatedData = loginUserSchema.parse(req.body);
      
      passport.authenticate("local", (err: any, user: any, info: any) => {
        if (err) return next(err);
        
        if (!user) {
          return res.status(401).json({ 
            message: info?.message || "Invalid username or password" 
          });
        }
        
        req.login(user, (err) => {
          if (err) return next(err);
          res.status(200).json(user);
        });
      })(req, res, next);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Get current authenticated user endpoint
  app.get("/api/auth/user", (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ 
          error: 'Not authenticated',
          message: 'User is not logged in'
        });
      }

      // User is authenticated, return user data
      const user = req.user;
      if (!user) {
        return res.status(403).json({ 
          error: 'User not found',
          message: 'Authenticated but user data not available'
        });
      }

      // Make sure we don't return password (extra safety)
      const { password, ...userWithoutPassword } = user as any;
      
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      logger.error('Error getting authenticated user:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        userId: req.user?.id
      });
      
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to retrieve user information'
      });
    }
  });
}