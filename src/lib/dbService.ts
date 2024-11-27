import mongoose, { Types } from 'mongoose';
import { Transcript, ITranscript } from './models/Transcript';

interface SavedTranscript extends ITranscript {
  _id: Types.ObjectId;
}

export class DbService {
  private static isConnected = false;

  static async connect() {
    if (this.isConnected) return;

    try {
      await mongoose.connect(import.meta.env.VITE_MONGODB_URI);
      this.isConnected = true;
      console.log('Connected to MongoDB');
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }

  static async saveTranscript(
    chunks: string[],
    voice: any,
    audience: string
  ): Promise<SavedTranscript> {
    await this.connect();

    const transcript = new Transcript({
      chunks: chunks.map(text => ({
        text,
        status: 'pending'
      })),
      metadata: {
        voice: {
          id: voice.id,
          name: voice.name,
          accent: voice.accent,
          age: voice.age,
          gender: voice.gender,
          language: voice.language,
          style: voice.style,
          tempo: voice.tempo
        },
        audience,
        createdAt: new Date()
      }
    });

    const savedTranscript = await transcript.save();
    return savedTranscript as SavedTranscript;
  }

  static async updateChunkStatus(
    transcriptId: Types.ObjectId,
    chunkIndex: number,
    status: 'pending' | 'processing' | 'completed',
    audioUrl?: string
  ): Promise<SavedTranscript | null> {
    await this.connect();

    const update: any = {
      [`chunks.${chunkIndex}.status`]: status
    };
    
    if (audioUrl) {
      update[`chunks.${chunkIndex}.audioUrl`] = audioUrl;
    }

    const updatedTranscript = await Transcript.findByIdAndUpdate(
      transcriptId,
      { $set: update },
      { new: true }
    );

    return updatedTranscript as SavedTranscript | null;
  }

  static async getTranscript(id: Types.ObjectId): Promise<SavedTranscript | null> {
    await this.connect();
    const transcript = await Transcript.findById(id);
    return transcript as SavedTranscript | null;
  }

  static async listTranscripts(): Promise<SavedTranscript[]> {
    await this.connect();
    const transcripts = await Transcript.find().sort({ 'metadata.createdAt': -1 });
    return transcripts as SavedTranscript[];
  }
}
