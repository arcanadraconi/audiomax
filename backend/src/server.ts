import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/database';
import * as dotenv from 'dotenv';
import authRoutes from './routes/auth';
import { auth } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') || 'http://localhost:5174',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Security middleware
app.use(helmet());
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

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`API Version: ${process.env.API_VERSION}`);
  if (process.env.DEBUG === 'true') {
    console.log('Debug mode enabled');
  }
});
