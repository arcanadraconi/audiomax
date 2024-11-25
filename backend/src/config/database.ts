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
    console.log('Connection URL:', DATABASE_URL.replace(/\/\/[^:]+:[^@]+@/, '//<credentials>@')); // Log URL without credentials

    await mongoose.connect(DATABASE_URL, options);
    console.log('MongoDB Atlas connected successfully');
    
    // Log connection details
    const { host, port, name } = mongoose.connection;
    console.log('Connection Details:', {
      host,
      port,
      name,
      readyState: mongoose.connection.readyState,
      models: Object.keys(mongoose.models)
    });

    // Test database operation
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log('Available collections:', collections.map(c => c.name));
    } catch (error) {
      console.error('Error listing collections:', error);
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
