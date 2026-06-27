import { Request, Response } from 'express';
import { AssignmentService } from '../services/assignment.service';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const AssignmentController = {

  // POST /api/v1/assignments
  createAssignment: asyncHandler(async (req: Request, res: Response) => {
    const assignment = await AssignmentService.createAssignment(
      req.body,
      req.user!.userId,
      req.file?.buffer,
      req.file?.originalname,
    );
    ApiResponse.success(res, 201, 'Assignment created', assignment);
  }),

  // GET /api/v1/assignments/:id
  getAssignment: asyncHandler(async (req: Request, res: Response) => {
    const result = await AssignmentService.getAssignment(
      req.params['id']!,
      req.user!.userId,
      req.user!.role,
    );
    ApiResponse.success(res, 200, 'Assignment fetched', result);
  }),

  // GET /api/v1/assignments/course/:courseId — teacher/admin
  getCourseAssignments: asyncHandler(async (req: Request, res: Response) => {
    const { Assignment, Submission } = await import('../models/Assignment');
    const assignments = await Assignment.find({ courseId: req.params['courseId'] })
      .sort({ dueDate: 1 });
    const withCounts = await Promise.all(assignments.map(async a => {
      const submissionCount = await Submission.countDocuments({ assignmentId: a._id });
      const gradedCount    = await Submission.countDocuments({ assignmentId: a._id, grade: { $ne: null } });
      return { ...a.toObject(), submissionCount, gradedCount };
    }));
    ApiResponse.success(res, 200, 'Assignments fetched', withCounts);
  }),

  // GET /api/v1/assignments/:id/submissions — teacher/admin
  getAssignmentSubmissions: asyncHandler(async (req: Request, res: Response) => {
    const { Submission } = await import('../models/Assignment');
    const submissions = await Submission.find({ assignmentId: req.params['id'] })
      .populate('userId', 'name email avatar')
      .sort({ submittedAt: -1 });
    ApiResponse.success(res, 200, 'Submissions fetched', submissions);
  }),

  // POST /api/v1/assignments/:id/submit
  submitAssignment: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      return ApiResponse.error(res, 400, 'Submission file is required.');
    }
    const submission = await AssignmentService.submitAssignment(
      req.params['id']!,
      req.user!.userId,
      req.file.buffer,
      req.file.originalname,
    );
    ApiResponse.success(res, 201, 'Assignment submitted', submission);
  }),

  // PUT /api/v1/submissions/:id/grade
  gradeSubmission: asyncHandler(async (req: Request, res: Response) => {
    const submission = await AssignmentService.gradeSubmission(
      req.params['id']!,
      req.user!.userId,
      req.body,
    );
    ApiResponse.success(res, 200, 'Submission graded', submission);
  }),
};
