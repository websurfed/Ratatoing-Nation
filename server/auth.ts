import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User, InsertUser, loginUserSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

declare global {
  namespace Express {
    interface User extends User {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  // Check if password has correct format (hash.salt)
  if (!stored || !stored.includes('.')) {
    return false;
  }
  
  const [hashed, salt] = stored.split(".");
  
  // Additional validation to avoid errors with undefined salt
  if (!hashed || !salt) {
    return false;
  }
  
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Create a random session secret if not provided
  const sessionSecret = process.env.SESSION_SECRET || randomBytes(32).toString('hex');

  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          return done(null, false, { message: "Incorrect username or password" });
        }
        
        if (!(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Incorrect username or password" });
        }
        
        if (user.status === 'pending') {
          return done(null, false, { message: "Your account is pending approval" });
        }
        
        if (user.status === 'banned') {
          return done(null, false, { message: "Your account has been banned" });
        }
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Register endpoint
  app.post("/api/register", async (req, res, next) => {
    try {
      const BANNED_NAMES = ['gemma', 'mark', 'william'];
      function containsBannedName(input: string) {
          if (!input) return false;
          const lowerInput = input.toLowerCase();
          return BANNED_NAMES.some(banned => lowerInput.includes(banned.toLowerCase()));
      }
      
      if (containsBannedName(req.body.name) || containsBannedName(req.body.username)) {
          return res.status(400).json({ error: "Name/username contains forbidden or violating content" });
      }
      
      if (req.body.username === 'banson' || req.body.username === 'banson2') {
        const existingAdmin = await storage.getUserByUsername(req.body.username);
        
        if (!existingAdmin) {
          const userData: InsertUser = {
            ...req.body,
            rank: 'Banson',
            status: 'active',
            pocketSniffles: 10000,
            password: await hashPassword(req.body.password)
          };
          
          const user = await storage.createUser(userData);
          
          // Use destructuring to avoid mutating the object
          const { password, ...userWithoutPassword } = user;
          
          return res.status(201).json(userWithoutPassword);
        }
      }
      
      // Validate input
      const userData = loginUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser?.status === "pending") {
        return res.status(400).json({ message: "Account waiting on approval" });
      }
      
      // Generate unique cell digits (10 digits starting with 1)
      const cellDigits = (1000000000 + Math.floor(Math.random() * 9000000000)).toString();

      // Create user with hashed password and cell digits
      const newUser: InsertUser = {
        ...req.body,
        password: await hashPassword(req.body.password),
        email: `${req.body.username}@ratatoing`,
        status: 'pending',
        cellDigits: (1000000000 + Math.floor(Math.random() * 9000000000)).toString()
      };
      
      const user = await storage.createUser(newUser);
      
      // Don't return the password
      const { password, ...userWithoutPassword } = user;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });

  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info.message || "Authentication failed" });
      
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Don't return the password
        const { password, ...userWithoutPassword } = user;
        return res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Get current user
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Don't return the password
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });
  
  // Pin verification
  app.post("/api/verify-pin", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    const { pin } = req.body;
    
    if (!pin) {
      return res.status(400).json({ message: "PIN is required" });
    }
    
    if (pin !== req.user.pin) {
      return res.status(401).json({ message: "Invalid PIN" });
    }
    
    res.status(200).json({ message: "PIN verified successfully" });
  });
}
