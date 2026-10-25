import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { aiService } from '../services/aiService.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '../../.env');
const uploadsDir = path.join(__dirname, '../uploads');

// GET configuration status
router.get('/status', (req, res) => {
  const aiStatus = aiService.getStatus();

  // Check storage directory health
  let storageWritable = false;
  try {
    const testFile = path.join(uploadsDir, '.write-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    storageWritable = true;
  } catch (e) {
    storageWritable = false;
  }

  res.json({
    success: true,
    system: {
      name: 'DraftMate Evidence Intelligence',
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      timestamp: new Date().toISOString()
    },
    aiIntegration: aiStatus,
    storage: {
      uploadDirectory: 'server/uploads',
      isWritable: storageWritable,
      maxUploadSizeMb: 25
    },
    jurisdictionsSupported: [
      'Supreme Court of India (New Delhi)',
      'High Court of Delhi (Commercial Division)',
      'High Court of Judicature at Bombay',
      'High Court of Karnataka (Commercial Courts)',
      'High Court of Judicature at Madras',
      'National Company Law Tribunal (NCLT / NCLAT)',
      'Arbitral Tribunals (Domestic & International under 1996 Act)'
    ]
  });
});

// POST update and test Gemini API key in runtime (requires authentication)
router.post('/update-key', authenticateUser, async (req, res) => {
  const { apiKey } = req.body;

  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 15) {
    return res.status(400).json({
      success: false,
      error: 'Invalid API Key length. A valid Google Gemini API key is typically ~39 characters long (starts with AIzaSy...).'
    });
  }

  const cleanKey = apiKey.trim();

  // Test the key against Gemini 2.0
  try {
    const testClient = new GoogleGenAI({ apiKey: cleanKey });
    const testResponse = await testClient.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: 'Ping test'
    });

    if (!testResponse) {
      throw new Error('No response returned from Gemini endpoint.');
    }
  } catch (apiErr) {
    console.warn('Gemini test verification warning:', apiErr.message);
    return res.status(400).json({
      success: false,
      error: `Gemini verification failed: ${apiErr.message}. Please check your API key at https://aistudio.google.com/`
    });
  }

  process.env.GEMINI_API_KEY = cleanKey;

  // Persist into root .env file safely
  try {
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
      if (envContent.includes('GEMINI_API_KEY=')) {
        envContent = envContent.replace(/GEMINI_API_KEY=.*(\r?\n|$)/g, `GEMINI_API_KEY=${cleanKey}\n`);
      } else {
        envContent += `\nGEMINI_API_KEY=${cleanKey}\n`;
      }
    } else {
      envContent = `PORT=5001\nGEMINI_API_KEY=${cleanKey}\n`;
    }
    fs.writeFileSync(envPath, envContent);
  } catch (err) {
    console.warn('Could not persist key to .env, kept in process memory:', err.message);
  }

  res.json({
    success: true,
    message: 'Google Gemini 2.0 Flash API Key tested and verified successfully!',
    status: aiService.getStatus()
  });
});

export default router;
