import session from "express-session";
import connectPg from "connect-pg-simple";

const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
const pgStore = connectPg(session);

// Ensure SESSION_SECRET is set in production
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable must be set in production');
}

export const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'dev-secret-key-not-for-production',
  store: new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  }),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: "lax", // CSRF protection
    maxAge: sessionTtl,
  },
});
