import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import type { Express, Request, Response, NextFunction } from "express";

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

// Extend Express types for user
declare global {
    namespace Express {
        interface User {
            id: string;
            username: string;
            password: string;
        }
    }
}

export function setupAuth(app: Express) {
    const PgSessionStore = connectPgSimple(session);

    app.use(
        session({
            store: new PgSessionStore({
                conString: process.env.DATABASE_URL,
                createTableIfMissing: true,
            }),
            secret: process.env.SESSION_SECRET || "ruby-ai-secret-key-change-in-production",
            resave: false,
            saveUninitialized: false,
            cookie: {
                secure: process.env.NODE_ENV === "production",
                httpOnly: true,
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
                sameSite: "lax",
            },
        })
    );

    app.use(passport.initialize());
    app.use(passport.session());

    passport.use(
        new LocalStrategy(async (username, password, done) => {
            try {
                const user = await storage.getUserByUsername(username);
                if (!user) {
                    return done(null, false, { message: "Invalid username or password" });
                }
                const isValid = await comparePasswords(password, user.password);
                if (!isValid) {
                    return done(null, false, { message: "Invalid username or password" });
                }
                return done(null, user);
            } catch (err) {
                return done(err);
            }
        })
    );

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id: string, done) => {
        try {
            const user = await storage.getUser(id);
            done(null, user || undefined);
        } catch (err) {
            done(err);
        }
    });

    // --- Auth Routes ---

    app.post("/api/auth/register", async (req: Request, res: Response) => {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({ error: "Username and password are required" });
            }

            if (username.length < 3) {
                return res.status(400).json({ error: "Username must be at least 3 characters" });
            }

            if (password.length < 6) {
                return res.status(400).json({ error: "Password must be at least 6 characters" });
            }

            const existing = await storage.getUserByUsername(username);
            if (existing) {
                return res.status(409).json({ error: "Username already taken" });
            }

            const hashedPassword = await hashPassword(password);
            const user = await storage.createUser({ username, password: hashedPassword });

            req.login(user, (err) => {
                if (err) {
                    return res.status(500).json({ error: "Failed to create session" });
                }
                return res.status(201).json({ id: user.id, username: user.username });
            });
        } catch (error) {
            console.error("Registration error:", error);
            res.status(500).json({ error: "Registration failed" });
        }
    });

    app.post("/api/auth/login", (req: Request, res: Response, next: NextFunction) => {
        passport.authenticate("local", (err: any, user: Express.User | false, info: any) => {
            if (err) return next(err);
            if (!user) {
                return res.status(401).json({ error: info?.message || "Invalid credentials" });
            }
            req.login(user, (err) => {
                if (err) return next(err);
                return res.json({ id: user.id, username: user.username });
            });
        })(req, res, next);
    });

    app.post("/api/auth/logout", (req: Request, res: Response) => {
        req.logout((err) => {
            if (err) {
                return res.status(500).json({ error: "Logout failed" });
            }
            res.json({ message: "Logged out successfully" });
        });
    });

    app.get("/api/auth/me", (req: Request, res: Response) => {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: "Not authenticated" });
        }
        const user = req.user!;
        res.json({ id: user.id, username: user.username });
    });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
    }
    next();
}
