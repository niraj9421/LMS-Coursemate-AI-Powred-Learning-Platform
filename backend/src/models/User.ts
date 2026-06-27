import { Schema, model, Document, Types } from 'mongoose';

// ─── Sub-document interfaces ──────────────────────────────────────────────────

export interface ISocialLinks {
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

export interface INotificationPreferences {
  email: boolean;
  inApp: boolean;
  assignmentDue: boolean;
  courseUpdates: boolean;
  quizResults: boolean;
  badgeEarned: boolean;
}

export interface IPreferences {
  theme: 'dark' | 'light';
  notifications: INotificationPreferences;
  learningGoal?: string;
}

export interface IGamification {
  xp: number;
  level: number;
  streak: number;
  lastActiveDate: Date;
  badges: Types.ObjectId[];
}

// ─── Main interface ───────────────────────────────────────────────────────────

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  avatar: string;
  role: 'admin' | 'teacher' | 'student';
  googleId?: string;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  bio?: string;
  skills: string[];
  socialLinks: ISocialLinks;
  gamification: IGamification;
  preferences: IPreferences;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // never returned in queries by default
    },
    avatar: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['admin', 'teacher', 'student'],
      default: 'student',
    },
    googleId: {
      type: String,
      // sparse index defined below via schema.index()
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
    },
    skills: {
      type: [String],
      default: [],
    },
    socialLinks: {
      linkedin: String,
      github: String,
      portfolio: String,
    },
    gamification: {
      xp: { type: Number, default: 0, min: 0 },
      level: { type: Number, default: 1, min: 1 },
      streak: { type: Number, default: 0, min: 0 },
      lastActiveDate: { type: Date, default: Date.now },
      badges: [{ type: Schema.Types.ObjectId, ref: 'Badge' }],
    },
    preferences: {
      theme: {
        type: String,
        enum: ['dark', 'light'],
        default: 'dark',
      },
      notifications: {
        email: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
        assignmentDue: { type: Boolean, default: true },
        courseUpdates: { type: Boolean, default: true },
        quizResults: { type: Boolean, default: true },
        badgeEarned: { type: Boolean, default: true },
      },
      learningGoal: String,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        // Never expose sensitive fields in JSON output
        delete ret['password'];
        delete ret['emailVerificationToken'];
        delete ret['passwordResetToken'];
        delete ret['passwordResetExpires'];
        return ret;
      },
    },
  },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// Note: email unique index is already defined inline via `unique: true` on the field
userSchema.index({ googleId: 1 }, { sparse: true });
userSchema.index({ role: 1 });
userSchema.index({ 'gamification.xp': -1 }); // for leaderboard queries

export const User = model<IUser>('User', userSchema);
