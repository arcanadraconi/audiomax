import mongoose, { Schema, Document } from 'mongoose';

export interface ITranscript extends Document {
  chunks: Array<{
    text: string;
    audioUrl?: string;
    status: 'pending' | 'processing' | 'completed';
  }>;
  metadata: {
    voice: {
      id: string;
      name: string;
      accent: string;
      age: string;
      gender: string;
      language: string;
      style: string;
      tempo: string;
    };
    audience: string;
    createdAt: Date;
  };
}

const TranscriptSchema = new Schema<ITranscript>({
  chunks: [{
    text: { type: String, required: true },
    audioUrl: { type: String },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed'],
      default: 'pending'
    }
  }],
  metadata: {
    voice: {
      id: { type: String, required: true },
      name: { type: String, required: true },
      accent: String,
      age: String,
      gender: String,
      language: String,
      style: String,
      tempo: String
    },
    audience: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }
});

export const Transcript = mongoose.model<ITranscript>('Transcript', TranscriptSchema);
