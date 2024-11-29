const { splitTextIntoChunks } = require('./utils');

function testTextChunking() {
    console.log('\n=== Testing Text Chunking Function ===\n');

    // Test case 1: Long text with multiple sentences
    const longText = `The sun was setting behind the mountains, casting long shadows across the valley. The air was crisp and clear, filled with the sweet scent of pine needles and wildflowers. In the distance, a lone wolf howled, its mournful cry echoing through the canyon walls. Birds were settling in for the night, their evening songs creating a natural symphony that seemed to celebrate the end of another beautiful day. The stars were beginning to appear in the darkening sky, twinkling like diamonds scattered across a velvet canvas. A gentle breeze rustled through the trees, carrying with it the promise of cooler temperatures and the possibility of rain. The moon, nearly full, was rising in the east, its silvery light adding an ethereal quality to the landscape. In a nearby stream, fish jumped occasionally, creating ripples that caught and reflected the last rays of sunlight. The whole scene was peaceful, serene, and absolutely breathtaking.`;

    console.log('Test 1: Long text with multiple sentences');
    console.log(`Input length: ${longText.length} characters`);
    const chunks1 = splitTextIntoChunks(longText);
    console.log(`Split into ${chunks1.length} chunks:`);
    chunks1.forEach((chunk, i) => {
        console.log(`Chunk ${i + 1}: ${chunk.length} characters`);
        console.log(`First 50 chars: "${chunk.substring(0, 50)}..."`);
        console.log(`Last 50 chars: "...${chunk.substring(chunk.length - 50)}"\n`);
    });

    // Test case 2: Very long sentence that needs comma splitting
    const longSentence = `In this incredibly detailed and extensive examination of the natural world around us, we can observe the intricate patterns of leaf formation, the complex interactions between different species of plants and animals, the fascinating ways in which weather patterns affect local ecosystems, the delicate balance of predator and prey relationships, and the remarkable adaptability of organisms to changing environmental conditions that we see throughout the seasons.`;

    console.log('\nTest 2: Very long sentence that needs comma splitting');
    console.log(`Input length: ${longSentence.length} characters`);
    const chunks2 = splitTextIntoChunks(longSentence);
    console.log(`Split into ${chunks2.length} chunks:`);
    chunks2.forEach((chunk, i) => {
        console.log(`Chunk ${i + 1}: ${chunk.length} characters`);
        console.log(`Content: "${chunk}"\n`);
    });

    // Test case 3: Text with exactly 1800 characters
    const exactText = 'a'.repeat(1800);
    console.log('\nTest 3: Text with exactly 1800 characters');
    const chunks3 = splitTextIntoChunks(exactText);
    console.log(`Split into ${chunks3.length} chunks:`);
    chunks3.forEach((chunk, i) => {
        console.log(`Chunk ${i + 1}: ${chunk.length} characters`);
    });

    // Test case 4: Short text under limit
    const shortText = 'This is a short test sentence.';
    console.log('\nTest 4: Short text under limit');
    const chunks4 = splitTextIntoChunks(shortText);
    console.log(`Split into ${chunks4.length} chunks:`);
    chunks4.forEach((chunk, i) => {
        console.log(`Chunk ${i + 1}: ${chunk.length} characters`);
        console.log(`Content: "${chunk}"\n`);
    });
}

testTextChunking();
