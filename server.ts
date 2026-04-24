import express from "express";
import compression from "compression";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createClient } from '@supabase/supabase-js';

const resolvedFilename = typeof import.meta !== 'undefined' && import.meta.url 
  ? fileURLToPath(import.meta.url) 
  : (typeof __filename !== 'undefined' ? __filename : '');

const resolvedDirname = typeof import.meta !== 'undefined' && import.meta.url 
  ? path.dirname(fileURLToPath(import.meta.url)) 
  : (typeof __dirname !== 'undefined' ? __dirname : process.cwd());

const app = express();
app.use(compression());
app.set('trust proxy', 1); // Trust first proxy (Cloud Run load balancer)
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "pdf-analyzer-secret-key-2026"; // Static fallback to prevent logout on restarts

// Supabase Setup
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

// Initialize with placeholders if not configured to prevent "supabaseUrl is required" error
const supabase = createClient(
  supabaseUrl || "https://placeholder-project.supabase.co", 
  supabaseServiceKey || "placeholder-key"
);

const isSupabaseConfigured = Boolean(supabaseUrl && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY));

// Database Setup (Local JSON - Fallback if Supabase is not configured)
const isPkg = (process as any).pkg !== undefined;
const isCloudRun = process.env.K_SERVICE !== undefined || process.env.CLOUD_RUN_JOB !== undefined;
const baseDir = isPkg ? path.dirname(process.execPath) : process.cwd();
const DB_FILE = path.join(baseDir, "db.json");
const UPLOAD_DIR = path.join(baseDir, "uploads");
const CHUNK_DIR = path.join(baseDir, "uploads/chunks");

let db: any = { users: [], prompts: [], documents: [], annotations: [], favorites: [] };

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(data);
      db = {
        users: parsed.users || [],
        prompts: parsed.prompts || [],
        documents: parsed.documents || [],
        annotations: parsed.annotations || [],
        favorites: parsed.favorites || []
      };
      console.log("Database loaded successfully");
    } else {
      console.log("Database file not found, creating initial data");
      const initialData = {
        users: [
          {
            id: uuidv4(),
            name: "Walter Oliveira",
            email: "walterolv@gmail.com",
            password: bcrypt.hashSync("Master@455680", 10),
            role: "admin",
            created_at: new Date().toISOString()
          },
          {
            id: uuidv4(),
            name: "Walter de oliveira",
            email: "walter.oliveira@montreal.com.br",
            password: bcrypt.hashSync("Miguel@290981", 10),
            role: "admin",
            created_at: new Date().toISOString()
          },
          {
            id: uuidv4(),
            name: "Herbert Giocondo De Almeida",
            email: "herbert.almeida@montreal.com.br",
            password: bcrypt.hashSync("Montreal@2026", 10),
            role: "user",
            created_at: new Date().toISOString()
          },
          {
            id: uuidv4(),
            name: "Usuário Convidado",
            email: "convidado@pdfmaster.ai",
            password: bcrypt.hashSync("Convidado@2026", 10),
            role: "user",
            created_at: new Date().toISOString()
          }
        ],
        prompts: [
          {
            id: uuidv4(),
            name: "Análise Padrão",
            prompt: "Você é um assistente jurídico especializado em análise de documentos. Analise o seguinte documento e forneça um resumo detalhado, identificando as partes envolvidas, datas críticas, obrigações principais e possíveis riscos.",
            is_default: true,
            created_at: new Date().toISOString()
          }
        ],
        documents: [],
        annotations: [],
        favorites: []
      };
      db = initialData;
      saveDB();
    }
  } catch (err) {
    console.error("Error loading database:", err);
  }
}

function saveDB() {
  if (isCloudRun || process.env.VERCEL) return;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error("Error saving database:", err);
  }
}

// Initial load
loadDB();

