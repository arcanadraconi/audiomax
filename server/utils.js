function splitTextIntoChunks(text, maxLength = 1800) {
    const chunks = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let currentChunk = '';

    for (const sentence of sentences) {
        const cleanSentence = sentence.trim();
        
        // If a single sentence is too long, split by commas
        if (cleanSentence.length > maxLength) {
            // Push current chunk if exists
            if (currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
            }
            
            // Split long sentence by commas
            const parts = cleanSentence.split(/,\s*/);
            let partChunk = '';
            
            for (const part of parts) {
                if (partChunk.length + part.length > maxLength) {
                    if (partChunk) chunks.push(partChunk.trim());
                    partChunk = part;
                } else {
                    partChunk += (partChunk ? ', ' : '') + part;
                }
            }
            
            if (partChunk) {
                currentChunk = partChunk;
            }
            continue;
        }

        // Check if adding this sentence would exceed maxLength
        if (currentChunk.length + cleanSentence.length > maxLength) {
            chunks.push(currentChunk.trim());
            currentChunk = cleanSentence;
        } else {
            currentChunk += (currentChunk ? ' ' : '') + cleanSentence;
        }
    }

    // Add the last chunk if it exists
    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }

    // Log chunk sizes for debugging
    chunks.forEach((chunk, i) => {
        console.log(`Chunk ${i + 1} size: ${chunk.length} characters`);
    });

    return chunks;
}

module.exports = {
    splitTextIntoChunks
};
