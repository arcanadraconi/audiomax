import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import PlayHT from 'playht';
import { splitTextIntoChunks } from './utils.js';
import fetch from 'node-fetch';

const app = express();
const port = process.env.PORT || 3001;

// Initialize PlayHT with credentials
const apiKey = process.env.PLAYHT_SECRET_KEY;
const userId = process.env.PLAYHT_USER_ID;

console.log('Initializing PlayHT with:', {
  apiKey: apiKey ? `${apiKey.substring(0, 10)}...` : 'missing',
  userId: userId ? `${userId.substring(0, 4)}...` : 'missing'
});

PlayHT.init({
  apiKey: apiKey,
  userId: userId,
  defaultVoiceEngine: 'Play3.0-mini'
});

// Test voices for Play3.0-mini
const testVoices = [
  {
    id: 'nova',
    name: 'Nova',
    voiceEngine: 'Play3.0-mini',
    gender: 'female',
    age: 'young adult',
    accent: 'american',
    language: 'English',
    language_code: 'en-US',
    style: 'natural',
    tempo: 'medium',
    texture: 'clear'
  },
  {
    id: 'stella',
    name: 'Stella',
    voiceEngine: 'Play3.0-mini',
    gender: 'female',
    age: 'young adult',
    accent: 'british',
    language: 'English',
    language_code: 'en-GB',
    style: 'natural',
    tempo: 'medium',
    texture: 'clear'
  }
];

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-production-domain.com'] 
    : ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-ID'],
  credentials: true
};

// Apply CORS middleware
app.use(cors(corsOptions));
app.use(express.json());

// Pre-flight requests
app.options('*', cors(corsOptions));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// WebSocket auth endpoint
app.post('/api/websocket-auth', async (req, res) => {
  try {
    if (!apiKey || !userId) {
      throw new Error('Missing API credentials');
    }

    console.log('Getting WebSocket auth token...');
    const response = await fetch('https://api.play.ht/api/v3/websocket-auth', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-User-ID': userId,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PlayHT WebSocket auth failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`WebSocket auth failed: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('WebSocket auth successful');
    res.json(data);
  } catch (error) {
    console.error('WebSocket auth error:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data || error.stack
    });
  }
});

// Get available voices
app.get('/api/voices', async (req, res) => {
  try {
    console.log('Fetching voices...');
    const allVoices = await PlayHT.listVoices();
    console.log(`Fetched ${allVoices.length} total voices`);

    // Log unique voice engines
    const uniqueEngines = new Set(allVoices.map(v => v.voiceEngine));
    console.log('Available voice engines:', Array.from(uniqueEngines));

    // Map voices to a consistent format and include test voices
    const voices = [
      ...testVoices,
      ...allVoices.map(voice => ({
        id: voice.id,
        name: voice.name,
        sample: voice.previewUrl || voice.sample,
        accent: voice.accent || '',
        age: voice.age || '',
        gender: voice.gender || '',
        language: voice.language || '',
        language_code: voice.languageCode || '',
        loudness: voice.loudness || '',
        style: voice.style || '',
        tempo: voice.tempo || '',
        texture: voice.texture || '',
        is_cloned: voice.isCloned || false,
        voiceEngine: voice.voiceEngine || 'PlayHT2.0'
      }))
    ];

    console.log(`Mapped ${voices.length} voices (including ${testVoices.length} test voices)`);
    res.json({ voices });
  } catch (error) {
    console.error('Error fetching voices:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data || error.stack
    });
  }
});

// Clone voice
app.post('/api/clone', async (req, res) => {
  try {
    const { name, files } = req.body;

    if (!name || !files) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    console.log('Cloning voice:', { name });
    const response = await PlayHT.cloneVoice({ name, files });
    console.log('Voice cloned:', response);
    res.json(response);
  } catch (error) {
    console.error('Error cloning voice:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data || error.stack
    });
  }
});

// Get cloned voices
app.get('/api/cloned-voices', async (req, res) => {
  try {
    console.log('Fetching cloned voices...');
    const voices = await PlayHT.listClonedVoices();
    console.log(`Fetched ${voices.length} cloned voices`);
    res.json({ voices });
  } catch (error) {
    console.error('Error fetching cloned voices:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data || error.stack
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: err.message,
    details: err.stack
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`CORS enabled for:`, corsOptions.origin);
});