// Sync requested users
async function syncUsers() {
  const requiredUsers = [
    {
      name: "Herbert Giocondo De Almeida",
      email: "herbert.almeida@montreal.com.br",
      password: "Montreal@2026",
      role: "user"
    },
    {
      name: "Claudio Eustaquio Da Silva",
      email: "claudioeustaquio@montreal.com.br",
      password: "Montreal@2026",
      role: "admin"
    },
    {
      name: "Walter de oliveira",
      email: "walter.oliveira@montreal.com.br",
      password: "Miguel@290981",
      role: "admin"
    },
    {
      name: "Walter de oliveira",
      email: "walterolv@gmail.com",
      password: "Miguel@290981",
      role: "admin"
    }
  ];

  if (isSupabaseConfigured) {
    console.log("Syncing users with Supabase...");
    for (const reqUser of requiredUsers) {
      try {
        const { data: existingUser, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .ilike('email', reqUser.email)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error(`Error fetching user ${reqUser.email} from Supabase:`, fetchError);
          continue;
        }

        const hashedPassword = bcrypt.hashSync(reqUser.password, 10);
        const userData = {
          name: reqUser.name,
          email: reqUser.email.toLowerCase(),
          password: hashedPassword,
          role: reqUser.role,
        };

        if (!existingUser) {
          const { error: insertError } = await supabase
            .from('users')
            .insert([{ ...userData, id: uuidv4(), created_at: new Date().toISOString() }]);
          
          if (insertError) {
            console.error(`Error inserting user ${reqUser.email} into Supabase:`, insertError);
          } else {
            console.log(`User ${reqUser.email} added to Supabase`);
          }
        } else {
          const { error: updateError } = await supabase
            .from('users')
            .update(userData)
            .eq('id', existingUser.id);
          
          if (updateError) {
            console.error(`Error updating user ${reqUser.email} in Supabase:`, updateError);
          } else {
            console.log(`User ${reqUser.email} updated in Supabase`);
          }
        }
      } catch (err) {
        console.error(`Unexpected error syncing user ${reqUser.email} with Supabase:`, err);
      }
    }
  }

  // Also sync with local DB as fallback
  let changed = false;
  requiredUsers.forEach(reqUser => {
    const existingUserIndex = db.users.findIndex((u: any) => u.email.toLowerCase() === reqUser.email.toLowerCase());
    const hashedPassword = bcrypt.hashSync(reqUser.password, 10);
    
    if (existingUserIndex === -1) {
      db.users.push({
        id: uuidv4(),
        name: reqUser.name,
        email: reqUser.email.toLowerCase(),
        password: hashedPassword,
        role: reqUser.role,
        created_at: new Date().toISOString()
      });
      changed = true;
      console.log(`User ${reqUser.email} added to local database`);
    } else {
      const existingUser = db.users[existingUserIndex];
      // Only update if something changed (to avoid unnecessary saves and re-hashing)
      // For simplicity in this sync function, we'll just update name, password, and role
      existingUser.name = reqUser.name;
      existingUser.password = hashedPassword;
      existingUser.role = reqUser.role;
      changed = true;
      console.log(`User ${reqUser.email} updated in local database`);
    }
  });

  if (changed) {
    saveDB();
  }
}

syncUsers().catch(err => console.error("Failed to sync users on startup:", err));

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(cors());

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per windowMs
  message: { error: "Muitas tentativas de login, tente novamente mais tarde." },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  validate: { xForwardedForHeader: false }, // Trust proxy is already set on app
});

app.use("/api/auth/", authLimiter);

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

interface AuthRequest extends express.Request {
  user?: any;
}

// Auth Middleware
const authenticateToken = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: "Access denied" });

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Auth failed for token: ${token.substring(0, 10)}... Error:`, err instanceof Error ? err.message : err);
    res.status(401).json({ error: "Invalid token" });
  }
};

const isAdmin = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: "Admin access required" });
  }
};

// Request logger for debugging - MOVE THIS EARLIER
app.use((req, res, next) => {
  if (req.url.startsWith('/api/')) {
    console.log(`[API REQUEST] ${new Date().toISOString()} - ${req.method} ${req.url}`);
  }
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.url.startsWith('/api/')) {
      console.log(`[API RESPONSE] ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
    }
  });
  next();
});

// Ensure uploads and chunks directory exists (Restored)
const uploadsDir = (process.env.VERCEL || isCloudRun) ? "/tmp/uploads" : UPLOAD_DIR;
const chunksDir = (process.env.VERCEL || isCloudRun) ? "/tmp/chunks" : CHUNK_DIR;

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`Created uploads directory at ${uploadsDir}`);
} else {
  console.log(`Uploads directory exists at ${uploadsDir}`);
}

// Check writability
try {
  const testFile = path.join(uploadsDir, '.write-test');
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
  console.log(`Uploads directory is writable: ${uploadsDir}`);
} catch (e) {
  console.error(`[CRITICAL] Uploads directory is NOT writable: ${uploadsDir}`, e);
}

