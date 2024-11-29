require('dotenv').config();
const axios = require('axios');
const { splitTextIntoChunks } = require('./utils');

async function testLongText() {
    try {
        console.log('\n=== Testing Text Chunking ===\n');

        // Create a long text (over 2000 characters)
        const longText = `The sun was setting behind the mountains, casting long shadows across the valley. The air was crisp and clear, filled with the sweet scent of pine needles and wildflowers. In the distance, a lone wolf howled, its mournful cry echoing through the canyon walls. Birds were settling in for the night, their evening songs creating a natural symphony that seemed to celebrate the end of another beautiful day. The stars were beginning to appear in the darkening sky, twinkling like diamonds scattered across a velvet canvas. A gentle breeze rustled through the trees, carrying with it the promise of cooler temperatures and the possibility of rain. The moon, nearly full, was rising in the east, its silvery light adding an ethereal quality to the landscape. In a nearby stream, fish jumped occasionally, creating ripples that caught and reflected the last rays of sunlight. The whole scene was peaceful, serene, and absolutely breathtaking. As night continued to fall, the forest came alive with a different kind of energy. Nocturnal creatures began to stir, emerging from their daytime hiding places to begin their nightly routines. Owls hooted softly in the distance, while crickets and frogs added their voices to the evening chorus. The air grew cooler, and dew began to form on the grass and leaves. The transformation from day to night was a gradual but magical process, a daily miracle that never failed to inspire wonder and awe. In these moments, it was easy to feel connected to the natural world, to understand one's place in the grand scheme of things. The modern world, with all its noise and chaos, seemed very far away indeed. This was a place of peace, of reflection, of connection to something larger than oneself. As the last light faded from the sky, the stars grew brighter, and the Milky Way became visible, stretching across the heavens like a river of light. Shooting stars occasionally streaked across the sky, leaving brief but brilliant trails in their wake. The night was alive with possibility and mystery, a reminder of the endless wonders that exist in our universe. In these quiet moments, surrounded by the beauty and majesty of nature, it was possible to find a deep sense of peace and contentment. The worries and stresses of daily life seemed to fade away, replaced by a profound appreciation for the simple yet extraordinary experience of being alive and present in this moment. The night continued to deepen, and the forest settled into its nocturnal rhythm. The air grew cooler still, and a light mist began to form in the lower areas of the valley. The moon climbed higher in the sky, its light creating mysterious shadows that danced and shifted with the gentle movement of the trees. Time seemed to slow down, each moment stretching out like honey dripping from a spoon. The experience was both timeless and immediate, a reminder of the eternal cycles of nature and the precious uniqueness of each passing moment.`;

        console.log(`Original text length: ${longText.length} characters`);

        // Test local chunking first
        console.log('\nTesting local text chunking...');
        const localChunks = splitTextIntoChunks(longText);
        console.log(`Split into ${localChunks.length} chunks locally:`);
        localChunks.forEach((chunk, i) => {
            console.log(`Chunk ${i + 1}: ${chunk.length} characters`);
        });

        // Now test the API
        console.log('\nTesting API text chunking...');
        const testData = {
            text: longText,
            voice: 's3://voice-cloning-zero-shot/80ba8839-a6e6-470c-8f68-7c1e5d3ee2ff/abigailsaad/manifest.json',
            quality: 'premium',
            speed: 1
        };

        console.log('Making request to API...');
        const response = await axios.post('http://localhost:3001/api/tts', testData, {
            timeout: 300000 // 5 minutes timeout
        });

        console.log('\nAPI Response:', JSON.stringify(response.data, null, 2));

        if (response.data.audioUrls) {
            console.log('\n✓ Success! Multiple audio URLs received');
            console.log(`Number of chunks: ${response.data.chunks}`);
            console.log('Audio URLs:');
            response.data.audioUrls.forEach((url, index) => {
                console.log(`Chunk ${index + 1}: ${url}`);
            });
        } else if (response.data.audioUrl) {
            console.log('\n✓ Success! Single audio URL received');
            console.log('Audio URL:', response.data.audioUrl);
        } else {
            console.log('\n⚠️ Warning: No audio URLs in response');
        }

    } catch (error) {
        console.error('\n❌ Test Failed');
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Server Error Response:', JSON.stringify(error.response.data, null, 2));
            console.error('Status Code:', error.response.status);
        }
    }
}

testLongText();
