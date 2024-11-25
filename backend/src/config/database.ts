import mongoose, { ConnectOptions } from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const { DATABASE_URL, DATABASE_NAME } = process.env;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

const options: ConnectOptions = {
  dbName: DATABASE_NAME,
  retryWrites: true,
};

export const connectDB = async () => {
  try {
    console.log('Attempting to connect to MongoDB...');
    console.log('Database Name:', DATABASE_NAME);
    console.log('Connection URL:', DATABASE_URL.replace(/\/\/[^:]+:[^@]+@/, '//<credentials>@'));

    await mongoose.connect(DATABASE_URL, options);
    console.log('MongoDB Atlas connected successfully');
    
    // Log detailed connection info
    const { host, port, name } = mongoose.connection;
    console.log('Connection Details:', {
      host,
      port,
      name,
      readyState: mongoose.connection.readyState,
      models: Object.keys(mongoose.models)
    });

    // Get database stats
    const db = mongoose.connection.db;
    const stats = await db.stats();
    console.log('Database Stats:', {
      collections: stats.collections,
      views: stats.views,
      objects: stats.objects,
      avgObjSize: stats.avgObjSize,
      dataSize: stats.dataSize,
      storageSize: stats.storageSize,
      indexes: stats.indexes,
      indexSize: stats.indexSize
    });

    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('Available Collections:', collections.map(c => c.name));

    // Get users count
    if (collections.some(c => c.name === 'users')) {
      const usersCount = await db.collection('users').countDocuments();
      console.log('Total Users:', usersCount);

      // Get sample of recent users
      const recentUsers = await db.collection('users')
        .find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .project({ email: 1, createdAt: 1, _id: 1 })
        .toArray();
      console.log('Recent Users:', recentUsers);
    }
  } catch (error) {
    console.error('MongoDB connection error:', error);
    
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected. Attempting to reconnect...');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('MongoDB reconnected successfully');
  });

  // Log all mongoose events for debugging
  mongoose.connection.on('connecting', () => {
    console.log('Connecting to MongoDB...');
  });

  mongoose.connection.on('connected', () => {
    console.log('Connected to MongoDB');
  });

  mongoose.connection.on('disconnecting', () => {
    console.log('Disconnecting from MongoDB...');
  });

  mongoose.connection.on('close', () => {
    console.log('MongoDB connection closed');
  });
};