if (!fs.existsSync(chunksDir)) {
  fs.mkdirSync(chunksDir, { recursive: true });
  console.log(`Created chunks directory at ${chunksDir}`);
}

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const id = uuidv4();
    // Sanitize filename to avoid issues with special characters or long names
    const safeName = file.originalname.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const extension = path.extname(file.originalname).toLowerCase() || '.pdf';
    const finalName = safeName.endsWith(extension) ? safeName : `${safeName}${extension}`;
    cb(null, `${id}-${finalName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB (Increased for portable use)
});

// API Routes
app.get("/api/ping", (req, res) => {
  res.json({ message: "pong", time: new Date().toISOString() });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Route to download portable executables
app.get("/api/download/portable/:platform", (req, res) => {
  const { platform } = req.params;
  let fileName = "";
  
  if (platform === "windows") {
    fileName = "react-example-win.exe";
  } else if (platform === "linux") {
    fileName = "react-example-linux";
  } else if (platform === "macos") {
    fileName = "react-example-macos";
  } else {
    return res.status(400).json({ error: "Plataforma inválida" });
  }

  const filePath = path.join(process.cwd(), "bin", fileName);
  
  if (fs.existsSync(filePath)) {
    res.download(filePath, fileName);
  } else {
    res.status(404).json({ error: `Executável para ${platform} não encontrado no servidor` });
  }
});

// Chunked Upload Endpoints
const chunkUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadId = req.body.uploadId;
      if (!uploadId) {
        return cb(new Error("uploadId is required"), "");
      }
      const chunkPath = path.join(chunksDir, uploadId);
      if (!fs.existsSync(chunkPath)) fs.mkdirSync(chunkPath, { recursive: true });
      cb(null, chunkPath);
    },
    filename: (req, file, cb) => {
      const chunkIndex = req.body.chunkIndex;
      if (chunkIndex === undefined) {
        return cb(new Error("chunkIndex is required"), "");
      }
      cb(null, `chunk-${chunkIndex}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB per chunk (Increased)
});

app.post("/api/upload/chunk", authenticateToken, (req: any, res: any, next: any) => {
  chunkUpload.single('chunk')(req, res, (err: any) => {
    if (err) {
      console.error("Multer chunk upload error:", err);
      return res.status(400).json({ error: err.message });
    }
    try {
      res.json({ success: true, chunkIndex: req.body.chunkIndex });
    } catch (err: any) {
      console.error("Chunk upload success handler error:", err);
      res.status(500).json({ error: err.message });
    }
  });
});

app.post("/api/upload/complete", authenticateToken, async (req: any, res) => {
  const { uploadId, fileName, totalChunks, fileSize } = req.body;
  const userId = req.user.id;
  
  try {
    const chunkPath = path.join(chunksDir, uploadId);
    const id = uuidv4();
    const safeName = fileName.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const extension = path.extname(fileName).toLowerCase() || '.pdf';
    const finalName = safeName.endsWith(extension) ? safeName : `${safeName}${extension}`;
    const destPath = path.join(uploadsDir, `${id}-${finalName}`);
    
    // Use appendFileSync for synchronous, reliable chunk assembly
    for (let i = 0; i < totalChunks; i++) {
      const chunkFilePath = path.join(chunkPath, `chunk-${i}`);
      if (!fs.existsSync(chunkFilePath)) {
        throw new Error(`Chunk ${i} missing`);
      }
      const chunkData = fs.readFileSync(chunkFilePath);
      fs.appendFileSync(destPath, chunkData);
      fs.unlinkSync(chunkFilePath); // Delete chunk after writing
    }
    
    // Clean up chunk directory
    if (fs.existsSync(chunkPath)) {
      fs.rmSync(chunkPath, { recursive: true, force: true });
    }
    
    const newDoc = {
      id,
      name: fileName,
      path: `${id}-${finalName}`,
      size: parseInt(fileSize),
      user_id: userId,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('documents').insert([newDoc]);
      if (error) throw error;
    } else {
      db.documents.push(newDoc);
      saveDB();
    }

    res.json({ id, name: fileName, size: fileSize });
  } catch (err: any) {
    console.error("Upload completion error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/upload", (req, res) => {
  res.json({ message: "Upload endpoint is active. Use POST to upload files." });
});

app.get("/api/test-api", (req, res) => {
  res.json({ message: "API is accessible", time: new Date().toISOString() });
});

// Move upload route higher and ensure it's correctly defined
app.post(["/api/upload", "/api/upload/"], authenticateToken, (req, res, next) => {
  upload.single("pdf")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error("Multer error:", err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: "Arquivo muito grande. O limite é 32MB por upload direto. Use o upload em partes para arquivos maiores." });
      }
      return res.status(400).json({ error: `Erro no upload: ${err.message}` });
    } else if (err) {
      console.error("Unknown upload error:", err);
      return res.status(500).json({ error: "Erro interno no processamento do arquivo" });
    }
    next();
  });
}, async (req: any, res) => {
  console.log(`[${new Date().toISOString()}] POST /api/upload - User: ${req.user ? req.user.email : 'unknown'}`);
  
  try {
    if (!req.file) {
      console.log("Upload failed: No file provided");
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    const filename = req.file.filename;
    const originalname = req.file.originalname;
    const size = req.file.size;
    const userId = req.user.id;

    console.log(`Processing upload: ${originalname} (${size} bytes) for user ${userId}`);

    const id = uuidv4();
    
    const newDoc = {
      id,
      name: originalname,
      path: filename,
      size,
      user_id: userId,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('documents')
        .insert([newDoc]);
      
      if (error) {
        console.error("Supabase insert error:", error);
        throw error;
      }
    } else {
      db.documents.push(newDoc);
      saveDB();
    }

    console.log(`Upload successful: ${id}`);
    res.json({ id, name: originalname, size });
  } catch (err: any) {
    console.error("Upload route error:", err);
    res.status(500).json({ error: err.message || "Erro interno do servidor" });
  }
});

