import { Types } from 'mongoose';
import { User } from '../models/User';
import { Enrollment } from '../models/Enrollment';
import { Certificate } from '../models/Certificate';
import { UserAnalytics } from '../models/Analytics';
import { uploadImage } from '../config/cloudinary';
import { ApiError } from '../utils/apiError';
import type { UpdateProfileInput } from '../validators/user.validator';

// ─── User Service ─────────────────────────────────────────────────────────────

export const UserService = {

  // ── GET /users/me ─────────────────────────────────────────────────────────
  async getMe(userId: string) {
    const user = await User.findById(userId).populate('gamification.badges', 'name icon description');
    if (!user) throw new ApiError(404, 'User not found.');
    return user;
  },

  // ── PUT /users/me ─────────────────────────────────────────────────────────
  async updateMe(userId: string, data: UpdateProfileInput) {
    const updatePayload: Record<string, unknown> = {};

    if (data.name !== undefined) updatePayload['name'] = data.name;
    if (data.bio !== undefined) updatePayload['bio'] = data.bio;
    if (data.skills !== undefined) updatePayload['skills'] = data.skills;

    if (data.socialLinks) {
      for (const [key, val] of Object.entries(data.socialLinks)) {
        if (val !== undefined) updatePayload[`socialLinks.${key}`] = val;
      }
    }

    if (data.preferences) {
      if (data.preferences.theme !== undefined) {
        updatePayload['preferences.theme'] = data.preferences.theme;
      }
      if (data.preferences.learningGoal !== undefined) {
        updatePayload['preferences.learningGoal'] = data.preferences.learningGoal;
      }
      if (data.preferences.notifications) {
        for (const [key, val] of Object.entries(data.preferences.notifications)) {
          if (val !== undefined) {
            updatePayload[`preferences.notifications.${key}`] = val;
          }
        }
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updatePayload },
      { new: true, runValidators: true },
    ).populate('gamification.badges', 'name icon description');

    if (!user) throw new ApiError(404, 'User not found.');
    return user;
  },

  // ── Avatar upload ─────────────────────────────────────────────────────────
  async uploadAvatar(userId: string, fileBuffer: Buffer, _mimetype: string) {
    const result = await uploadImage(fileBuffer, {
      folder: 'lms/avatars',
      public_id: `avatar_${userId}`,
      overwrite: true,
      transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
      format: 'webp',
    });

    const user = await User.findByIdAndUpdate(
      userId,
      { avatar: result.secure_url },
      { new: true },
    );

    if (!user) throw new ApiError(404, 'User not found.');
    return { avatarUrl: result.secure_url };
  },

  // ── GET /users/:id/profile (public) ──────────────────────────────────────
  async getPublicProfile(targetId: string) {
    if (!Types.ObjectId.isValid(targetId)) {
      throw new ApiError(400, 'Invalid user ID.');
    }

    const user = await User.findById(targetId)
      .select('name avatar bio skills socialLinks gamification createdAt')
      .populate('gamification.badges', 'name icon description');

    if (!user) throw new ApiError(404, 'User not found.');
    return user;
  },

  // ── GET /users/me/analytics ───────────────────────────────────────────────
  async getMyAnalytics(userId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const analytics = await UserAnalytics.find({
      userId,
      date: { $gte: thirtyDaysAgo },
    }).sort({ date: 1 });

    // Also return summary stats
    const enrollments = await Enrollment.countDocuments({ userId, status: 'active' });
    const completed = await Enrollment.countDocuments({ userId, status: 'completed' });

    return {
      dailySnapshots: analytics,
      summary: {
        activeEnrollments: enrollments,
        completedCourses: completed,
        totalLearningTime: analytics.reduce((sum, a) => sum + a.learningTime, 0),
        totalXpEarned: analytics.reduce((sum, a) => sum + a.xpEarned, 0),
      },
    };
  },

  // ── GET /users/me/certificates ────────────────────────────────────────────
  async getMyCertificates(userId: string) {
    const certificates = await Certificate.find({ userId })
      .populate('courseId', 'title thumbnail')
      .sort({ issuedAt: -1 });

    return certificates;
  },
};
