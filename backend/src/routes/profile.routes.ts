import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth';
import { StudentProfile } from '../models/StudentProfile';
import { ApiResponse } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import { uploadImage } from '../middleware/upload';
import { uploadImage as cloudUpload } from '../config/cloudinary';

const router = Router();

// GET /api/v1/profile
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const profile = await StudentProfile.findOne({ userId: req.user!.userId });
  ApiResponse.success(res, 200, 'Profile fetched', profile ?? {});
}));

// PUT /api/v1/profile
router.put('/', authenticate, asyncHandler(async (req, res) => {
  const profile = await StudentProfile.findOneAndUpdate(
    { userId: req.user!.userId },
    { ...req.body, userId: req.user!.userId },
    { upsert: true, new: true, runValidators: true },
  );
  ApiResponse.success(res, 200, 'Profile updated', profile);
}));

// GET /api/v1/profile/:userId — public
router.get('/:userId', asyncHandler(async (req, res) => {
  const profile = await StudentProfile.findOne({ userId: req.params['userId'], isPublic: true });
  if (!profile) throw new ApiError(404, 'Profile not found or private.');
  ApiResponse.success(res, 200, 'Profile fetched', profile);
}));

// POST /api/v1/profile/photo
router.post('/photo', authenticate, uploadImage.single('photo'), asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No image provided.');
  const result = await cloudUpload(req.file.buffer, { folder: 'lms/profiles', transformation: [{ width: 400, height: 400, crop: 'fill' }] });
  await StudentProfile.findOneAndUpdate({ userId: req.user!.userId }, { profilePhoto: result.secure_url, userId: req.user!.userId }, { upsert: true });
  ApiResponse.success(res, 200, 'Photo updated', { url: result.secure_url });
}));

export default router;
