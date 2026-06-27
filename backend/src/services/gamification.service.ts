import { Types } from 'mongoose';
import { User } from '../models/User';
import { Badge } from '../models/Badge';
import { Enrollment } from '../models/Enrollment';
import { setCache, getCache, flushPattern } from '../config/redis';
import { ApiError } from '../utils/apiError';
import { logger } from '../utils/logger';

// ─── XP level thresholds ──────────────────────────────────────────────────────
const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 4000, 8000, 15000, 30000];

// ─── Base XP per action ───────────────────────────────────────────────────────
const XP_TABLE: Record<string, number> = {
  lesson_complete: 10,
  quiz_pass: 25,
  assignment_submit: 10,
  course_complete: 100,
  community_post: 5,
  community_reply: 3,
  streak_bonus: 15,
  login: 2,
};

function calculateLevel(xp: number): number {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  return Math.min(level, LEVEL_THRESHOLDS.length);
}

export const GamificationService = {

  /**
   * Task 9.1 — Award XP for an action with streak multiplier.
   */
  async awardXP(userId: string, action: string, _metadata?: Record<string, unknown>) {
    const baseXP = XP_TABLE[action] ?? 5;
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found.');

    // Apply streak multiplier
    const streak = user.gamification.streak;
    let multiplier = 1.0;
    if (streak >= 7) multiplier = 1.5;
    else if (streak >= 3) multiplier = 1.2;

    const xpToAdd = Math.round(baseXP * multiplier);
    const newXP = user.gamification.xp + xpToAdd;
    const newLevel = calculateLevel(newXP);
    const leveledUp = newLevel > user.gamification.level;

    await User.findByIdAndUpdate(userId, {
      $set: {
        'gamification.xp': newXP,
        'gamification.level': newLevel,
      },
    });

    logger.info(`[gamification] User ${userId} earned ${xpToAdd} XP (${action}) — total: ${newXP}, level: ${newLevel}`);

    // Flush leaderboard cache
    await flushPattern('leaderboard:*');

    // Trigger badge check on level-up
    if (leveledUp) {
      await GamificationService.checkAndAwardBadges(userId);
    }

    return { xpAwarded: xpToAdd, totalXP: newXP, level: newLevel, leveledUp };
  },

  /**
   * Task 9.2 — Update daily streak.
   */
  async updateStreak(userId: string) {
    const user = await User.findById(userId);
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastActive = new Date(user.gamification.lastActiveDate);
    lastActive.setHours(0, 0, 0, 0);

    const diffDays = Math.round((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

    let newStreak = user.gamification.streak;

    if (diffDays === 0) {
      // Already active today — no change
      return;
    } else if (diffDays === 1) {
      // Consecutive day — increment streak
      newStreak += 1;
    } else {
      // Missed a day — reset streak
      newStreak = 1;
    }

    await User.findByIdAndUpdate(userId, {
      $set: {
        'gamification.streak': newStreak,
        'gamification.lastActiveDate': new Date(),
      },
    });

    // Award streak XP
    await GamificationService.awardXP(userId, 'streak_bonus');

    logger.info(`[gamification] User ${userId} streak updated to ${newStreak}`);
  },

  /**
   * Task 9.3 — Check and award badges based on eligibility rules.
   */
  async checkAndAwardBadges(userId: string) {
    const user = await User.findById(userId).populate('gamification.badges');
    if (!user) return;

    const allBadges = await Badge.find();
    const earnedBadgeIds = new Set(user.gamification.badges.map((b) => b.toString()));
    const newBadges: typeof allBadges = [];

    for (const badge of allBadges) {
      if (earnedBadgeIds.has((badge._id as Types.ObjectId).toString())) continue;

      let eligible = false;

      switch (badge.conditionType) {
        case 'level':
          eligible = user.gamification.level >= badge.conditionValue;
          break;
        case 'streak':
          eligible = user.gamification.streak >= badge.conditionValue;
          break;
        case 'course_complete': {
          const completedCount = await Enrollment.countDocuments({
            userId,
            status: 'completed',
          });
          eligible = completedCount >= badge.conditionValue;
          break;
        }
        default:
          break;
      }

      if (eligible) {
        newBadges.push(badge);
      }
    }

    if (newBadges.length > 0) {
      const newBadgeIds = newBadges.map((b) => b._id as Types.ObjectId);
      await User.findByIdAndUpdate(userId, {
        $addToSet: { 'gamification.badges': { $each: newBadgeIds } },
      });

      // Award XP bonus for each badge
      for (const badge of newBadges) {
        if (badge.xpBonus > 0) {
          await User.findByIdAndUpdate(userId, {
            $inc: { 'gamification.xp': badge.xpBonus },
          });
        }
        logger.info(`[gamification] User ${userId} earned badge "${badge.name}"`);
      }
    }

    return newBadges;
  },

  /**
   * Task 9.4 — Get user gamification stats with rank.
   */
  async getStats(userId: string) {
    const user = await User.findById(userId)
      .select('name avatar gamification')
      .populate('gamification.badges', 'name icon description');
    if (!user) throw new ApiError(404, 'User not found.');

    // Calculate global rank
    const rank = await User.countDocuments({
      'gamification.xp': { $gt: user.gamification.xp },
    }) + 1;

    return {
      xp: user.gamification.xp,
      level: user.gamification.level,
      streak: user.gamification.streak,
      badges: user.gamification.badges,
      rank,
      nextLevelXP: LEVEL_THRESHOLDS[user.gamification.level] ?? null,
    };
  },

  /**
   * Task 9.5 — Get leaderboard (global / course / weekly) — cached 1 min.
   */
  async getLeaderboard(scope: 'global' | 'course' | 'weekly', courseId?: string) {
    const cacheKey = `leaderboard:${scope}:${courseId ?? 'all'}`;
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    let userIds: string[] | null = null;

    if (scope === 'course' && courseId) {
      const enrollments = await Enrollment.find({ courseId }).select('userId');
      userIds = enrollments.map((e) => e.userId.toString());
    }

    const filter: Record<string, unknown> = {};
    if (userIds) filter['_id'] = { $in: userIds };

    if (scope === 'weekly') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      filter['gamification.lastActiveDate'] = { $gte: weekAgo };
    }

    const users = await User.find(filter)
      .select('name avatar gamification.xp gamification.level')
      .sort({ 'gamification.xp': -1 })
      .limit(50);

    const leaderboard = users.map((u, idx) => ({
      rank: idx + 1,
      userId: u._id,
      name: u.name,
      avatar: u.avatar,
      xp: u.gamification.xp,
      level: u.gamification.level,
    }));

    await setCache(cacheKey, leaderboard, 60); // 1-min TTL
    return leaderboard;
  },
};
