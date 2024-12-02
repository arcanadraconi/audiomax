import 'dotenv/config';
import fetch from 'node-fetch';

async function testVoices() {
    try {
        console.log('\n=== Testing Voice Fetching ===\n');

        const apiKey = process.env.PLAYHT_SECRET_KEY;
        const userId = process.env.PLAYHT_USER_ID;

        console.log('Using credentials:', {
            apiKey: apiKey ? `${apiKey.substring(0, 10)}...` : 'missing',
            userId: userId ? `${userId.substring(0, 4)}...` : 'missing'
        });

        console.log('\nFetching voices directly from PlayHT...');
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
            throw new Error(`Failed to fetch voices: ${response.status} ${response.statusText}\n${errorText}`);
        }

        const data = await response.json();
        console.log('\nRaw API Response:', JSON.stringify(data, null, 2));
        console.log(`\nFetched ${data.voices?.length || 0} voices`);
        
        if (data.voices?.length > 0) {
            console.log('\nExample voice:', JSON.stringify(data.voices[0], null, 2));
        }

        // Try alternate response format
        if (Array.isArray(data)) {
            console.log(`\nAlternate format: Found ${data.length} voices`);
            if (data.length > 0) {
                console.log('\nExample voice (alternate format):', JSON.stringify(data[0], null, 2));
            }
        }

    } catch (error) {
        console.error('\n❌ Test Failed');
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response:', error.response);
        }
    }
}

testVoices();
