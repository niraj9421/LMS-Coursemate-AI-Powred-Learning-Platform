import slugify from 'slugify';
import { Types } from 'mongoose';
import { Course } from '../models/Course';
import { Chapter } from '../models/Chapter';
import { Lesson } from '../models/Lesson';
import { Enrollment, LessonProgress } from '../models/Enrollment';
import { User } from '../models/User';
import { uploadImage as cloudinaryUploadImage } from '../config/cloudinary';
import { setCache, getCache, flushPattern } from '../config/redis';
import { ApiError } from '../utils/apiError';
import { logger } from '../utils/logger';
import { GamificationService } from './gamification.service';
import type {
  CreateCourseInput,
  UpdateCourseInput,
  SearchCoursesInput,
  CreateChapterInput,
  CreateLessonInput,
  CompleteLessonInput,
  RateCourseInput,
} from '../validators/course.validator';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
  const base = slugify(title, { lower: true, strict: true });
  let slug = base;
  let counter = 1;
  while (true) {
    const query: Record<string, unknown> = { slug };
    if (excludeId) query['_id'] = { $ne: new Types.ObjectId(excludeId) };
    const existing = await Course.findOne(query);
    if (!existing) return slug;
    slug = `${base}-${counter++}`;
  }
}

async function recalculateCourseStats(courseId: string): Promise<void> {
  const chapters = await Chapter.find({ courseId }).populate('lessons');
  const lessonIds = chapters.flatMap((ch) => ch.lessons);
  const lessons = await Lesson.find({ _id: { $in: lessonIds } });

  const totalLessons = lessons.length;
  const totalDuration = lessons.reduce((sum, l) => sum + (l.content?.duration ?? 0), 0);

  await Course.findByIdAndUpdate(courseId, { totalLessons, totalDuration: Math.round(totalDuration / 60) });
}

// ─── Course Service ───────────────────────────────────────────────────────────

