import 'dotenv/config';
import axios from 'axios';
import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';

async function testTTS() {
    try {
        console.log('\n=== Testing Text-to-Speech Generation ===\n');

        // Test data for WebSocket
        const testData = {
            text: 'Hello, this is a test of the text-to-speech system.',
            voice: 's3://voice-cloning-zero-shot/72c255f8-00af-4c48-b0de-ad471baa3f52/alexsaad/manifest.json',
            output_format: 'mp3',
            quality: 'premium',
            speed: 1
        };

        console.log('Making request with data:', testData);

        // First, get WebSocket auth token
        console.log('\nGetting WebSocket auth token...');
        const authResponse = await axios.post('http://localhost:3001/api/websocket-auth');
        console.log('WebSocket auth response:', authResponse.data);

        // Create output directory if it doesn't exist
        const outputDir = path.join(process.cwd(), 'output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }

        // Prepare output file
        const outputFile = path.join(outputDir, 'test-output.mp3');
        const writeStream = fs.createWriteStream(outputFile);
        let audioChunks = [];

        // Connect to WebSocket
        const ws = new WebSocket(authResponse.data.websocket_url);

        ws.on('open', () => {
            console.log('\nWebSocket connected, sending TTS request...');
            ws.send(JSON.stringify(testData));
        });

        ws.on('message', (data) => {
            if (data instanceof Buffer) {
                console.log('Received audio chunk:', data.length, 'bytes');
                audioChunks.push(data);
                writeStream.write(data);
            } else {
                const message = data.toString();
                try {
                    const parsed = JSON.parse(message);
                    if ('request_id' in parsed) {
                        console.log('\n✓ Success! Audio generation complete');
                        console.log('Audio saved to:', outputFile);
                        writeStream.end();
                        ws.close();
                    } else {
                        console.log('Received message:', message);
                    }
                } catch (e) {
                    console.log('Received message:', message);
                }
            }
        });

        ws.on('error', (error) => {
            console.error('\n❌ WebSocket Error:', error.message);
        });

        ws.on('close', () => {
            console.log('\nWebSocket connection closed');
            writeStream.end();
        });

    } catch (error) {
        console.error('\n❌ Test Failed');
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Error Response:', error.response.data);
            console.error('Status Code:', error.response.status);
        }
    }
}

testTTS();