// Auth Routes
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  console.log(`Login attempt for email: ${email}`);
  try {
    let user: any;
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .ilike('email', email)
        .single();
      
      if (error) {
        console.error("Supabase login error:", error);
        return res.status(400).json({ error: "Usuário não encontrado" });
      }
      user = data;
    } else {
      user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
    }

    if (!user) {
      console.log(`User not found: ${email}`);
      return res.status(400).json({ error: "Usuário não encontrado" });
    }

    console.log(`User found: ${user.email}. Comparing passwords...`);
    const validPassword = bcrypt.compareSync(password, user.password);
    
    if (!validPassword) {
      console.log(`Invalid password for user: ${email}`);
      return res.status(400).json({ error: "Senha inválida" });
    }

    console.log(`Login successful for user: ${email}`);
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(`Login error for ${email}:`, err);
    res.status(500).json({ error: "Falha no login" });
  }
});

app.get("/api/auth/me", authenticateToken, async (req: any, res) => {
  try {
    let user: any;
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', req.user.id)
        .single();
      
      if (error) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
      user = data;
    } else {
      user = db.users.find((u: any) => u.id === req.user.id);
    }

    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (err) {
    res.status(500).json({ error: "Falha ao buscar usuário" });
  }
});

// Admin User Management Routes
app.get("/api/admin/users", authenticateToken, isAdmin, async (req, res) => {
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role, created_at');
      
      if (error) throw error;
      return res.json(data);
    } else {
      const users = db.users.map(({ password, ...u }: any) => u);
      res.json(users);
    }
  } catch (err) {
    res.status(500).json({ error: "Falha ao buscar usuários" });
  }
});

app.post("/api/admin/users", authenticateToken, isAdmin, async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const id = uuidv4();
    const newUser = {
      id,
      name,
      email,
      password: hashedPassword,
      role: role || 'user',
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('users')
        .insert([newUser]);
      
      if (error) {
        if (error.code === '23505') return res.status(400).json({ error: "E-mail já existe" });
        throw error;
      }
    } else {
      if (db.users.find((u: any) => u.email === email)) {
        return res.status(400).json({ error: "E-mail já existe" });
      }
      db.users.push(newUser);
      saveDB();
    }

    res.json({ id, name, email, role });
  } catch (err: any) {
    res.status(500).json({ error: "Falha ao criar usuário" });
  }
});

app.put("/api/admin/users/:id", authenticateToken, isAdmin, async (req, res) => {
  const { name, email, password, role } = req.body;
  const { id } = req.params;
  try {
    const updates: any = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (role) updates.role = role;
    if (password) {
      updates.password = bcrypt.hashSync(password, 10);
    }

    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id);
      
      if (error) {
        if (error.code === '23505') return res.status(400).json({ error: "E-mail já existe" });
        throw error;
      }
    } else {
      const userIndex = db.users.findIndex((u: any) => u.id === id);
      if (userIndex === -1) return res.status(404).json({ error: "Usuário não encontrado" });
      
      if (email) {
        const existingUser = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase() && u.id !== id);
        if (existingUser) return res.status(400).json({ error: "E-mail já existe" });
      }

      db.users[userIndex] = { ...db.users[userIndex], ...updates };
      saveDB();
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Falha ao atualizar usuário" });
  }
});

