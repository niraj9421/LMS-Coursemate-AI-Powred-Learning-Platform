
import { v2 as cloudinary } from 'cloudinary';
import { UploadApiOptions, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

// ─── Configuration ────────────────────────────────────────────────────────────

const REQUIRED_ENV_VARS = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
] as const;

/**
 * Validates that all required Cloudinary environment variables are present
 * and configures the Cloudinary SDK.
 *
 * Called once at module load time so that any missing config is caught early
 * (before the first upload attempt).
 */
function initCloudinary(): void {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `[cloudinary] Missing required environment variable(s): ${missing.join(', ')}. ` +
        'Please add them to your .env file (see .env.example).',
    );
  }

  cloudinary.config({
    cloud_name: process.env['CLOUDINARY_CLOUD_NAME'],
    api_key: process.env['CLOUDINARY_API_KEY'],
    api_secret: process.env['CLOUDINARY_API_SECRET'],
    secure: true,
  });
}

initCloudinary();

// ─── Internal helper ──────────────────────────────────────────────────────────

/**
 * Wraps `cloudinary.uploader.upload_stream` in a Promise so callers can
 * `await` a Buffer upload without dealing with Node.js streams directly.
 */
function uploadBufferToCloudinary(
  buffer: Buffer,
  options: UploadApiOptions,
): Promise<UploadApiResponse> {
  return new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) {
          reject(new Error(`[cloudinary] Upload failed: ${error.message}`));
          return;
        }
        if (!result) {
          reject(new Error('[cloudinary] Upload returned no result.'));
          return;
        }
        resolve(result);
      },
    );

    // Pipe the buffer into the upload stream
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(stream);
  });
}

// ─── Public upload functions ──────────────────────────────────────────────────

/**
 * Upload an image buffer to Cloudinary.
 *
 * - Folder: `lms/images`
 * - Quality: `auto`
 * - Format: `auto`
 *
 * @param buffer  Raw image data
 * @param options Additional Cloudinary upload options (merged with defaults)
 * @returns       Cloudinary upload result containing `secure_url` and `public_id`
 */
export async function uploadImage(
  buffer: Buffer,
  options: UploadApiOptions = {},
): Promise<UploadApiResponse> {
  return uploadBufferToCloudinary(buffer, {
    folder: 'lms/images',
    quality: 'auto',
    fetch_format: 'auto',
    resource_type: 'image',
    ...options,
  });
}

/**
 * Upload a video buffer to Cloudinary.
 *
 * - Folder: `lms/videos`
 * - Resource type: `video`
 * - Eager transformation: HLS adaptive bitrate streaming
 *
 * @param buffer  Raw video data
 * @param options Additional Cloudinary upload options (merged with defaults)
 * @returns       Cloudinary upload result containing `secure_url` and `public_id`
 */
export async function uploadVideo(
  buffer: Buffer,
  options: UploadApiOptions = {},
): Promise<UploadApiResponse> {
  return uploadBufferToCloudinary(buffer, {
    folder: 'lms/videos',
    resource_type: 'video',
    eager: [
      {
        streaming_profile: 'hd',
        format: 'm3u8',
      },
    ],
    eager_async: true,
    ...options,
  });
}

/**
 * Upload a document buffer to Cloudinary.
 *
 * - Folder: `lms/documents`
 * - Resource type: `raw` (preserves original file format)
 *
 * @param buffer   Raw document data
 * @param filename Original filename (used as the public_id base)
 * @param options  Additional Cloudinary upload options (merged with defaults)
 * @returns        Cloudinary upload result containing `secure_url` and `public_id`
 */
export async function uploadDocument(
  buffer: Buffer,
  filename: string,
  options: UploadApiOptions = {},
): Promise<UploadApiResponse> {
  return uploadBufferToCloudinary(buffer, {
    folder: 'lms/documents',
    resource_type: 'raw',
    public_id: filename,
    ...options,
  });
}

/**
 * Delete a media asset from Cloudinary by its public ID.
 *
 * @param publicId     The Cloudinary public ID of the asset to delete
 * @param resourceType The resource type: `'image'` (default), `'video'`, or `'raw'`
 * @returns            Cloudinary deletion result
 */
export async function deleteMedia(
  publicId: string,
  resourceType: 'image' | 'video' | 'raw' = 'image',
): Promise<{ result: string }> {
  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
  });
  return result as { result: string };
}

// Re-export the configured instance for advanced use cases
export { cloudinary };
