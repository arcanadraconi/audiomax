import express from 'express';
import { register, login, verifyEmail, forgotPassword, resetPassword } from '../controllers/authController';
import { auth } from '../middleware/auth';
import { User } from '../models/User';
import mongoose from 'mongoose';

const router = express.Router();

// Registration and login routes
router.post('/register', register);
router.post('/login', login);
router.get('/verify-email/:token', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// Test database connection
router.get('/test-db', async (_req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    
    // Define database info type
    interface DbInfo {
      status: string;
      database?: string;
      host?: string;
      collections: string[];
      userCount?: number;
      userCountDetails?: {
        mongoose: number;
        direct: number;
        noFilter: number;
        active: number;
        array: number;
      };
      recentUsers?: Array<{
        id: string;
        email: string;
        createdAt: Date;
      }>;
    }

    const dbInfo: DbInfo = {
      status: dbState === 1 ? 'connected' :
             dbState === 2 ? 'connecting' :
             dbState === 3 ? 'disconnecting' :
             'disconnected',
      database: process.env.DATABASE_NAME,
      host: mongoose.connection.host || undefined,
      collections: Object.keys(mongoose.connection.collections)
    };

    if (dbState === 1) {
      // Get user counts using different methods
      const usersCollection = mongoose.connection.db.collection('users');
      
      const [
        mongooseCount,
        directCount,
        noFilterCount,
        activeCount,
        allUsers
      ] = await Promise.all([
        User.countDocuments(),
        usersCollection.countDocuments(),
        usersCollection.countDocuments({}),
        usersCollection.countDocuments({ status: 'active' }),
        usersCollection.find({})
          .sort({ createdAt: -1 })
          .limit(5)
          .project({ email: 1, createdAt: 1 })
          .toArray()
      ]);

      dbInfo.userCountDetails = {
        mongoose: mongooseCount,
        direct: directCount,
        noFilter: noFilterCount,
        active: activeCount,
        array: allUsers.length
      };

      dbInfo.userCount = directCount;
      dbInfo.recentUsers = allUsers.map(user => ({
        id: user._id.toString(),
        email: user.email,
        createdAt: user.createdAt
      }));
    }

    res.json(dbInfo);
  } catch (error: any) {
    console.error('Database test error:', error);
    res.status(500).json({
      message: 'Database test failed',
      error: error.message
    });
  }
});

// Verify user exists in database
router.get('/verify/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Log database connection status
    console.log('MongoDB Connection Status:', {
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name
    });

    // Verify user ID is valid
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.log('User not found in database:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('User found in database:', {
      id: user._id,
      email: user.email,
      createdAt: user.createdAt
    });

    res.json({
      message: 'User verified',
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Verify user error:', error);
    res.status(500).json({ message: 'Error verifying user' });
  }
});

export default router;