app.delete("/api/admin/users/:id", authenticateToken, isAdmin, async (req: any, res) => {
  const { id } = req.params;
  try {
    // Prevent self-deletion
    if (req.user.id === id) {
      return res.status(400).json({ error: "Você não pode excluir seu próprio usuário." });
    }

    if (isSupabaseConfigured) {
      // Check for last admin
      const { data: admins, error: adminError } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin');
      
      const { data: userToDelete, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', id)
        .single();

      if (userError) return res.status(404).json({ error: "Usuário não encontrado" });
      
      if (userToDelete.role === 'admin' && admins && admins.length <= 1) {
        return res.status(400).json({ error: "Não é possível excluir o último administrador do sistema." });
      }

      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } else {
      const admins = db.users.filter((u: any) => u.role === 'admin');
      const userToDelete = db.users.find((u: any) => u.id === id);

      if (!userToDelete) return res.status(404).json({ error: "Usuário não encontrado" });
      
      if (userToDelete.role === 'admin' && admins.length <= 1) {
        return res.status(400).json({ error: "Não é possível excluir o último administrador do sistema." });
      }

      db.users = db.users.filter((u: any) => u.id !== id);
      saveDB();
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Falha ao excluir usuário" });
  }
});

// Prompts API
app.get("/api/prompts", authenticateToken, async (req, res) => {
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      res.json(data || []);
    } else {
      res.json(db.prompts || []);
    }
  } catch (err) {
    res.status(500).json({ error: "Falha ao buscar prompts" });
  }
});

app.post("/api/prompts", authenticateToken, isAdmin, async (req, res) => {
  const { name, prompt, is_default } = req.body;
  try {
    const id = uuidv4();
    const newPrompt = { 
      id, 
      name, 
      prompt, 
      is_default: !!is_default,
      created_at: new Date().toISOString()
    };
    
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('prompts')
        .insert([newPrompt]);
      
      if (error) throw error;
    } else {
      db.prompts.push(newPrompt);
      saveDB();
    }
    res.json(newPrompt);
  } catch (err) {
    res.status(500).json({ error: "Falha ao criar prompt" });
  }
});

app.put("/api/prompts/:id", authenticateToken, isAdmin, async (req, res) => {
  const { name, prompt, is_default } = req.body;
  const { id } = req.params;
  try {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('prompts')
        .update({ name, prompt, is_default: !!is_default })
        .eq('id', id);
      
      if (error) throw error;
    } else {
      const index = db.prompts.findIndex((p: any) => p.id === id);
      if (index === -1) return res.status(404).json({ error: "Prompt não encontrado" });

      db.prompts[index] = { ...db.prompts[index], name, prompt, is_default: !!is_default };
      saveDB();
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Falha ao atualizar prompt" });
  }
});

app.delete("/api/prompts/:id", authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('prompts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } else {
      db.prompts = db.prompts.filter((p: any) => p.id !== id);
      saveDB();
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Falha ao excluir prompt" });
  }
});

// Document Routes
app.delete(["/api/documents", "/api/documents/"], authenticateToken, isAdmin, async (req, res) => {
  try {
    if (isSupabaseConfigured) {
      const { data: docs, error: fetchError } = await supabase
        .from('documents')
        .select('path');
      
      if (fetchError) throw fetchError;

      if (docs) {
        docs.forEach((doc: any) => {
          const filePath = path.join(uploadsDir, doc.path);
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch (e) {}
          }
        });
      }

      await supabase.from('annotations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('favorites').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('documents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }

    // Always clear local DB as well if it has anything
    if (db.documents && db.documents.length > 0) {
      db.documents.forEach((doc: any) => {
        const filePath = path.join(uploadsDir, doc.path);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {}
        }
      });

      db.documents = [];
      db.annotations = [];
      db.favorites = [];
      saveDB();
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Clear all error:", err);
    res.status(500).json({ error: "Falha ao limpar documentos" });
  }
});

app.delete(["/api/documents/:id", "/api/documents/:id/"], authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';

  try {
    let docPath: string | null = null;
    let foundInSupabase = false;

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('documents')
        .select('path, user_id')
        .eq('id', id)
        .single();
      
      if (!error && data) {
        // Check ownership
        if (!isAdmin && data.user_id !== userId) {
          return res.status(403).json({ error: "Acesso negado" });
        }
        docPath = data.path;
        await supabase.from('documents').delete().eq('id', id);
        foundInSupabase = true;
      }
    }

    if (!foundInSupabase) {
      if (!db.documents) db.documents = [];
      const doc = db.documents.find((d: any) => d.id === id);
      if (!doc) return res.status(404).json({ error: "Documento não encontrado" });
      
      // Check ownership for local DB
      if (!isAdmin && doc.user_id !== userId) {
        return res.status(403).json({ error: "Acesso negado" });
      }
      
      docPath = doc.path;
      db.documents = db.documents.filter((d: any) => d.id !== id);
      db.annotations = db.annotations.filter((a: any) => a.document_id !== id);
      db.favorites = db.favorites.filter((f: any) => f.document_id !== id);
      saveDB();
    }

    // Delete file from local storage
    if (docPath) {
      const filePath = path.join(uploadsDir, docPath);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkErr) {
          console.error(`Failed to delete file ${filePath}:`, unlinkErr);
          // We don't fail the whole request if file deletion fails (e.g. read-only FS)
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: "Falha ao excluir documento" });
  }
});

