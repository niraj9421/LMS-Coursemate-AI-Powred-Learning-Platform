import { Schema, model, Document, Types } from 'mongoose';

// ─── AttendanceRecord sub-document ───────────────────────────────────────────

export interface IAttendanceRecord {
  studentId: Types.ObjectId;
  markedAt: Date;
}

// ─── AttendanceSession ────────────────────────────────────────────────────────

export interface IAttendanceSession extends Document {
  courseId: Types.ObjectId;
  teacherId: Types.ObjectId;
  sessionTitle?: string;
  qrToken: string;          // signed JWT used in QR code
  expiresAt: Date;          // QR token expiry (15 min from creation)
  records: IAttendanceRecord[];
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSessionSchema = new Schema<IAttendanceSession>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sessionTitle: String,
    qrToken: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    records: [
      {
        studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        markedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

attendanceSessionSchema.index({ courseId: 1, createdAt: -1 });
attendanceSessionSchema.index({ teacherId: 1 });
// TTL: auto-expire QR tokens after 24 hours (records are kept, only for cleanup)
attendanceSessionSchema.index({ expiresAt: 1 });

export const AttendanceSession = model<IAttendanceSession>('AttendanceSession', attendanceSessionSchema);
