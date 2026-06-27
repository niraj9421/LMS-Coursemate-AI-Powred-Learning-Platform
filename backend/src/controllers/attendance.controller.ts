import { Request, Response } from 'express';
import { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { AttendanceSession } from '../models/Attendance';
import { Enrollment } from '../models/Enrollment';
import { User } from '../models/User';
import { ApiResponse } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import { asyncHandler } from '../utils/asyncHandler';
import { env } from '../config/env';

export const AttendanceController = {

  // POST /api/v1/attendance/session — teacher only
  createSession: asyncHandler(async (req: Request, res: Response) => {
    const { courseId, sessionTitle } = req.body as { courseId: string; sessionTitle?: string };
    if (!courseId) throw new ApiError(400, 'courseId is required.');

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    // Sign a short-lived JWT as the QR token
    const qrToken = jwt.sign(
      { courseId, sessionType: 'attendance', exp: Math.floor(expiresAt.getTime() / 1000) },
      env.JWT_ACCESS_SECRET,
    );

    const session = await AttendanceSession.create({
      courseId: new Types.ObjectId(courseId),
      teacherId: new Types.ObjectId(req.user!.userId),
      sessionTitle,
      qrToken,
      expiresAt,
      records: [],
    });

    // Generate QR code image (data URL)
    const qrDataUrl = await QRCode.toDataURL(qrToken, { width: 300 });

    ApiResponse.success(res, 201, 'Attendance session created', {
      session,
      qrCode: qrDataUrl,
      expiresAt,
    });
  }),

  // POST /api/v1/attendance/mark — student only
  markAttendance: asyncHandler(async (req: Request, res: Response) => {
    const { qrToken } = req.body as { qrToken: string };
    if (!qrToken) throw new ApiError(400, 'qrToken is required.');

    // Verify token
    let payload: { courseId: string };
    try {
      payload = jwt.verify(qrToken, env.JWT_ACCESS_SECRET) as { courseId: string };
    } catch {
      throw new ApiError(400, 'Invalid or expired QR token.');
    }

    // Find the session
    const session = await AttendanceSession.findOne({ qrToken, expiresAt: { $gt: new Date() } });
    if (!session) throw new ApiError(400, 'QR token has expired or session not found.');

    // Check enrollment
    const enrollment = await Enrollment.findOne({
      userId: req.user!.userId,
      courseId: payload.courseId,
      status: { $in: ['active', 'completed'] },
    });
    if (!enrollment) throw new ApiError(403, 'You are not enrolled in this course.');

    // Prevent duplicate mark
    const studentId = new Types.ObjectId(req.user!.userId);
    const alreadyMarked = session.records.some(r => r.studentId.equals(studentId));
    if (alreadyMarked) throw new ApiError(409, 'Attendance already marked for this session.');

    session.records.push({ studentId, markedAt: new Date() });
    await session.save();

    ApiResponse.success(res, 200, 'Attendance marked successfully');
  }),

  // GET /api/v1/attendance/:courseId — teacher only
  getCourseAttendance: asyncHandler(async (req: Request, res: Response) => {
    const { courseId } = req.params;
    const sessions = await AttendanceSession.find({ courseId: new Types.ObjectId(courseId) })
      .sort({ createdAt: -1 });

    const enrollments = await Enrollment.find({ courseId }).select('userId');
    const totalStudents = enrollments.length;
    const studentIds = enrollments.map(e => e.userId.toString());

    // Per-student attendance percentage
    const attendanceMap: Record<string, number> = {};
    for (const session of sessions) {
      for (const record of session.records) {
        const sid = record.studentId.toString();
        attendanceMap[sid] = (attendanceMap[sid] ?? 0) + 1;
      }
    }

    const studentStats = await Promise.all(
      studentIds.map(async (sid) => {
        const user = await User.findById(sid).select('name avatar');
        return {
          studentId: sid,
          name: user?.name,
          avatar: user?.avatar,
          sessionsAttended: attendanceMap[sid] ?? 0,
          totalSessions: sessions.length,
          attendancePercentage: sessions.length > 0
            ? Math.round(((attendanceMap[sid] ?? 0) / sessions.length) * 100)
            : 0,
        };
      }),
    );

    ApiResponse.success(res, 200, 'Attendance fetched', {
      totalSessions: sessions.length,
      totalStudents,
      sessions: sessions.map(s => ({
        id: s._id,
        title: s.sessionTitle,
        date: s.createdAt,
        presentCount: s.records.length,
      })),
      studentStats,
    });
  }),

  // GET /api/v1/attendance/:courseId/export — teacher only
  exportAttendance: asyncHandler(async (req: Request, res: Response) => {
    const { courseId } = req.params;
    const sessions = await AttendanceSession.find({ courseId: new Types.ObjectId(courseId) })
      .sort({ createdAt: 1 });

    const enrollments = await Enrollment.find({ courseId }).select('userId');
    const studentIds = enrollments.map(e => e.userId.toString());

    const students = await User.find({ _id: { $in: studentIds } }).select('name email');

    const headers = ['Student Name', 'Email', ...sessions.map((s, i) => s.sessionTitle ?? `Session ${i + 1}`), 'Total', 'Percentage'];

    const rows = students.map(student => {
      const sid = student._id.toString();
      const sessionMarks = sessions.map(s =>
        s.records.some(r => r.studentId.toString() === sid) ? '1' : '0',
      );
      const total = sessionMarks.filter(m => m === '1').length;
      const pct = sessions.length > 0 ? Math.round((total / sessions.length) * 100) : 0;
      return [student.name, student.email, ...sessionMarks, String(total), `${pct}%`];
    });

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-${courseId}.csv"`);
    res.status(200).send(csv);
  }),
};