app.get(["/api/documents", "/api/documents/"], authenticateToken, async (req, res) => {
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      res.json(data || []);
    } else {
      const docs = [...db.documents].sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      res.json(docs);
    }
  } catch (err) {
    res.status(500).json({ error: "Falha ao buscar documentos" });
  }
});

app.get(["/api/documents/:id/pdf", "/api/documents/:id/pdf/"], authenticateToken, async (req: AuthRequest, res) => {
  const { id } = req.params;
  console.log(`[Info] PDF Download Request - ID: ${id}, User: ${req.user?.email || 'unknown'}`);
  
  try {
    let doc: any;
    if (isSupabaseConfigured) {
      console.log(`[Info] Fetching document ${id} from Supabase`);
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .single();
      
      if (!error && data) {
        doc = data;
      } else {
        console.log(`[Info] Document ${id} not found in Supabase, checking local DB`);
        if (!db.documents) db.documents = [];
        doc = db.documents.find((d: any) => d.id === id);
      }
    } else {
      if (!db.documents) db.documents = [];
      doc = db.documents.find((d: any) => d.id === id);
    }

    if (!doc || !doc.path) {
      console.log(`[404] Document metadata or path missing for ID: ${id}`);
      return res.status(404).json({ error: "Metadados do documento ou caminho do arquivo não encontrados" });
    }

    // Ensure uploadsDir is absolute and exists
    const absoluteUploadsDir = path.isAbsolute(uploadsDir) ? uploadsDir : path.resolve(uploadsDir);
    
    console.log(`[Debug] absoluteUploadsDir: ${absoluteUploadsDir}`);
    
    if (!fs.existsSync(absoluteUploadsDir)) {
      console.error(`[Error] Uploads directory missing: ${absoluteUploadsDir}`);
      return res.status(500).json({ 
        error: "Diretório de uploads não encontrado no servidor.",
        path: absoluteUploadsDir
      });
    }

    const fileName = path.basename(doc.path);
    const filePath = path.join(absoluteUploadsDir, fileName);
    
    console.log(`[Info] Serving file: ${fileName} from ${absoluteUploadsDir}`);
    console.log(`[Info] Full path: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      console.error(`[404] File missing on disk: ${filePath} (Doc ID: ${id})`);
      // List files in directory for debugging
      try {
        const files = fs.readdirSync(absoluteUploadsDir);
        console.log(`[Debug] Files in uploads dir (${files.length}): ${files.slice(0, 10).join(', ')}${files.length > 10 ? '...' : ''}`);
      } catch (e) {
        console.error("[Debug] Could not list files in uploads dir", e);
      }
      return res.status(404).json({ 
        error: "O arquivo físico não foi encontrado no servidor. Isso pode ocorrer se o servidor foi reiniciado e o armazenamento é temporário.",
        fileName: fileName,
        dir: absoluteUploadsDir
      });
    }

    // Determine content type based on extension
    const ext = path.extname(fileName).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (['.jpg', '.jpeg'].includes(ext)) contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.txt') contentType = 'text/plain';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.name || 'document' + ext)}"`);
    res.setHeader('Accept-Ranges', 'bytes');
    
    // Use root option for res.sendFile for better security and path handling
    res.sendFile(fileName, { 
      root: absoluteUploadsDir,
      headers: {
        'x-timestamp': String(Date.now()),
        'x-sent': 'true'
      }
    }, (err: any) => {
      if (err) {
        // Check if the error is due to client disconnection or aborted request
        const isClientError = 
          (err.code && ['ECONNRESET', 'EPIPE', 'ECANCELED', 'ECONNABORTED'].includes(err.code)) || 
          (err.message && (
            err.message.toLowerCase().includes('epipe') || 
            err.message.toLowerCase().includes('broken pipe') || 
            err.message.toLowerCase().includes('aborted') ||
            err.message.toLowerCase().includes('connection reset')
          )) ||
          err.name === 'AbortError' ||
          res.destroyed;
                             
        if (isClientError) {
          console.log(`[Info] Client disconnected or aborted during file download (ID: ${id}, Code: ${err.code || 'N/A'}, Message: ${err.message})`);
          return;
        }
        
        console.error(`[Error] res.sendFile failed for ${id} (Headers sent: ${res.headersSent}):`, err);
        if (!res.headersSent && !res.destroyed) {
          res.status(err.status || 500).json({ 
            error: `Erro ao transmitir o arquivo: ${err.message}`,
            details: err.code
          });
        }
      } else {
        console.log(`[Success] File ${id} sent successfully`);
      }
    });
  } catch (err: any) {
    console.error(`[Critical] Download error for ${id}:`, err);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: `Falha interna ao processar download: ${err.message}`,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
  }
});

