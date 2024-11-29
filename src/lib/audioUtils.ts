// Text chunking utility
export function splitTextIntoChunks(text: string, maxLength = 1800): string[] {
    const chunks: string[] = [];
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
        console.log(`Chunk ${i + 1} preview: "${chunk.substring(0, 50)}..."`);
    });

    return chunks;
}

// Audio utilities
export async function combineAudioUrls(urls: string[]): Promise<Blob> {
    // Fetch all audio files
    const responses = await Promise.all(
        urls.map(url => fetch(url).then(res => res.arrayBuffer()))
    );

    // Combine audio buffers
    const totalLength = responses.reduce((acc, buffer) => acc + buffer.byteLength, 0);
    const combined = new Uint8Array(totalLength);
    
    let offset = 0;
    responses.forEach(buffer => {
        combined.set(new Uint8Array(buffer), offset);
        offset += buffer.byteLength;
    });

    return new Blob([combined], { type: 'audio/mp3' });
}

// Progress calculation
export function calculateOverallProgress(chunkProgresses: Map<number, number>, totalChunks: number): number {
    if (chunkProgresses.size === 0) return 0;
    
    const totalProgress = Array.from(chunkProgresses.values()).reduce((sum, progress) => sum + progress, 0);
    return (totalProgress / totalChunks);
}

// Format duration
export function formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Estimate audio duration based on word count
export function estimateAudioDuration(text: string): number {
    const wordCount = text.split(/\s+/).length;
    const wordsPerMinute = 150; // Average speaking rate
    return wordCount / wordsPerMinute;
}
