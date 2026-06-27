import { Schema, model, Document, Types } from 'mongoose';
import { ApiError } from '../../utils/apiError';

// ─── AIUsageLog model (inline for simplicity) ─────────────────────────────────
interface IAIUsageLog extends Document {
  userId: Types.ObjectId;
  feature: string;
  tokensUsed: number;
  createdAt: Date;
}

const aiUsageLogSchema = new Schema<IAIUsageLog>(
  { userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, feature: String, tokensUsed: { type: Number, default: 0 } },
  { timestamps: true },
);
aiUsageLogSchema.index({ userId: 1, createdAt: -1 });

export const AIUsageLog = model<IAIUsageLog>('AIUsageLog', aiUsageLogSchema);

const FREE_DAILY_LIMIT = 50;
// PREMIUM_DAILY_LIMIT = 200 (reserved for future premium tier)

/**
 * Task 12.3 — AI usage tracking and daily limit enforcement.
 */
export const AIUsageTracker = {
  async checkAndLog(userId: string, feature: string, tokensUsed = 0) {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const todayCount = await AIUsageLog.countDocuments({
      userId: new Types.ObjectId(userId),
      createdAt: { $gte: dayStart },
    });

    // Use free limit for now (premium detection can be added later)
    if (todayCount >= FREE_DAILY_LIMIT) {
      throw new ApiError(429, `Daily AI query limit reached (${FREE_DAILY_LIMIT}/day). Upgrade to premium for more.`);
    }

    await AIUsageLog.create({ userId: new Types.ObjectId(userId), feature, tokensUsed });
  },
};
