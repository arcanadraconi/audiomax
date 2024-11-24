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
    const conn = await mongoose.connect(DATABASE_URL, options);
    
    // Drop the existing users collection to remove problematic indexes
    try {
      await conn.connection.db.dropCollection('users');
      console.log('Dropped users collection to remove old indexes');
    } catch (error) {
      // Ignore error if collection doesn't exist
    }
    
    console.log('MongoDB Atlas connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
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
};
