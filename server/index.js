require('dotenv').config();
const express = require('express');
const cors = require('cors');
const PlayHT = require('playht');
const { splitTextIntoChunks } = require('./utils');

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
  defaultVoiceEngine: 'PlayHT2.0'
});

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-production-domain.com'] 
    : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
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

    // Map voices to a consistent format
    const voices = allVoices.map(voice => ({
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
    }));

    // Filter for PlayHT2.0 voices
    const compatibleVoices = voices.filter(voice => 
      voice.voiceEngine === 'PlayHT2.0' || 
      voice.voiceEngine === 'PlayHT2.0-turbo'
    );

    console.log(`Mapped ${voices.length} total voices, ${compatibleVoices.length} are PlayHT2.0 compatible`);
    res.json({ voices: compatibleVoices });
  } catch (error) {
    console.error('Error fetching voices:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate speech
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice, quality = 'premium', speed = 1 } = req.body;

    if (!text || !voice) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    console.log('\n=== Starting Text-to-Speech Generation ===');
    console.log(`Received text length: ${text.length} characters`);
    console.log('Analyzing text...');

    // Split text into chunks
    const chunks = splitTextIntoChunks(text);
    console.log(`\n✓ Text Analysis Complete`);
    console.log(`Split into ${chunks.length} chunks:`);
    chunks.forEach((chunk, i) => {
        console.log(`\nChunk ${i + 1}:`);
        console.log(`- Length: ${chunk.length} characters`);
        console.log(`- Preview: "${chunk.substring(0, 50)}..."`);
    });

    try {
      // Process chunks sequentially to avoid rate limiting
      console.log('\n=== Starting Audio Generation ===');
      const results = [];
      for (let i = 0; i < chunks.length; i++) {
        console.log(`\nProcessing chunk ${i + 1} of ${chunks.length}...`);
        console.log('Sending to PlayHT API...');
        const result = await PlayHT.generate(chunks[i], {
          voiceId: voice,
          quality,
          speed,
          outputFormat: 'mp3'
        });
        console.log(`✓ Chunk ${i + 1} processed successfully`);
        console.log(`- Audio URL: ${result.audioUrl}`);
        console.log(`- Generation ID: ${result.generationId}`);
        results.push(result);
      }

      console.log('\n=== Audio Generation Complete ===');
      console.log(`Successfully generated ${results.length} audio files`);

      // Return response based on number of chunks
      if (chunks.length === 1) {
        console.log('Returning single audio URL');
        res.json({
          audioUrl: results[0].audioUrl,
          generationId: results[0].generationId
        });
      } else {
        console.log('Returning multiple audio URLs');
        res.json({
          audioUrls: results.map(r => r.audioUrl),
          generationIds: results.map(r => r.generationId),
          chunks: chunks.length
        });
      }
    } catch (genError) {
      console.error('\n❌ Error during generation:', genError);
      throw new Error(`Generation failed: ${genError.message}`);
    }
  } catch (error) {
    console.error('\n❌ Error generating speech:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data
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

    console.log('Cloning voice...', { name });
    const response = await PlayHT.cloneVoice({ name, files });
    console.log('Voice cloned:', response);
    res.json(response);
  } catch (error) {
    console.error('Error cloning voice:', error);
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
