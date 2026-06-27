import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import { ApiError } from '../utils/apiError';

// ─── Allowed MIME types ───────────────────────────────────────────────────────

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
const DOCUMENT_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
];

// ─── File filter factories ────────────────────────────────────────────────────

function makeFilter(allowed: string[]) {
  return (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ApiError(415, `Unsupported file type: ${file.mimetype}. Allowed: ${allowed.join(', ')}`));
    }
  };
}

// ─── Multer instances ─────────────────────────────────────────────────────────

/** Avatar / thumbnail image upload — max 5 MB */
export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: makeFilter(IMAGE_MIMES),
});

/** Video upload — max 500 MB */
export const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: makeFilter(VIDEO_MIMES),
});

/** Document upload (PDF/DOCX/PPTX/ZIP) — max 50 MB */
export const uploadDocument = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: makeFilter(DOCUMENT_MIMES),
});

/** Assignment submission — PDF/DOCX/ZIP max 10 MB */
export const uploadSubmission = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: makeFilter([...DOCUMENT_MIMES]),
});

// ─── Resume-specific upload — maximally permissive, accepts any file ──────────
export const uploadResume = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  // No fileFilter — accept everything, validate in controller
});
export const uploadCourseFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: makeFilter([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ]),
});
