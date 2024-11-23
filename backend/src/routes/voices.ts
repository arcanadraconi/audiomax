import express from 'express';
import { RequestInfo, RequestInit, Response } from 'node-fetch';

interface ErrorResponse {
    message: string;
}

const router = express.Router();

router.get('/library', async (req, res) => {
    try {
        // Debug log environment variables
        console.log('Environment Variables:', {
            PLAYHT_SECRET_KEY: process.env.PLAYHT_SECRET_KEY,
            PLAYHT_USER_ID: process.env.PLAYHT_USER_ID
        });

        // Dynamically import node-fetch
        const { default: fetch } = await import('node-fetch');
        
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.PLAYHT_SECRET_KEY}`,
            'X-User-ID': process.env.PLAYHT_USER_ID || '',
            'AUTHORIZATION': `Bearer ${process.env.PLAYHT_SECRET_KEY}`
        };

        // Debug log headers
        console.log('Request Headers:', headers);

        const response = await fetch('https://api.play.ht/api/v2/voices', {
            method: 'GET',
            headers
        });

        if (!response.ok) {
            const text = await response.text();
            console.error('PlayHT API Error Response:', text);
            console.error('Response Status:', response.status);
            console.error('Response Headers:', Object.fromEntries(response.headers.entries()));
            try {
                const errorData = JSON.parse(text) as ErrorResponse;
                throw new Error(errorData.message || 'Failed to fetch voice library');
            } catch (parseError) {
                throw new Error(`Failed to fetch voice library: ${response.statusText}`);
            }
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Voice library fetch error:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to fetch voices'
        });
    }
});

export default router;