export const CourseService = {

  // ── POST /courses ─────────────────────────────────────────────────────────
  async createCourse(data: CreateCourseInput, teacherId: string, thumbnailBuffer?: Buffer) {
    const slug = await generateUniqueSlug(data.title);

    let thumbnailUrl = '';
    if (thumbnailBuffer) {
      const result = await cloudinaryUploadImage(thumbnailBuffer, {
        folder: 'lms/thumbnails',
        transformation: [{ width: 1280, height: 720, crop: 'fill' }],
        format: 'webp',
      });
      thumbnailUrl = result.secure_url;
    }

    const course = await Course.create({
      ...data,
      slug,
      instructor: teacherId,
      thumbnail: thumbnailUrl,
    });

    return course;
  },

  // ── GET /courses (search + filter + pagination) ───────────────────────────
  async getCourses(query: SearchCoursesInput) {
    const cacheKey = `courses:list:${JSON.stringify(query)}`;
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const filter: Record<string, unknown> = { deletedAt: null };

    // Teacher "my courses" view passes instructor; otherwise restrict to published
    if ((query as SearchCoursesInput & { instructor?: string }).instructor) {
      filter['instructor'] = new Types.ObjectId((query as SearchCoursesInput & { instructor?: string }).instructor);
    } else {
      filter['status'] = 'published';
    }

    if (query.q) {
      filter['$text'] = { $search: query.q };
    }
    if (query.category) filter['category'] = query.category;
    if (query.level) filter['level'] = query.level;
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      filter['price'] = {};
      if (query.minPrice !== undefined) (filter['price'] as Record<string, number>)['$gte'] = query.minPrice;
      if (query.maxPrice !== undefined) (filter['price'] as Record<string, number>)['$lte'] = query.maxPrice;
    }
    if (query.minRating !== undefined) {
      filter['rating.average'] = { $gte: query.minRating };
    }

    // Cursor-based pagination
    if (query.cursor) {
      filter['_id'] = { $lt: new Types.ObjectId(query.cursor) };
    }

    const courses = await Course.find(filter)
      .populate('instructor', 'name avatar')
      .populate('category', 'name slug')
      .sort({ _id: -1 })
      .limit(query.limit + 1); // fetch one extra to determine hasMore

    const hasMore = courses.length > query.limit;
    const items = hasMore ? courses.slice(0, query.limit) : courses;
    const nextCursor = hasMore ? items[items.length - 1]._id.toString() : null;

    const result = { items, hasMore, nextCursor };
    await setCache(cacheKey, result, 300); // 5-min TTL
    return result;
  },

  // ── GET /courses/:id ──────────────────────────────────────────────────────
  async getCourseById(courseId: string, userId?: string) {
    if (!Types.ObjectId.isValid(courseId)) throw new ApiError(400, 'Invalid course ID.');

    const course = await Course.findOne({ _id: courseId, deletedAt: null })
      .populate('instructor', 'name avatar bio')
      .populate('category', 'name slug')
      .populate({
        path: 'chapters',
        populate: { path: 'lessons', select: 'title type order isFree content.duration' },
      });

    if (!course) throw new ApiError(404, 'Course not found.');

    // Check enrollment to determine locked/unlocked lessons
    let isEnrolled = false;
    if (userId) {
      const enrollment = await Enrollment.findOne({ userId, courseId });
      isEnrolled = !!enrollment;
    }

    return { course, isEnrolled };
  },

  // ── PUT /courses/:id ──────────────────────────────────────────────────────
  async updateCourse(courseId: string, data: UpdateCourseInput, userId: string, role: string, thumbnailBuffer?: Buffer) {
    const course = await Course.findOne({ _id: courseId, deletedAt: null });
    if (!course) throw new ApiError(404, 'Course not found.');

    if (role !== 'admin' && course.instructor.toString() !== userId) {
      throw new ApiError(403, 'You do not have permission to update this course.');
    }

    const updatePayload: Record<string, unknown> = { ...data };

    if (data.title && data.title !== course.title) {
      updatePayload['slug'] = await generateUniqueSlug(data.title, courseId);
    }

    if (thumbnailBuffer) {
      const result = await cloudinaryUploadImage(thumbnailBuffer, {
        folder: 'lms/thumbnails',
        transformation: [{ width: 1280, height: 720, crop: 'fill' }],
        format: 'webp',
      });
      updatePayload['thumbnail'] = result.secure_url;
    }

    const updated = await Course.findByIdAndUpdate(
      courseId,
      { $set: updatePayload },
      { new: true, runValidators: true },
    );

    await flushPattern('courses:list:*');
    return updated;
  },

  // ── DELETE /courses/:id (soft-delete) ─────────────────────────────────────
  async deleteCourse(courseId: string, userId: string, role: string) {
    const course = await Course.findOne({ _id: courseId, deletedAt: null });
    if (!course) throw new ApiError(404, 'Course not found.');

    if (role !== 'admin' && course.instructor.toString() !== userId) {
      throw new ApiError(403, 'You do not have permission to delete this course.');
    }

    await Course.findByIdAndUpdate(courseId, { deletedAt: new Date() });
    await flushPattern('courses:list:*');
    return { message: 'Course deleted successfully.' };
  },

  // ── POST /courses/:id/publish ─────────────────────────────────────────────
  async publishCourse(courseId: string, userId: string, role: string) {
    const course = await Course.findOne({ _id: courseId, deletedAt: null });
    if (!course) throw new ApiError(404, 'Course not found.');

    if (role !== 'admin' && course.instructor.toString() !== userId) {
      throw new ApiError(403, 'You do not have permission to publish this course.');
    }

    const updated = await Course.findByIdAndUpdate(
      courseId,
      { status: 'published' },
      { new: true },
    );

    await flushPattern('courses:list:*');
    return updated;
  },

  // ── POST /courses/:id/enroll ──────────────────────────────────────────────
  async enrollStudent(courseId: string, studentId: string) {
    const course = await Course.findOne({ _id: courseId, status: 'published', deletedAt: null });
    if (!course) throw new ApiError(404, 'Course not found or not published.');

    const existing = await Enrollment.findOne({ userId: studentId, courseId });
    if (existing) throw new ApiError(409, 'You are already enrolled in this course.');

    const enrollment = await Enrollment.create({ userId: studentId, courseId });

    // Atomically increment enrollment count
    await Course.findByIdAndUpdate(courseId, { $inc: { enrollmentCount: 1 } });

    return enrollment;
  },

  // ── GET /courses/:id/progress ─────────────────────────────────────────────
  async getCourseProgress(courseId: string, userId: string) {
    const enrollment = await Enrollment.findOne({ userId, courseId });
    if (!enrollment) throw new ApiError(404, 'You are not enrolled in this course.');

    const chapters = await Chapter.find({ courseId }).sort({ order: 1 }).populate({
      path: 'lessons',
      select: 'title type order isFree',
    });

    // Find next incomplete lesson
    const completedSet = new Set(enrollment.completedLessons.map((id) => id.toString()));
    let nextLesson = null;
    outer: for (const chapter of chapters) {
      for (const lesson of chapter.lessons as unknown as Array<{ _id: Types.ObjectId; title: string; type: string }>) {
        if (!completedSet.has(lesson._id.toString())) {
          nextLesson = lesson;
          break outer;
        }
      }
    }

    return {
      progress: enrollment.progress,
      completedLessons: enrollment.completedLessons,
      status: enrollment.status,
      lastAccessedAt: enrollment.lastAccessedAt,
      nextLesson,
    };
  },

  // ── GET /courses/recommended ──────────────────────────────────────────────
  async getRecommendedCourses(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found.');

    const enrolledCourseIds = (
      await Enrollment.find({ userId }).select('courseId')
    ).map((e) => e.courseId);

    const filter: Record<string, unknown> = {
      status: 'published',
      deletedAt: null,
      _id: { $nin: enrolledCourseIds },
    };

    if (user.skills.length > 0) {
      filter['tags'] = { $in: user.skills };
    }

    const courses = await Course.find(filter)
      .populate('instructor', 'name avatar')
      .populate('category', 'name slug')
      .sort({ 'rating.average': -1, enrollmentCount: -1 })
      .limit(10);

    return courses;
  },

  // ── POST /courses/:id/rate ────────────────────────────────────────────────
  async rateCourse(courseId: string, userId: string, data: RateCourseInput) {
    const enrollment = await Enrollment.findOne({ userId, courseId });
    if (!enrollment) throw new ApiError(403, 'You must be enrolled to rate this course.');

    // Recalculate average rating (simple approach — upsert a rating record)
    // For now we update the course rating directly using a running average
    const course = await Course.findById(courseId);
    if (!course) throw new ApiError(404, 'Course not found.');

    const { average, count } = course.rating;
    const newCount = count + 1;
    const newAverage = (average * count + data.rating) / newCount;

    await Course.findByIdAndUpdate(courseId, {
      'rating.average': Math.round(newAverage * 10) / 10,
      'rating.count': newCount,
    });

    await flushPattern('courses:list:*');
    return { message: 'Rating submitted.' };
  },

  // ── Chapter CRUD ──────────────────────────────────────────────────────────

  async createChapter(courseId: string, data: CreateChapterInput, userId: string, role: string) {
    const course = await Course.findOne({ _id: courseId, deletedAt: null });
    if (!course) throw new ApiError(404, 'Course not found.');
    if (role !== 'admin' && course.instructor.toString() !== userId) {
      throw new ApiError(403, 'Permission denied.');
    }

    const chapter = await Chapter.create({ courseId, ...data });
    await Course.findByIdAndUpdate(courseId, { $push: { chapters: chapter._id } });
    return chapter;
  },

  async updateChapter(chapterId: string, data: Partial<CreateChapterInput>, userId: string, role: string) {
    const chapter = await Chapter.findById(chapterId).populate('courseId');
    if (!chapter) throw new ApiError(404, 'Chapter not found.');

    const course = await Course.findById(chapter.courseId);
    if (!course) throw new ApiError(404, 'Course not found.');
    if (role !== 'admin' && course.instructor.toString() !== userId) {
      throw new ApiError(403, 'Permission denied.');
    }

    return Chapter.findByIdAndUpdate(chapterId, { $set: data }, { new: true });
  },

  async deleteChapter(chapterId: string, userId: string, role: string) {
    const chapter = await Chapter.findById(chapterId);
    if (!chapter) throw new ApiError(404, 'Chapter not found.');

    const course = await Course.findById(chapter.courseId);
    if (!course) throw new ApiError(404, 'Course not found.');
    if (role !== 'admin' && course.instructor.toString() !== userId) {
      throw new ApiError(403, 'Permission denied.');
    }

    await Chapter.findByIdAndDelete(chapterId);
    await Course.findByIdAndUpdate(chapter.courseId, { $pull: { chapters: chapter._id } });
    await recalculateCourseStats(chapter.courseId.toString());
    return { message: 'Chapter deleted.' };
  },

  // ── Lesson CRUD ───────────────────────────────────────────────────────────

  async createLesson(chapterId: string, data: CreateLessonInput, userId: string, role: string, fileBuffer?: Buffer, fileType?: string) {
    const chapter = await Chapter.findById(chapterId);
    if (!chapter) throw new ApiError(404, 'Chapter not found.');

    const course = await Course.findById(chapter.courseId);
    if (!course) throw new ApiError(404, 'Course not found.');
    if (role !== 'admin' && course.instructor.toString() !== userId) {
      throw new ApiError(403, 'Permission denied.');
    }

    const lessonData = { ...data, chapterId, courseId: chapter.courseId };

    // Handle file upload
    if (fileBuffer && fileType) {
      if (data.type === 'video') {
        const { uploadVideo } = await import('../config/cloudinary');
        const result = await uploadVideo(fileBuffer, { folder: 'lms/lessons/videos' });
        lessonData.content = {
          ...lessonData.content,
          videoUrl: result.secure_url,
          duration: result.duration ?? 0,
        };
      } else if (data.type === 'pdf') {
        const { uploadDocument } = await import('../config/cloudinary');
        const result = await uploadDocument(fileBuffer, `lesson_${Date.now()}`, { folder: 'lms/lessons/docs' });
        lessonData.content = { ...lessonData.content, pdfUrl: result.secure_url };
      }
    }

    const lesson = await Lesson.create(lessonData);
    await Chapter.findByIdAndUpdate(chapterId, { $push: { lessons: lesson._id } });
    await recalculateCourseStats(chapter.courseId.toString());
    return lesson;
  },

  async updateLesson(lessonId: string, data: Partial<CreateLessonInput>, userId: string, role: string) {
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) throw new ApiError(404, 'Lesson not found.');

    const course = await Course.findById(lesson.courseId);
    if (!course) throw new ApiError(404, 'Course not found.');
    if (role !== 'admin' && course.instructor.toString() !== userId) {
      throw new ApiError(403, 'Permission denied.');
    }

    const updated = await Lesson.findByIdAndUpdate(lessonId, { $set: data }, { new: true });
    await recalculateCourseStats(lesson.courseId.toString());
    return updated;
  },

  async deleteLesson(lessonId: string, userId: string, role: string) {
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) throw new ApiError(404, 'Lesson not found.');

    const course = await Course.findById(lesson.courseId);
    if (!course) throw new ApiError(404, 'Course not found.');
    if (role !== 'admin' && course.instructor.toString() !== userId) {
      throw new ApiError(403, 'Permission denied.');
    }

    await Lesson.findByIdAndDelete(lessonId);
    await Chapter.findByIdAndUpdate(lesson.chapterId, { $pull: { lessons: lesson._id } });
    await recalculateCourseStats(lesson.courseId.toString());
    return { message: 'Lesson deleted.' };
  },

  // ── POST /lessons/:id/complete ────────────────────────────────────────────
  async completeLesson(lessonId: string, userId: string, data: CompleteLessonInput) {
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) throw new ApiError(404, 'Lesson not found.');

    const enrollment = await Enrollment.findOne({ userId, courseId: lesson.courseId });
    if (!enrollment) throw new ApiError(403, 'You are not enrolled in this course.');

    // For video lessons enforce 80% watch time
    if (lesson.type === 'video' && lesson.content?.duration) {
      const required = lesson.content.duration * 0.8;
      if (!data.watchTime || data.watchTime < required) {
        throw new ApiError(400, `You must watch at least 80% of the video (${Math.ceil(required)}s) to mark it complete.`);
      }
    }

    // Upsert lesson progress
    await LessonProgress.findOneAndUpdate(
      { userId, lessonId },
      {
        userId,
        lessonId,
        courseId: lesson.courseId,
        completed: true,
        completedAt: new Date(),
        watchTime: data.watchTime,
      },
      { upsert: true, new: true },
    );

    // Update enrollment completed lessons list
    const alreadyCompleted = enrollment.completedLessons.some(
      (id) => id.toString() === lessonId,
    );

    if (!alreadyCompleted) {
      enrollment.completedLessons.push(new Types.ObjectId(lessonId));
    }

    // Recalculate progress percentage
    const totalLessons = await Lesson.countDocuments({ courseId: lesson.courseId });
    const progress = totalLessons > 0
      ? Math.round((enrollment.completedLessons.length / totalLessons) * 100)
      : 0;

    enrollment.progress = progress;
    enrollment.lastAccessedAt = new Date();

    if (progress === 100) {
      enrollment.status = 'completed';
      enrollment.completedAt = new Date();
    }

    await enrollment.save();

    logger.info(`[course] User ${userId} completed lesson ${lessonId} — progress: ${progress}%`);

    // Task 9.6 — Update streak and award XP on lesson completion
    await GamificationService.updateStreak(userId).catch((err) =>
      logger.error('[gamification] updateStreak failed:', err),
    );
    await GamificationService.awardXP(userId, 'lesson_complete').catch((err) =>
      logger.error('[gamification] awardXP failed:', err),
    );

    // Trigger certificate generation if course is 100% complete
    if (progress === 100) {
      import('./certificate.service').then(({ CertificateService }) => {
        CertificateService.generateCertificate(userId, lesson.courseId.toString()).catch((err) =>
          logger.error('[certificate] Auto-generation failed:', err),
        );
      });
    }

    return {
      progress,
      completed: true,
      courseCompleted: progress === 100,
    };
  },
};
