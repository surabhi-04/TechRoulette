import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sqlite3 from 'sqlite3';
import fs from 'fs';
import { GoogleGenAI, Type } from "@google/genai";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { handleTopicSpin } from './services/spinService.js';

const verboseSqlite = sqlite3.verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'techroulette-jwt-super-secret-key-12345';

// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(cors());

// Database Setup
const db = new verboseSqlite.Database(path.join(__dirname, 'techroulette.db'), (err) => {
    if (err) {
        console.error('Error opening SQLite database:', err);
    } else {
        console.log('Connected to SQLite database "techroulette.db".');
        initializeDatabase();
    }
});

const apiKey = process.env.GEMINI_API_KEY;
const isKeyConfigured = apiKey && apiKey !== 'your_gemini_api_key_here';
const ai = isKeyConfigured ? new GoogleGenAI({ apiKey }) : null;

const localTopics = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'cs_interview_topics_500.json'), 'utf8')
);

// Convert sqlite3 callbacks to Promises for async/await usage
function dbRun(query, params = []) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function dbGet(query, params = []) {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function dbAll(query, params = []) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

async function initializeDatabase() {
    try {
        await dbRun(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                preferred_language TEXT DEFAULT 'Java',
                current_streak INTEGER DEFAULT 0,
                last_practice_date TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Migrate column last_practice_date if it doesn't exist in older DBs
        try {
            await dbRun("ALTER TABLE users ADD COLUMN last_practice_date TEXT DEFAULT NULL");
        } catch (e) {
            // Already exists or table is new
        }

        // Copy any existing data from last_active_date to last_practice_date
        try {
            await dbRun("UPDATE users SET last_practice_date = last_active_date WHERE last_practice_date IS NULL AND last_active_date IS NOT NULL");
        } catch (e) {
            // Column last_active_date might not exist in new setups
        }
        
        await dbRun(`
            CREATE TABLE IF NOT EXISTS practice_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                topic_id TEXT NOT NULL,
                topic_title TEXT NOT NULL,
                domain TEXT NOT NULL,
                duration_seconds INTEGER NOT NULL,
                completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('Database tables initialized successfully.');
    } catch (err) {
        console.error('Error initializing database tables:', err);
    }
}

// Authentication Middleware
async function authenticateToken(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await dbGet('SELECT id, username, email, preferred_language, current_streak, last_practice_date FROM users WHERE id = ?', [decoded.userId]);
        if (!user) {
            return res.status(401).json({ error: 'User session invalid. Please sign in again.' });
        }

        // Real-time streak evaluation (auto-resetting on missed days)
        if (user.current_streak > 0) {
            const today = new Date().toISOString().split('T')[0];
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            const lastPractice = user.last_practice_date;
            
            if (!lastPractice || lastPractice < yesterday) {
                user.current_streak = 0;
                await dbRun('UPDATE users SET current_streak = 0 WHERE id = ?', [user.id]);
            }
        }

        req.user = user;
        next();
    } catch (err) {
        res.clearCookie('token');
        return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    }
}

// Security & Form Validation Helpers
function validateEmail(email) {
    const re = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
    return re.test(email);
}

function validateUsername(username) {
    // 3-20 characters, alphanumeric and underscores, must start with a lowercase letter
    const re = /^[a-z][a-z0-9_]{2,19}$/;
    return re.test(username);
}

function validatePassword(password) {
    // Minimum 8 characters, at least one uppercase, one lowercase, one digit, and one special symbol (@$!%*?&#)
    if (password.length < 8) return false;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[@$!%*?&#]/.test(password);
    return hasUpper && hasLower && hasDigit && hasSpecial;
}

// --- API Endpoints ---

// Register User
app.post('/api/auth/register', async (req, res) => {
    let { username, email, password, confirmPassword, preferredLanguage } = req.body;
    
    if (!username || !email || !password || !confirmPassword) {
        return res.status(400).json({ error: 'All fields are required.' });
    }
    
    // Auto-convert email to lowercase before processing
    email = email.toLowerCase().trim();
    username = username.trim();
    
    // Validations
    if (!validateUsername(username)) {
        return res.status(400).json({ error: 'Username must be 3-20 characters, alphanumeric/underscores only, and start with a lowercase letter.' });
    }
    
    if (!validateEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format.' });
    }
    
    if (!validatePassword(password)) {
        return res.status(400).json({ error: 'Password must be at least 8 characters and include at least one uppercase letter, one lowercase letter, one digit, and one special symbol (@$!%*?&#).' });
    }
    
    if (password !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match.' });
    }
    
    const validLanguages = ['Java', 'Python', 'C++', 'C', 'JavaScript'];
    if (preferredLanguage && !validLanguages.includes(preferredLanguage)) {
        return res.status(400).json({ error: 'Invalid primary language selection.' });
    }
    
    const lang = preferredLanguage || 'Java';
    
    try {
        // Check if username already exists
        const existingUsername = await dbGet('SELECT id FROM users WHERE username = ?', [username]);
        if (existingUsername) {
            return res.status(400).json({ error: 'Username is already taken.' });
        }
        
        // Check if email already exists
        const existingEmail = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
        if (existingEmail) {
            return res.status(400).json({ error: 'Email is already registered.' });
        }
        
        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        const userId = crypto.randomUUID();
        
        // Save user
        await dbRun(
            'INSERT INTO users (id, username, email, password_hash, preferred_language) VALUES (?, ?, ?, ?, ?)',
            [userId, username, email, passwordHash, lang]
        );
        
        // Issue token
        const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1d' });
        
        // Set token cookie (Lax, HttpOnly)
        res.cookie('token', token, {
            httpOnly: true,
            secure: false, // Set to true if using HTTPS in prod
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });
        
        return res.status(201).json({
            id: userId,
            username,
            email,
            preferred_language: lang,
            current_streak: 0,
            last_practice_date: null
        });
    } catch (err) {
        console.error('Registration error:', err);
        return res.status(500).json({ error: 'An internal server error occurred.' });
    }
});

// Login User
app.post('/api/auth/login', async (req, res) => {
    let { loginId, password, rememberMe } = req.body;
    
    if (!loginId || !password) {
        return res.status(400).json({ error: 'Username/Email and password are required.' });
    }
    
    loginId = loginId.trim();
    
    try {
        // Search by username or email
        const user = await dbGet(
            'SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)',
            [loginId, loginId]
        );
        
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: 'Invalid username/email or password.' });
        }
        
        // Issue token
        const expiry = rememberMe ? '30d' : '1d';
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: expiry });
        
        // Set cookie maxAge
        const cookieMaxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
        
        res.cookie('token', token, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: cookieMaxAge
        });
        
        return res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            preferred_language: user.preferred_language,
            current_streak: user.current_streak,
            last_practice_date: user.last_practice_date
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'An internal server error occurred.' });
    }
});

// Logout User
app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        sameSite: 'lax'
    });
    return res.json({ success: true, message: 'Logged out successfully.' });
});

// Get Current User (Session verification)
app.get('/api/auth/me', authenticateToken, (req, res) => {
    return res.json(req.user);
});

// Fetch user practice session logs
app.get('/api/practice/sessions', authenticateToken, async (req, res) => {
    try {
        const sessions = await dbAll(
            'SELECT id, topic_id, topic_title, domain, duration_seconds, completed_at FROM practice_sessions WHERE user_id = ? ORDER BY completed_at DESC',
            [req.user.id]
        );
        return res.json(sessions);
    } catch (err) {
        console.error('Error fetching practice sessions:', err);
        return res.status(500).json({ error: 'Failed to retrieve practice history.' });
    }
});

// Spin a new topic (uses hybrid AI generation or local fallback)
app.get('/api/practice/spin', async (req, res) => {
  const language = req.query.language || 'Java';
  const shouldTryAI = Math.random() < 0.5; // 50% chance for AI generation

  if (shouldTryAI && ai) {
    try {
      console.log(`[AI Triggered] Generating dynamic topic for ${language} using Gemini...`);
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Generate a realistic, impromptu technical interview prompt for a software engineer.
Target Language: ${language}
Include core CS concepts, real-world architecture trade-offs, or production debugging scenarios.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              domain: { type: Type.STRING },
              prompt_guide: { type: Type.STRING },
              key_research_points: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["id", "title", "domain", "prompt_guide", "key_research_points"]
          }
        }
      });

      const topic = JSON.parse(response.text);
      return res.json({
        ...topic,
        isAI: true
      });
    } catch (err) {
      console.error("Gemini Generation Error:", err.message);
      // Fallback to local JSON below
    }
  }

  // Local JSON Fallback
  console.log(`[Local Fallback] Fetching topic from cs_interview_topics_500.json...`);
  const eligible = localTopics.topics.filter(t => 
    t.applicable_languages.includes("All") || t.applicable_languages.includes(language)
  );
  const randomTopic = eligible[Math.floor(Math.random() * eligible.length)];
  return res.json({
    ...randomTopic,
    isAI: false
  });
});

// Record a practice session and update streak
app.post('/api/practice/session', authenticateToken, async (req, res) => {
    const { topicId, topicTitle, domain, durationSeconds, clientLocalDate } = req.body;
    
    if (!topicId || !topicTitle || !domain || durationSeconds === undefined || !clientLocalDate) {
        return res.status(400).json({ error: 'Missing session parameters.' });
    }
    
    try {
        // Generate UUID for practice session
        const sessionId = crypto.randomUUID();
        
        // Save session
        await dbRun(
            'INSERT INTO practice_sessions (id, user_id, topic_id, topic_title, domain, duration_seconds) VALUES (?, ?, ?, ?, ?, ?)',
            [sessionId, req.user.id, topicId, topicTitle, domain, durationSeconds]
        );
        
        // Calculate new streak relative to clientLocalDate (today)
        const clientDate = new Date(clientLocalDate + 'T00:00:00');
        const yesterdayDate = new Date(clientDate.getTime() - 86400000);
        const y_year = yesterdayDate.getFullYear();
        const y_month = String(yesterdayDate.getMonth() + 1).padStart(2, '0');
        const y_day = String(yesterdayDate.getDate()).padStart(2, '0');
        const yesterday = `${y_year}-${y_month}-${y_day}`;
        
        let newStreak = req.user.current_streak;
        const lastPractice = req.user.last_practice_date;
        
        if (lastPractice === clientLocalDate) {
            // Do not increment again (streak already credited for today)
        } else if (lastPractice === yesterday && newStreak > 0) {
            newStreak += 1;
        } else {
            // If newStreak === 0 or post-reset or lastPractice < yesterday, set to 1
            newStreak = 1;
        }
        
        // Update user record
        await dbRun(
            'UPDATE users SET current_streak = ?, last_practice_date = ? WHERE id = ?',
            [newStreak, clientLocalDate, req.user.id]
        );
        
        return res.status(201).json({
            success: true,
            current_streak: newStreak,
            last_practice_date: clientLocalDate
        });
    } catch (err) {
        console.error('Error saving practice session:', err);
        return res.status(500).json({ error: 'Failed to record practice session.' });
    }
});

// Reset streak immediately
app.post('/api/user/streak/reset', authenticateToken, async (req, res) => {
    try {
        await dbRun('UPDATE users SET current_streak = 0 WHERE id = ?', [req.user.id]);
        return res.json({ success: true, current_streak: 0 });
    } catch (err) {
        console.error('Error resetting streak:', err);
        return res.status(500).json({ error: 'Failed to reset streak.' });
    }
});

// Clear all practice history (Danger Zone)
app.delete('/api/practice/sessions', authenticateToken, async (req, res) => {
    try {
        await dbRun('DELETE FROM practice_sessions WHERE user_id = ?', [req.user.id]);
        await dbRun('UPDATE users SET current_streak = 0, last_practice_date = NULL WHERE id = ?', [req.user.id]);
        return res.json({ success: true, message: 'All practice sessions cleared.' });
    } catch (err) {
        console.error('Error clearing sessions:', err);
        return res.status(500).json({ error: 'Failed to clear practice sessions.' });
    }
});

// Update preferred target language
app.put('/api/user/language', authenticateToken, async (req, res) => {
    const { language } = req.body;
    const validLanguages = ['Java', 'Python', 'C++', 'C', 'JavaScript'];
    if (!language || !validLanguages.includes(language)) {
        return res.status(400).json({ error: 'Invalid language selection.' });
    }
    
    try {
        await dbRun('UPDATE users SET preferred_language = ? WHERE id = ?', [language, req.user.id]);
        return res.json({ success: true, preferred_language: language });
    } catch (err) {
        console.error('Error updating language:', err);
        return res.status(500).json({ error: 'Failed to update preferred language.' });
    }
});

// Serve Static Frontend Assets
app.use(express.static(path.join(__dirname)));

// Fallback to index.html for UI client router
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here' ? "✅ Gemini API Key Loaded" : "⚠️ No GEMINI_API_KEY found in .env, defaulting to local JSON");
});
