import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import fs from "fs";
import os from "os";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { stringify } from "csv-stringify/sync";
import { logSecurityEvent, getSecurityLogs, clearSecurityLogs } from "./src/lib/logger.js";
import { 
  getDb, getSettings, updateSetting, addParticipant, 
  getAllParticipants, getParticipantByEmail, backupDb, clearDatabase,
  getUserByUsername, updateUserPassword, getAllUsers, createUser, updateUserStatus, deleteUser,
  getAllPrizes, addPrize, updatePrize, deletePrize, incrementPrizeRedeemed
} from "./src/db/db.js";

const upload = multer({ dest: os.tmpdir() });
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-for-admin";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.set('trust proxy', true);

  app.use(express.json({ limit: '50mb' })); // For base64 images
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  
  // Custom headers for security
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Ensure DB init
  await getDb();

  // Authentication Middleware
  const authenticateAdmin = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token provided" });
    
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
      if (err) return res.status(401).json({ error: "Invalid token" });
      req.userId = decoded.id;
      req.username = decoded.username;
      req.role = decoded.role || 'user';
      next();
    });
  };

  const requireRoleAdmin = (req: any, res: any, next: any) => {
    if (req.role !== 'admin') {
      return res.status(403).json({ error: "Forbidden: Admin role required" });
    }
    next();
  };

  const requireRoleEditor = (req: any, res: any, next: any) => {
    if (req.role !== 'admin' && req.role !== 'editor') {
      return res.status(403).json({ error: "Forbidden: Editor or Admin role required" });
    }
    next();
  };

  const requireRoleViewer = (req: any, res: any, next: any) => {
    if (req.role !== 'admin' && req.role !== 'editor' && req.role !== 'viewer') {
      return res.status(403).json({ error: "Forbidden: Viewer, Editor or Admin role required" });
    }
    next();
  };

  // API Routes (Public)
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to get settings" });
    }
  });

  app.post("/api/participate", async (req, res) => {
    try {
      const { name, socialName, phone, email, hasTicket, customData } = req.body;
      
      let wonPrize = "0"; // 0 means played but didn't win

      if (hasTicket) {
        // Fetch prizes logic
        const prizes = await getAllPrizes();
        let totalProb = 0;
        const availablePrizes = prizes.filter((p: any) => p.maxQuantity === null || p.redeemedQuantity < p.maxQuantity);
        
        const rand = Math.random();
        let cumulative = 0;
        
        for (const prize of availablePrizes) {
          cumulative += prize.probability;
          if (rand <= cumulative) {
            wonPrize = prize.discount;
            await incrementPrizeRedeemed(prize.id);
            break;
          }
        }
      }

      const result = await addParticipant({
        name, socialName, phone, email, hasTicket, wonPrize, customData
      });

      if (!result.success) {
        if (result.error === 'already_participated') {
          const prev = await getParticipantByEmail(email);
          return res.status(400).json({ 
            error: "already_participated", 
            message: "Você já participou da promoção.",
            previousResult: prev
          });
        }
        return res.status(400).json({ error: "Failed" });
      }

      res.json({ success: true, wonPrize });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Auth Routes
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await getUserByUsername(username);
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

      if (!user) {
        logSecurityEvent("FAILED_LOGIN", { username, ip, reason: "User not found" });
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (user.active === 0) {
        logSecurityEvent("FAILED_LOGIN", { username, ip, reason: "User inactive" });
        return res.status(401).json({ error: "Conta desativada. Entre em contato com o administrador." });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        logSecurityEvent("FAILED_LOGIN", { username, ip, reason: "Incorrect password" });
        return res.status(401).json({ error: "Invalid credentials" });
      }

      logSecurityEvent("SUCCESS_LOGIN", { username, ip });
      const token = jwt.sign({ id: user.id, username: user.username, role: user.role || 'viewer' }, JWT_SECRET, { expiresIn: '8h' });
      res.json({ token, username: user.username, role: user.role || 'viewer' });
    } catch (e) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/admin/change-password", authenticateAdmin, async (req: any, res: any) => {
    try {
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 4) return res.status(400).json({ error: "Invalid password" });
      
      const hash = await bcrypt.hash(newPassword, 10);
      await updateUserPassword(req.userId, hash);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to change password" });
    }
  });

  app.get("/api/admin/users", authenticateAdmin, requireRoleAdmin, async (req: any, res: any) => {
    try {
      const users = await getAllUsers();
      res.json(users);
    } catch(e) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/admin/users", authenticateAdmin, requireRoleAdmin, async (req: any, res: any) => {
    try {
      const { username, password, role } = req.body;
      if (!username || !password || password.length < 4) return res.status(400).json({ error: "Invalid username or password" });
      
      const existing = await getUserByUsername(username);
      if (existing) return res.status(400).json({ error: "Username already exists" });

      const hash = await bcrypt.hash(password, 10);
      await createUser(username, hash, role);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.put("/api/admin/users/:id", authenticateAdmin, requireRoleAdmin, async (req: any, res: any) => {
    try {
      const { username, password, role } = req.body;
      const d = await getDb();
      
      if (password && password.length >= 4) {
        const hash = await bcrypt.hash(password, 10);
        await d.run("UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?", [username, hash, role, req.params.id]);
      } else {
        await d.run("UPDATE users SET username = ?, role = ? WHERE id = ?", [username, role, req.params.id]);
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/admin/users/:id", authenticateAdmin, requireRoleAdmin, async (req: any, res: any) => {
    try {
      if (parseInt(req.params.id) === req.userId) {
        return res.status(400).json({ error: "Cannot delete yourself" });
      }
      await deleteUser(parseInt(req.params.id));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  app.patch("/api/admin/users/:id/status", authenticateAdmin, requireRoleAdmin, async (req: any, res: any) => {
    try {
      const { active } = req.body;
      if (parseInt(req.params.id) === req.userId) {
        return res.status(400).json({ error: "Cannot deactivate yourself" });
      }
      await updateUserStatus(parseInt(req.params.id), active ? 1 : 0);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to update user status" });
    }
  });


  // API Routes (Protected Admin)
  app.post("/api/settings", authenticateAdmin, requireRoleEditor, async (req, res) => {
    try {
      for (const [k, v] of Object.entries(req.body)) {
        await updateSetting(k, v);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  app.get("/api/admin/participants", authenticateAdmin, requireRoleViewer, async (req, res) => {
    try {
      const parts = await getAllParticipants();
      res.json(parts);
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  app.get("/api/admin/export", authenticateAdmin, requireRoleEditor, async (req, res) => {
    try {
      const parts = await getAllParticipants();
      const settings = await getSettings();
      let formFields: any[] = [];
      try {
        formFields = typeof settings.customFormFields === 'string' ? JSON.parse(settings.customFormFields) : (settings.customFormFields || []);
      } catch(e) {}

      const allKeys = new Set<string>();
      
      const mappedParts = parts.map((p: any) => {
        let customDataObj = {};
        try {
          if (p.customData) {
            customDataObj = typeof p.customData === 'string' ? JSON.parse(p.customData) : p.customData;
          }
        } catch(e) {}
        
        const { customData, ...rest } = p;
        const row: any = { ...rest };
        for (const [k, v] of Object.entries(customDataObj)) {
          const field = formFields.find((f: any) => f.id === k);
          const label = field ? field.label : k;
          row[label] = Array.isArray(v) ? v.join(', ') : v;
        }
        Object.keys(row).forEach(k => allKeys.add(k));
        return row;
      });

      const columns = Array.from(allKeys);
      const csv = stringify(mappedParts, { header: true, columns });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="participants.csv"');
      res.send(csv);
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  // Prizes
  app.get("/api/admin/prizes", authenticateAdmin, requireRoleEditor, async (req, res) => {
    try {
      const prizes = await getAllPrizes();
      res.json(prizes);
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  app.post("/api/admin/prizes", authenticateAdmin, requireRoleEditor, async (req, res) => {
    try {
      await addPrize(req.body);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  app.put("/api/admin/prizes/:id", authenticateAdmin, requireRoleEditor, async (req, res) => {
    try {
      await updatePrize(parseInt(req.params.id), req.body);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  app.delete("/api/admin/prizes/:id", authenticateAdmin, requireRoleEditor, async (req, res) => {
    try {
      await deletePrize(parseInt(req.params.id));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  // Backup & Restore
  // Note: For simplicity with browser downloads, we might want to check a token via query param instead of header
  // Or handle it in frontend by fetching blob. We will stick to header here and fetch via blob in frontend.
  app.get("/api/admin/backup", authenticateAdmin, requireRoleAdmin, async (req, res) => {
    try {
      const dbPath = await backupDb();
      res.download(dbPath, 'database.sqlite', async (err) => {
        await getDb();
      });
    } catch (e) {
      res.status(500).json({ error: "Failed to backup" });
    }
  });

  app.post("/api/admin/restore", authenticateAdmin, requireRoleAdmin, upload.single('dbFile'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      const dbPath = await backupDb(); 
      fs.copyFileSync(req.file.path, dbPath);
      fs.unlinkSync(req.file.path);
      await getDb(); 
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to restore" });
    }
  });

  app.post("/api/admin/clear", authenticateAdmin, requireRoleAdmin, async (req, res) => {
    try {
      await clearDatabase();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to clear DB" });
    }
  });

  // Security Logs API
  app.get("/api/admin/security-logs", authenticateAdmin, requireRoleAdmin, (req, res) => {
    res.json(getSecurityLogs());
  });

  app.post("/api/admin/security-logs/clear", authenticateAdmin, requireRoleAdmin, (req, res) => {
    clearSecurityLogs();
    res.json({ success: true });
  });

  // Security Monitoring Middleware for 404s / suspicious paths
  app.use('/api/*', (req, res) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    logSecurityEvent("INVALID_API_ACCESS", { path: req.originalUrl, ip, method: req.method });
    res.status(404).json({ error: "Endpoint not found" });
  });

  // Suspicious paths (common exploits and bot scanners)
  const suspiciousRegex = /(\.php|\.env|\.git|\.sqlite|\.config|\.well-known|wp-admin|wp-login|config|setup|admin\/phpinfo|cgi-bin|\.aws|\.ssh)/i;
  
  // Middleware to log 404s and suspicious attempts
  app.use((req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const pathRequested = req.originalUrl;

    // 1. Detect known exploit patterns
    if (suspiciousRegex.test(pathRequested)) {
      logSecurityEvent("SUSPICIOUS_PATH_ACCESS", { path: pathRequested, ip, userAgent: req.headers['user-agent'] });
      return res.status(403).send("Forbidden");
    }

    // 2. Check for "File 404s" (requests with extensions that don't exist)
    // We only log if it has a dot (extension) and isn't handled by static/vite yet
    // This catches bots looking for .php, .js.map, etc.
    const hasExtension = /\.[a-z0-9]{2,4}$/i.test(pathRequested.split('?')[0]);
    
    // We let normal routes pass to the SPA fallback, but log file-like 404s later
    res.on('finish', () => {
      if (res.statusCode === 404 && (hasExtension || pathRequested.includes('..'))) {
        logSecurityEvent("NOT_FOUND_FILE_ACCESS", { path: pathRequested, ip, method: req.method });
      }
    });

    next();
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // In express 5, use *all if applicable. Express 4 uses *
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
