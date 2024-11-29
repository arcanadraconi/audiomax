require('dotenv').config();
const axios = require('axios');

async function testTTS() {
    try {
        console.log('\n=== Testing Text-to-Speech Generation ===\n');

        // Test data
        const testData = {
            text: 'Hello, this is a test of the text-to-speech system.',
            voice: 's3://voice-cloning-zero-shot/80ba8839-a6e6-470c-8f68-7c1e5d3ee2ff/abigailsaad/manifest.json',
            quality: 'premium',
            speed: 1
        };

        console.log('Making request with data:', testData);

        // Make request to local server
        const response = await axios.post('http://localhost:3001/api/tts', testData);

        console.log('\nServer Response:', JSON.stringify(response.data, null, 2));

        if (response.data.audioUrl) {
            console.log('\n✓ Success! Audio URL received');
            console.log('Audio URL:', response.data.audioUrl);
            console.log('Generation ID:', response.data.generationId);
        } else {
            console.log('\n⚠️ Warning: No audio URL in response');
        }

    } catch (error) {
        console.error('\n❌ Test Failed');
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Server Error Response:', error.response.data);
            console.error('Status Code:', error.response.status);
        }
    }
}

testTTS();
