import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

router.get('/library', async (req, res) => {
    try {
        const response = await fetch('https://api.play.ht/api/v2/voices', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.PLAYHT_SECRET_KEY}`,
                'X-User-ID': process.env.PLAYHT_USER_ID || ''
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to fetch voice library');
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
