import mongoose, { Schema, Document } from 'mongoose';

export interface IChat extends Document {
  userId: string;
  message: string;
  response: string;
  cached: boolean;
  timestamp: Date;
  sessionId: string;
}

const chatSchema = new Schema<IChat>(
  {
    userId: { type: String, required: true, index: true },
    message: { type: String, required: true },
    response: { type: String, required: true },
    cached: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now },
    sessionId: { type: String, required: true, index: true },
  },
  { timestamps: false }
);

export const ChatModel = mongoose.model<IChat>('Chat', chatSchema);