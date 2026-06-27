import { Schema, model, Document, Types } from 'mongoose';

export interface IChatMessage extends Document {
  room: string;            // e.g. 'community:general' | 'community:javascript'
  userId: Types.ObjectId;
  userName: string;
  userAvatar?: string;
  body: string;
  createdAt: Date;
}

const chatMessageSchema = new Schema<IChatMessage>(
  {
    room:       { type: String, required: true, index: true },
    userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName:   { type: String, required: true },
    userAvatar: { type: String },
    body:       { type: String, required: true, maxlength: 2000 },
  },
  { timestamps: true },
);

chatMessageSchema.index({ room: 1, createdAt: -1 });

export const ChatMessage = model<IChatMessage>('ChatMessage', chatMessageSchema);
