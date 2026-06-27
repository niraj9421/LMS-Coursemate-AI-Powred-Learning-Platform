import { Types } from 'mongoose';
import { Assignment, Submission } from '../models/Assignment';
import { Course } from '../models/Course';
import { Enrollment } from '../models/Enrollment';
import { User } from '../models/User';
import { uploadDocument } from '../config/cloudinary';
import { ApiError } from '../utils/apiError';
import { logger } from '../utils/logger';
import type { CreateAssignmentInput, GradeSubmissionInput } from '../validators/assignment.validator';

export const AssignmentService = {

  // ── POST /api/v1/assignments (teacher only) ───────────────────────────────
  async createAssignment(data: CreateAssignmentInput, teacherId: string, fileBuffer?: Buffer, fileName?: string) {
    if (!Types.ObjectId.isValid(data.courseId)) {
      throw new ApiError(400, 'Invalid courseId.');
    }

    const course = await Course.findOne({ _id: data.courseId, deletedAt: null });
    if (!course) throw new ApiError(404, 'Course not found.');

    // Verify teacher owns the course (or is admin — handled at route level)
    if (course.instructor.toString() !== teacherId) {
      throw new ApiError(403, 'You do not own this course.');
    }

    let referenceFileUrl: string | undefined;
    if (fileBuffer && fileName) {
      const result = await uploadDocument(fileBuffer, fileName, { folder: 'lms/assignments/references' });
      referenceFileUrl = result.secure_url;
    }

    const assignment = await Assignment.create({
      courseId: data.courseId,
      lessonId: data.lessonId,
      title: data.title,
      description: data.description,
      dueDate: new Date(data.dueDate),
      maxMarks: data.maxMarks,
      referenceFileUrl,
      createdBy: teacherId,
    });

    logger.info(`[assignment] Teacher ${teacherId} created assignment "${assignment.title}" (${assignment._id})`);
    return assignment;
  },

  // ── GET /api/v1/assignments/:id ───────────────────────────────────────────
  async getAssignment(assignmentId: string, userId: string, userRole: string) {
    if (!Types.ObjectId.isValid(assignmentId)) {
      throw new ApiError(400, 'Invalid assignment ID.');
    }

    const assignment = await Assignment.findById(assignmentId)
      .populate('courseId', 'title')
      .populate('createdBy', 'name avatar');

    if (!assignment) throw new ApiError(404, 'Assignment not found.');

    let submission = null;
    if (userRole === 'student') {
      submission = await Submission.findOne({ assignmentId, studentId: userId });
    }

    return { assignment, submission };
  },

  // ── POST /api/v1/assignments/:id/submit (student only) ───────────────────
  async submitAssignment(assignmentId: string, studentId: string, fileBuffer: Buffer, originalName: string) {
    if (!Types.ObjectId.isValid(assignmentId)) {
      throw new ApiError(400, 'Invalid assignment ID.');
    }

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) throw new ApiError(404, 'Assignment not found.');

    // Check enrollment
    const enrollment = await Enrollment.findOne({
      userId: studentId,
      courseId: assignment.courseId,
      status: { $in: ['active', 'completed'] },
    });
    if (!enrollment) throw new ApiError(403, 'You are not enrolled in this course.');

    // Prevent duplicate submission
    const existing = await Submission.findOne({ assignmentId, studentId });
    if (existing) throw new ApiError(409, 'You have already submitted this assignment.');

    // Upload file to Cloudinary
    const result = await uploadDocument(fileBuffer, originalName, { folder: 'lms/assignments/submissions' });

    const submission = await Submission.create({
      assignmentId,
      studentId,
      courseId: assignment.courseId,
      fileUrl: result.secure_url,
      fileName: originalName,
      submittedAt: new Date(),
      status: 'submitted',
    });

    // Award XP for submission
    await User.findByIdAndUpdate(studentId, {
      $inc: { 'gamification.xp': 10 },
    });

    logger.info(`[assignment] Student ${studentId} submitted assignment ${assignmentId}`);
    return submission;
  },

  // ── PUT /api/v1/submissions/:id/grade (teacher only) ─────────────────────
  async gradeSubmission(submissionId: string, teacherId: string, data: GradeSubmissionInput) {
    if (!Types.ObjectId.isValid(submissionId)) {
      throw new ApiError(400, 'Invalid submission ID.');
    }

    const submission = await Submission.findById(submissionId).populate('assignmentId');
    if (!submission) throw new ApiError(404, 'Submission not found.');

    const assignment = await Assignment.findById(submission.assignmentId);
    if (!assignment) throw new ApiError(404, 'Assignment not found.');

    // Verify teacher owns the course
    const course = await Course.findById(assignment.courseId);
    if (!course) throw new ApiError(404, 'Course not found.');
    if (course.instructor.toString() !== teacherId) {
      throw new ApiError(403, 'You do not have permission to grade this submission.');
    }

    // Validate score doesn't exceed maxMarks
    if (data.score > assignment.maxMarks) {
      throw new ApiError(400, `Score cannot exceed max marks (${assignment.maxMarks}).`);
    }

    submission.score = data.score;
    submission.feedback = data.feedback;
    submission.status = 'graded';
    submission.gradedBy = new Types.ObjectId(teacherId);
    submission.gradedAt = new Date();
    await submission.save();

    logger.info(`[assignment] Teacher ${teacherId} graded submission ${submissionId} — score: ${data.score}/${assignment.maxMarks}`);
    return submission;
  },
};
