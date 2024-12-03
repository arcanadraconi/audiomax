import { MongoClient, Db } from 'mongodb';

let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<Db> {
  if (cachedDb) {
    return cachedDb;
  }

  try {
    // Get MongoDB URI from environment variables
    const uri = (import.meta.env as any).VITE_MONGODB_URI;
    if (!uri) {
      throw new Error('MongoDB URI not found in environment variables');
    }

    const client = await MongoClient.connect(uri);
    const db = client.db('audiomax');

    cachedDb = db;
    return db;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}
