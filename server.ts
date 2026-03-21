import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RAWG_API_KEY = process.env.RAWG_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY! });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get('/api/config', (req, res) => {
    res.json({
      hasRawgKey: !!process.env.RAWG_API_KEY,
      hasGeminiKey: !!process.env.GEMINI_API_KEY
    });
  });

  // API Routes
  app.get('/api/games/popular', async (req, res) => {
    if (!RAWG_API_KEY) {
      return res.status(500).json({ error: 'RAWG_API_KEY not configured' });
    }
    try {
      const response = await fetch(`https://api.rawg.io/api/games?key=${RAWG_API_KEY}&page_size=4&ordering=-added`);
      const data = await response.json();
      res.json(data.results || []);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch popular games' });
    }
  });

  app.get('/api/games/search', async (req, res) => {
    const { q } = req.query;
    if (!RAWG_API_KEY) {
      return res.status(500).json({ error: 'RAWG_API_KEY not configured' });
    }
    try {
      const response = await fetch(`https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${q}&page_size=10`);
      const data = await response.json();
      res.json(data.results || []);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch games' });
    }
  });

  app.get('/api/games/:id', async (req, res) => {
    const { id } = req.params;
    if (!RAWG_API_KEY) {
      return res.status(500).json({ error: 'RAWG_API_KEY not configured' });
    }
    try {
      const response = await fetch(`https://api.rawg.io/api/games/${id}?key=${RAWG_API_KEY}`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch game details' });
    }
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
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
