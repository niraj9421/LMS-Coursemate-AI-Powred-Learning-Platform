import { Schema, model, Document, Types } from 'mongoose';

export interface ICertificate extends Document {
  uniqueId: string;       // UUID v4 — used in QR verification URL
  userId: Types.ObjectId;
  courseId: Types.ObjectId;
  courseName: string;
  studentName: string;
  instructorName: string;
  issuedAt: Date;
  qrCodeUrl: string;      // Cloudinary URL for QR image
  pdfUrl: string;         // Cloudinary URL for PDF
  createdAt: Date;
  updatedAt: Date;
}

const certificateSchema = new Schema<ICertificate>(
  {
    uniqueId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    courseName: { type: String, required: true },
    studentName: { type: String, required: true },
    instructorName: { type: String, required: true },
    issuedAt: { type: Date, default: Date.now },
    qrCodeUrl: { type: String, required: true },
    pdfUrl: { type: String, required: true },
  },
  { timestamps: true },
);

// Note: uniqueId unique index already defined inline via `unique: true`
certificateSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export const Certificate = model<ICertificate>('Certificate', certificateSchema);
