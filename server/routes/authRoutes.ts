import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { authService } from "../services/authService";
import { emailService } from "../services/emailService";
import { trackLoginAttempt, checkBruteForce, bruteForceMiddleware } from "../middleware/bruteForceProtection";
import { authRateLimit } from "../middleware/rateLimitingAdvanced";

const router = Router();

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

const resendVerificationSchema = z.object({
  email: z.string().email("Invalid email address"),
});

// ============================================================
// AUTHENTICATION ROUTES
// ============================================================

/**
 * POST /api/auth/register
 * Register new user with email and password
 */
router.post("/register", async (req, res) => {
  try {
    // Validate input
    const data = registerSchema.parse(req.body);

    // Register account
    const result = await authService.register(data.email, data.password);

    // Send verification email
    await emailService.sendVerificationEmail(data.email, result.verificationToken);
    
    res.json({
      success: true,
      message: "Registration successful! Please check your email to verify your account.",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.errors,
      });
    }

    res.status(400).json({
      success: false,
      error: error.message || "Registration failed",
    });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post("/login", authRateLimit, async (req, res) => {
  try {
    // Validate input
    const data = loginSchema.parse(req.body);

    // Get IP address
    const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0] || 
                     req.socket.remoteAddress || 
                     "unknown";

    // Check for brute force attacks by IP
    const bruteCheck = checkBruteForce(ipAddress);
    if (bruteCheck.blocked) {
      return res.status(429).json({
        success: false,
        error: bruteCheck.message,
        retryAfter: bruteCheck.retryAfterMs,
      });
    }

    // Check for brute force attacks by email
    const emailBruteCheck = checkBruteForce(`email:${data.email.toLowerCase()}`);
    if (emailBruteCheck.blocked) {
      return res.status(429).json({
        success: false,
        error: emailBruteCheck.message,
        retryAfter: emailBruteCheck.retryAfterMs,
      });
    }

    // Login
    const result = await authService.login(data.email, data.password, ipAddress);

    // Check if email is verified
    if (!result.emailVerified) {
      return res.status(403).json({
        success: false,
        error: "Please verify your email before logging in",
        emailVerified: false,
      });
    }

    // Create session
    req.session.userId = result.accountId;
    req.session.emailVerified = result.emailVerified;

    // Regenerate session ID to prevent session fixation
    req.session.save((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          error: "Session creation failed",
        });
      }

      // Track successful login (clears brute force tracking)
      const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0] || 
                       req.socket.remoteAddress || 
                       "unknown";
      trackLoginAttempt(ipAddress, true);
      trackLoginAttempt(`email:${data.email.toLowerCase()}`, true);

      res.json({
        success: true,
        message: "Login successful",
        accountId: result.accountId,
      });
    });
  } catch (error: any) {
    // Track failed login attempt for brute force protection
    const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0] || 
                     req.socket.remoteAddress || 
                     "unknown";
    const email = req.body?.email?.toLowerCase();
    
    if (ipAddress) {
      trackLoginAttempt(ipAddress, false);
    }
    if (email) {
      trackLoginAttempt(`email:${email}`, false);
    }

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.errors,
      });
    }

    res.status(401).json({
      success: false,
      error: error.message || "Login failed",
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout current user
 */
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: "Logout failed",
      });
    }

    res.clearCookie("connect.sid");
    res.json({
      success: true,
      message: "Logout successful",
    });
  });
});

/**
 * POST /api/auth/verify-email
 * Verify email with token
 */
router.post("/verify-email", async (req, res) => {
  try {
    // Validate input
    const data = verifyEmailSchema.parse(req.body);

    // Verify email
    const result = await authService.verifyEmail(data.token);

    res.json({
      success: true,
      message: "Email verified successfully! You can now log in.",
      accountId: result.accountId,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.errors,
      });
    }

    res.status(400).json({
      success: false,
      error: error.message || "Email verification failed",
    });
  }
});

/**
 * POST /api/auth/resend-verification
 * Resend verification email
 */
router.post("/resend-verification", async (req, res) => {
  try {
    // Validate input
    const data = resendVerificationSchema.parse(req.body);

    // Resend verification
    const result = await authService.resendVerification(data.email);

    // Send verification email
    await emailService.sendVerificationEmail(data.email, result.verificationToken);
    
    res.json({
      success: true,
      message: "Verification email sent! Please check your inbox.",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.errors,
      });
    }

    res.status(400).json({
      success: false,
      error: error.message || "Failed to resend verification email",
    });
  }
});

/**
 * POST /api/auth/forgot-password
 * Initiate password reset
 */
router.post("/forgot-password", async (req, res) => {
  try {
    // Validate input
    const data = forgotPasswordSchema.parse(req.body);

    // Initiate password reset
    const result = await authService.initiatePasswordReset(data.email);

    // Send password reset email if account exists
    if (result.resetToken) {
      await emailService.sendPasswordResetEmail(data.email, result.resetToken);
    }
    
    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: "If an account exists with that email, a password reset link has been sent.",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.errors,
      });
    }

    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: "If an account exists with that email, a password reset link has been sent.",
    });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post("/reset-password", async (req, res) => {
  try {
    // Validate input
    const data = resetPasswordSchema.parse(req.body);

    // Reset password
    await authService.resetPassword(data.token, data.password);

    res.json({
      success: true,
      message: "Password reset successful! You can now log in with your new password.",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.errors,
      });
    }

    res.status(400).json({
      success: false,
      error: error.message || "Password reset failed",
    });
  }
});

/**
 * GET /api/auth/user
 * Get current user info
 */
router.get("/user", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({
      success: false,
      error: "Not authenticated",
    });
  }

  try {
    const account = await authService.getAccount(req.session.userId);

    if (!account) {
      return res.status(404).json({
        success: false,
        error: "Account not found",
      });
    }

    res.json({
      success: true,
      user: {
        id: account.id,
        email: account.email,
        emailVerified: account.emailVerified,
        status: account.status,
        lastLoginAt: account.lastLoginAt,
        createdAt: account.createdAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to get user info",
    });
  }
});

export default router;
