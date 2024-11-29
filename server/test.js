require('dotenv').config();
const PlayHT = require('playht');
const axios = require('axios');

async function testServerEndpoints() {
    try {
        console.log('\n=== Testing Server Endpoints ===\n');

        // Test 1: Health Check
        console.log('Test 1: Health Check...');
        const healthResponse = await axios.get('http://localhost:3001/health');
        console.log('Health check response:', healthResponse.data);
        console.log('✓ Health check successful\n');

        // Test 2: Fetch Voices
        console.log('Test 2: Fetching voices...');
        const voicesResponse = await axios.get('http://localhost:3001/api/voices');
        const voices = voicesResponse.data.voices;
        console.log(`✓ Successfully fetched ${voices.length} voices`);
        
        if (voices.length > 0) {
            console.log('\nSample voice:', JSON.stringify(voices[0], null, 2));
        }
        console.log('\n');

        // Test 3: Generate Speech
        if (voices.length > 0) {
            console.log('Test 3: Generating speech...');
            const testVoice = voices[0];
            
            console.log('Using voice:', {
                name: testVoice.name,
                id: testVoice.id,
                engine: testVoice.voiceEngine
            });

            const ttsResponse = await axios.post('http://localhost:3001/api/tts', {
                text: 'Hello, this is a test of the text-to-speech system.',
                voice: testVoice.id,
                quality: 'premium',
                speed: 1
            });

            console.log('\nGeneration response:', JSON.stringify(ttsResponse.data, null, 2));

            if (ttsResponse.data.audioUrl) {
                console.log('✓ Successfully generated speech');
                console.log('Audio URL:', ttsResponse.data.audioUrl);
            } else {
                console.log('⚠️ Audio generated but URL not found in response');
                console.log('Response fields:', Object.keys(ttsResponse.data));
            }
        } else {
            console.log('⚠️ Skipping speech generation test - no voices found');
        }

        console.log('\n=== All Tests Completed ===\n');
    } catch (error) {
        console.error('\n❌ Test Failed:', error.message);
        if (error.response) {
            console.error('Error response:', error.response.data);
            console.error('Status code:', error.response.status);
        }
    }
}

testServerEndpoints();
