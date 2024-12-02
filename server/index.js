import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import PlayHT from 'playht';
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

// Initialize PlayHT only for voice listing
PlayHT.init({
  apiKey: apiKey,
  userId: userId
});

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
    console.log('Fetching voices from PlayHT...');
    const allVoices = await PlayHT.listVoices();
    console.log(`Fetched ${allVoices.length} voices from PlayHT`);

    // Map voices to a consistent format with full voice ID path
    const voices = allVoices.map(voice => {
      // Keep original voice ID if it's already in s3:// format
      const voiceId = voice.id.includes('s3://')
        ? voice.id
        : `s3://voice-cloning-zero-shot/${voice.id}/${voice.name.toLowerCase().replace(/[^a-z0-9]/g, '')}saad/manifest.json`;

      // Log voice details for debugging
      console.log('Processing voice:', {
        name: voice.name,
        originalId: voice.id,
        mappedId: voiceId
      });

      return {
        id: voiceId,
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
        is_cloned: voice.isCloned || false
      };
    });

    console.log(`Mapped ${voices.length} voices`);
    // Log a few examples to verify the format
    if (voices.length > 0) {
      console.log('Example voice IDs:');
      voices.slice(0, 3).forEach(voice => {
        console.log(`- ${voice.name}: ${voice.id}`);
      });
    }

    res.json({ voices });
  } catch (error) {
    console.error('Error fetching voices:', error);
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

    // Map cloned voices to include full voice ID path
    const mappedVoices = voices.map(voice => ({
      ...voice,
      id: voice.id.includes('s3://')
        ? voice.id
        : `s3://voice-cloning-zero-shot/${voice.id}/${voice.name.toLowerCase().replace(/[^a-z0-9]/g, '')}saad/manifest.json`
    }));

    res.json({ voices: mappedVoices });
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
