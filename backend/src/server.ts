import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/database.js';
import { config } from 'dotenv';
import authRoutes from './routes/auth.js';
import voicesRoutes from './routes/voices.js';
import { auth } from './middleware/auth.js';

config();

const app = express();
const PORT = process.env.PORT || 5000;
const BACKUP_PORTS = [5001, 5002, 5003, 5004];

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
const corsOptions = {
    origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['http://localhost:5174', 'http://localhost:5173'],
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Set-Cookie']
};
app.use(cors(corsOptions));

// Pre-flight requests
app.options('*', cors(corsOptions));

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "unsafe-none" }
}));
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// Rate limiting
if (!process.env.DISABLE_RATE_LIMITING) {
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: { error: 'Too many requests, please try again later.' }
    });
    app.use('/api/', limiter);
}

// Health check route
app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
        version: process.env.API_VERSION,
        environment: process.env.NODE_ENV
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/voices', voicesRoutes);

// Protected route example
app.get('/api/protected', auth, (req: Request, res: Response) => {
    res.json({
        message: 'This is a protected route',
        user: req.user,
        features: {
            voiceCloning: process.env.ENABLE_VOICE_CLONING === 'true',
            customVoices: process.env.ENABLE_CUSTOM_VOICES === 'true',
            analytics: process.env.ENABLE_ANALYTICS === 'true',
            pushNotifications: process.env.ENABLE_PUSH_NOTIFICATIONS === 'true'
        }
    });
});

// 404 handler
app.use((_req: Request, res: Response) => {
    res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err.stack);

    if (process.env.NODE_ENV === 'development') {
        res.status(500).json({
            message: 'Something went wrong!',
            error: err.message,
            stack: err.stack
        });
    } else {
        res.status(500).json({
            message: 'Something went wrong!'
        });
    }
});

// Try to start server on primary port, fallback to backup ports if needed
const startServer = async () => {
    try {
        await app.listen(PORT);
        console.log(`Server is running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV}`);
        console.log(`API Version: ${process.env.API_VERSION}`);
        if (process.env.DEBUG === 'true') {
            console.log('Debug mode enabled');
        }
    } catch (error) {
        console.log(`Port ${PORT} is in use, trying backup ports...`);
        for (const backupPort of BACKUP_PORTS) {
            try {
                await app.listen(backupPort);
                console.log(`Server is running on backup port ${backupPort}`);
                console.log(`Environment: ${process.env.NODE_ENV}`);
                console.log(`API Version: ${process.env.API_VERSION}`);
                if (process.env.DEBUG === 'true') {
                    console.log('Debug mode enabled');
                }
                break;
            } catch (err) {
                console.log(`Backup port ${backupPort} is also in use`);
            }
        }
    }
};

startServer();
