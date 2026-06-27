import { Schema, model, Document } from 'mongoose';

export interface IBadge extends Document {
  name: string;
  description: string;
  icon: string;           // Cloudinary URL or emoji
  condition: string;      // human-readable condition description
  conditionType: 'level' | 'streak' | 'course_complete' | 'quiz_score' | 'community' | 'special';
  conditionValue: number; // e.g., level 5, streak 30, etc.
  xpBonus: number;
  createdAt: Date;
  updatedAt: Date;
}

const badgeSchema = new Schema<IBadge>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, required: true },
    icon: { type: String, required: true },
    condition: { type: String, required: true },
    conditionType: {
      type: String,
      enum: ['level', 'streak', 'course_complete', 'quiz_score', 'community', 'special'],
      required: true,
    },
    conditionValue: { type: Number, required: true, min: 0 },
    xpBonus: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

export const Badge = model<IBadge>('Badge', badgeSchema);