app.post(["/api/documents/:id/analysis", "/api/documents/:id/analysis/"], authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const { analysis } = req.body;
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('documents')
        .update({ analysis })
        .eq('id', id);
      
      if (error) throw error;
    } else {
      const index = db.documents.findIndex((d: any) => d.id === id);
      if (index === -1) return res.status(404).json({ error: "Documento não encontrado" });

      db.documents[index].analysis = analysis;
      saveDB();
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Save analysis error:", err);
    res.status(500).json({ error: "Falha ao salvar análise" });
  }
});

app.get(["/api/documents/:id/analysis", "/api/documents/:id/analysis/"], authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    let doc: any;
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('documents')
        .select('analysis')
        .eq('id', id)
        .single();
      
      if (error) return res.status(404).json({ error: "Documento não encontrado" });
      doc = data;
    } else {
      doc = db.documents.find((d: any) => d.id === id);
    }

    if (!doc) return res.status(404).json({ error: "Documento não encontrado" });
    res.json(doc.analysis || null);
  } catch (err) {
    console.error("Get analysis error:", err);
    res.status(500).json({ error: "Falha ao buscar análise" });
  }
});

// Annotations
app.get(["/api/documents/:id/annotations", "/api/documents/:id/annotations/"], authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('annotations')
        .select('*')
        .eq('document_id', id);
      
      if (error) throw error;
      res.json(data || []);
    } else {
      const annotations = db.annotations.filter((a: any) => a.document_id === id);
      res.json(annotations);
    }
  } catch (err) {
    res.status(500).json({ error: "Falha ao buscar anotações" });
  }
});

app.delete(["/api/documents/:id/annotations", "/api/documents/:id/annotations/"], authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    if (isSupabaseConfigured) {
      await supabase
        .from('annotations')
        .delete()
        .eq('document_id', id);
    }
    
    // Always clear local DB as well
    db.annotations = db.annotations.filter((a: any) => a.document_id !== id);
    saveDB();
    
    res.json({ success: true });
  } catch (err) {
    console.error("Clear annotations error:", err);
    res.status(500).json({ error: "Falha ao limpar anotações" });
  }
});

app.post(["/api/documents/:id/annotations", "/api/documents/:id/annotations/"], authenticateToken, async (req, res) => {
  const { id } = req.params;
  const annotation = req.body;
  try {
    const newAnnotation = {
      ...annotation,
      id: uuidv4(),
      document_id: id,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('annotations')
        .insert([newAnnotation]);
      
      if (error) throw error;
    } else {
      db.annotations.push(newAnnotation);
      saveDB();
    }
    res.json(newAnnotation);
  } catch (err) {
    console.error("Save annotation error:", err);
    res.status(500).json({ error: "Falha ao salvar anotação" });
  }
});

app.put(["/api/documents/:id/annotations", "/api/documents/:id/annotations/"], authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { annotations } = req.body;
  try {
    if (isSupabaseConfigured) {
      // Delete existing annotations for this document
      const { error: deleteError } = await supabase
        .from('annotations')
        .delete()
        .eq('document_id', id);
      
      if (deleteError) throw deleteError;

      // Insert new annotations
      if (annotations && annotations.length > 0) {
        const annotationsToInsert = annotations.map((a: any) => ({
          ...a,
          id: a.id || uuidv4(),
          document_id: id,
          created_at: a.created_at || new Date().toISOString()
        }));

        const { error: insertError } = await supabase
          .from('annotations')
          .insert(annotationsToInsert);
        
        if (insertError) throw insertError;
      }
    } else {
      // Filter out existing annotations for this document
      db.annotations = db.annotations.filter((a: any) => a.document_id !== id);
      
      // Add new annotations
      if (annotations && annotations.length > 0) {
        const annotationsToAdd = annotations.map((a: any) => ({
          ...a,
          id: a.id || uuidv4(),
          document_id: id,
          created_at: a.created_at || new Date().toISOString()
        }));
        db.annotations.push(...annotationsToAdd);
      }
      saveDB();
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Update annotations error:", err);
    res.status(500).json({ error: "Falha ao atualizar anotações" });
  }
});

