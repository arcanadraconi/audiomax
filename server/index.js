import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;
const isDev = process.env.NODE_ENV === 'development';

// Initialize credentials
const apiKey = process.env.PLAYHT_SECRET_KEY;
const userId = process.env.PLAYHT_USER_ID;

console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: port,
  PLAYHT_SECRET_KEY: apiKey ? `${apiKey.substring(0, 10)}...` : 'missing',
  PLAYHT_USER_ID: userId ? `${userId.substring(0, 4)}...` : 'missing'
});

// CORS configuration
const corsOptions = {
  origin: function(origin, callback) {
    console.log('Request origin:', origin);
    
    // Allow requests with no origin (like mobile apps, curl requests, or same-origin requests)
    if (!origin) {
      console.log('No origin, allowing request');
      return callback(null, true);
    }
    
    // List of allowed origins
    const allowedOrigins = [
      // Local development
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:5175',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      // Production domains
      'https://audiomax-jo3yc.ondigitalocean.app',
      'https://audiomax.ai'
    ];
    
    // In development mode, allow all origins
    if (isDev) {
      console.log('Development mode, allowing all origins');
      callback(null, true);
      return;
    }

    // In production, check against allowed origins
    if (allowedOrigins.includes(origin)) {
      console.log('Origin allowed:', origin);
      callback(null, true);
    } else {
      console.log('Origin not allowed:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
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

      // Check for specific error types
      if (errorText.includes('LEASE_NOT_ENOUGH_CREDITS')) {
        return res.status(402).json({
          error: 'Insufficient credits',
          message: 'Your PlayHT account has run out of credits. Please add more credits to continue generating audio.',
          details: errorText
        });
      }

      throw new Error(`WebSocket auth failed: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('WebSocket auth response:', data);

    // Ensure we have a valid WebSocket URL
    if (!data.websocket_url) {
      throw new Error('No WebSocket URL received from PlayHT');
    }

    // The websocket_url from the API is already in the correct format
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
    if (!apiKey || !userId) {
      throw new Error('Missing API credentials');
    }

    console.log('Fetching voices from PlayHT API...');
    console.log('Using credentials:', {
      apiKey: apiKey ? `${apiKey.substring(0, 10)}...` : 'missing',
      userId: userId ? `${userId.substring(0, 4)}...` : 'missing'
    });

    const response = await fetch('https://api.play.ht/api/v2/voices', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-User-ID': userId,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PlayHT API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Failed to fetch voices: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Raw PlayHT response:', data);
    
    // Handle both array and object response formats
    const voiceArray = Array.isArray(data) ? data : (data.voices || []);
    
    // Map the voices to match our client's expected format
    const voices = voiceArray.map(voice => ({
      id: voice.id,
      name: voice.name,
      sample: voice.preview_url || voice.sample_url,
      accent: voice.accent || '',
      age: voice.age || '',
      gender: voice.gender || '',
      language: voice.language || '',
      language_code: voice.language_code || '',
      loudness: voice.loudness || '',
      style: voice.style || '',
      tempo: voice.tempo || '',
      texture: voice.texture || '',
      is_cloned: voice.is_cloned || false,
      voiceEngine: voice.is_cloned ? 'PlayHT2.0' : 'Play3.0-mini'
    }));

    // Log voice languages for debugging
    const languages = [...new Set(voices.map(v => v.language))].sort();
    console.log('Available languages:', languages);

    console.log(`Processed ${voices.length} voices`);
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
    if (!apiKey || !userId) {
      throw new Error('Missing API credentials');
    }

    console.log('Fetching cloned voices from PlayHT API...');
    const response = await fetch('https://api.play.ht/api/v2/cloned-voices', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-User-ID': userId,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PlayHT API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Failed to fetch cloned voices: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    // Handle both array and object response formats
    const voiceArray = Array.isArray(data) ? data : (data.voices || []);
    
    // Map the voices to match our client's expected format
    // Include user_id from the API response
    const voices = voiceArray.map(voice => ({
      id: voice.id,
      name: voice.name,
      sample: voice.preview_url || voice.sample_url,
      accent: voice.accent || '',
      age: voice.age || '',
      gender: voice.gender || '',
      language: voice.language || '',
      language_code: voice.language_code || '',
      loudness: voice.loudness || '',
      style: voice.style || '',
      tempo: voice.tempo || '',
      texture: voice.texture || '',
      is_cloned: true,
      voiceEngine: 'PlayHT2.0',
      user_id: voice.user_id || voice.userId || userId // Include user_id from response or fallback to current user
    }));

    console.log(`Processed ${voices.length} cloned voices`);
    res.json({ voices });
  } catch (error) {
    console.error('Error fetching cloned voices:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data || error.stack
    });
  }
});

// In development, proxy non-API requests to Vite dev server
if (isDev) {
  const { createProxyMiddleware } = await import('http-proxy-middleware');
  app.use('/', (req, res, next) => {
    // Skip proxy for API routes
    if (req.url.startsWith('/api/')) {
      next();
      return;
    }
    createProxyMiddleware({
      target: 'http://localhost:5173',
      changeOrigin: true,
      ws: true
    })(req, res, next);
  });
} else {
  // In production, serve static files from the dist directory
  app.use(express.static(path.join(__dirname, '../dist')));
}

// Serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
  if (isDev) {
    // Skip for API routes
    if (req.url.startsWith('/api/')) {
      next();
      return;
    }
    // In development, proxy to Vite dev server
    res.redirect('http://localhost:5173' + req.url);
  } else {
    // In production, serve the built index.html
    res.sendFile(path.join(__dirname, '../dist/index.html'));
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
  console.log('CORS configuration:', {
    development: isDev ? 'All origins allowed' : 'Specific origins only',
    allowedOrigins: corsOptions.origin
  });
});
