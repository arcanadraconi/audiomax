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
            text: 'Hello, this is a test of the text-to-speech system. We will verify that the voice and audio generation work correctly.',
            voice: 's3://voice-cloning-zero-shot/72c255f8-00af-4c48-b0de-ad471baa3f52/alexsaad/manifest.json',
            output_format: 'mp3',
            quality: 'premium',
            speed: 1,
            model: 'Play3.0-mini'
        };

        console.log('Making request with data:', {
            text: testData.text,
            voice: testData.voice,
            model: testData.model
        });

        // First, get WebSocket auth token
        console.log('\nGetting WebSocket auth token...');
        const authResponse = await axios.post('http://localhost:3001/api/websocket-auth');
        console.log('WebSocket auth response received');

        // Create output directory if it doesn't exist
        const outputDir = path.join(process.cwd(), 'output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }

        // Prepare output file
        const outputFile = path.join(outputDir, 'test-output.mp3');
        const writeStream = fs.createWriteStream(outputFile);
        let audioChunks = [];
        let chunkCount = 0;
        let expectedChunks = null;

        // Connect to WebSocket
        const ws = new WebSocket(authResponse.data.websocket_url);

        // Set up connection timeout
        const connectionTimeout = setTimeout(() => {
            console.error('Connection timeout - no response after 30 seconds');
            ws.close();
        }, 30000);

        ws.on('open', () => {
            console.log('\nWebSocket connected, sending TTS request...');
            clearTimeout(connectionTimeout);
            ws.send(JSON.stringify(testData));
        });

        ws.on('message', (data) => {
            if (data instanceof Buffer) {
                chunkCount++;
                console.log(`Received audio chunk ${chunkCount}${expectedChunks ? '/' + expectedChunks : ''} (${data.length} bytes)`);
                audioChunks.push(data);
                writeStream.write(data);
            } else {
                const message = data.toString();
                try {
                    const parsed = JSON.parse(message);
                    console.log('Received message:', parsed);

                    if (parsed.total_chunks) {
                        expectedChunks = parsed.total_chunks;
                        console.log(`Expecting ${expectedChunks} total chunks`);
                    }

                    if (parsed.voice_id) {
                        console.log('Using voice:', parsed.voice_id);
                    }

                    if ('request_id' in parsed) {
                        console.log('\n✓ Success! Audio generation complete');
                        console.log('Total chunks received:', chunkCount);
                        console.log('Total audio size:', audioChunks.reduce((acc, chunk) => acc + chunk.length, 0), 'bytes');
                        console.log('Audio saved to:', outputFile);
                        writeStream.end();
                        ws.close();
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

            // Verify the generated audio file
            if (fs.existsSync(outputFile)) {
                const stats = fs.statSync(outputFile);
                console.log('\nAudio file verification:');
                console.log('- File size:', stats.size, 'bytes');
                console.log('- Chunks received:', chunkCount);
                console.log('- Expected chunks:', expectedChunks || 'unknown');
                
                if (stats.size === 0) {
                    console.error('❌ Error: Generated audio file is empty');
                } else if (expectedChunks && chunkCount !== expectedChunks) {
                    console.error('❌ Error: Missing audio chunks');
                } else {
                    console.log('✓ Audio file generated successfully');
                }
            } else {
                console.error('❌ Error: No audio file generated');
            }
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