app.delete(["/api/documents/:id/annotations/:annotationId", "/api/documents/:id/annotations/:annotationId/"], authenticateToken, async (req, res) => {
  const { annotationId } = req.params;
  try {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('annotations')
        .delete()
        .eq('id', annotationId);
      
      if (error) throw error;
    } else {
      db.annotations = db.annotations.filter((a: any) => a.id !== annotationId);
      saveDB();
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Delete annotation error:", err);
    res.status(500).json({ error: "Falha ao excluir anotação" });
  }
});

// Favorites
app.get(["/api/documents/:id/favorites", "/api/documents/:id/favorites/"], authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('document_id', id);
      
      if (error) throw error;
      res.json(data || []);
    } else {
      const favorites = db.favorites.filter((f: any) => f.document_id === id);
      res.json(favorites);
    }
  } catch (err) {
    res.status(500).json({ error: "Falha ao buscar favoritos" });
  }
});

app.post(["/api/documents/:id/favorites", "/api/documents/:id/favorites/"], authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const { page_number, label } = req.body;
  const userId = req.user.id;
  try {
    const newFavorite = {
      id: uuidv4(),
      document_id: id,
      user_id: userId,
      page_number,
      label,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('favorites')
        .insert([newFavorite]);
      
      if (error) throw error;
    } else {
      db.favorites.push(newFavorite);
      saveDB();
    }
    res.json(newFavorite);
  } catch (err) {
    console.error("Save favorite error:", err);
    res.status(500).json({ error: "Falha ao salvar favorito" });
  }
});

app.delete(["/api/documents/:id/favorites/:favoriteId", "/api/documents/:id/favorites/:favoriteId/"], authenticateToken, async (req, res) => {
  const { favoriteId } = req.params;
  try {
    if (isSupabaseConfigured) {
      await supabase
        .from('favorites')
        .delete()
        .eq('id', favoriteId);
    }
    
    // Always clear local DB as well
    db.favorites = db.favorites.filter((f: any) => f.id !== favoriteId);
    saveDB();
    
    res.json({ success: true });
  } catch (err) {
    console.error("Delete favorite error:", err);
    res.status(500).json({ error: "Falha ao excluir favorito" });
  }
});

// 404 for API routes - ensure this is the LAST API route
app.all("/api/*", (req, res) => {
  const logMsg = `API 404: ${req.method} ${req.url} - IP: ${req.ip}`;
  console.log(logMsg);
  res.status(404).json({ 
    error: "Rota da API não encontrada",
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  
  // If it's an API route, always return JSON
  const isApi = req.url.startsWith('/api/') || req.originalUrl.startsWith('/api/') || req.path.startsWith('/api/');
  if (isApi) {
    return res.status(err.status || 500).json({ 
      error: "Internal server error", 
      message: err.message || "Ocorreu um erro interno no servidor"
    });
  }
  
  // For other routes, let it fall through or send a simple error
  res.status(err.status || 500).send(err.message || "Internal server error");
});

async function startServer() {
  try {
    if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      // In production (Cloud Run or Vercel), dist is at the workspace root
      const distPath = path.join(process.cwd(), "dist");
      
      console.log(`Checking for frontend build at: ${distPath}`);

      if (fs.existsSync(distPath)) {
        console.log(`Frontend build found at ${distPath}`);
        // Serve static assets with high cache lifetime for fingerprinted files
        app.use(express.static(distPath, {
          maxAge: '7d',
          index: false 
        }));
        
        app.get("*", (req, res) => {
          res.sendFile(path.join(distPath, "index.html"), {
            maxAge: '0' // Do not cache index.html to ensure users get updates
          });
        });
      } else {
        console.error(`CRITICAL: Frontend build NOT found at ${distPath}`);
        // Check if index.html exists in root as fallback (development artifact)
        if (fs.existsSync(path.join(process.cwd(), "index.html"))) {
          console.log("Found index.html in root, possibly development mode without vite middleware");
        }
        app.get("*", (req, res) => {
          res.status(404).send(`Frontend build not found at ${distPath}. Please ensure 'npm run build' was successful.`);
        });
      }
    }

    if (!process.env.VERCEL) {
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    }
  } catch (err) {
    console.error("Failed to start server:", err);
  }
}

startServer().catch(err => {
  console.error("CRITICAL: Failed to start server:", err);
  process.exit(1);
});

export default app;
