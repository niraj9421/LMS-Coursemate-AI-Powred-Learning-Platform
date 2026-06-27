import { v4 as uuidv4 } from 'uuid';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import { Certificate } from '../models/Certificate';
import { Enrollment } from '../models/Enrollment';
import { Course } from '../models/Course';
import { User } from '../models/User';
import { uploadDocument, uploadImage } from '../config/cloudinary';
import { ApiError } from '../utils/apiError';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export const CertificateService = {

  /**
   * Task 8.1 + 8.2 — Generate a certificate PDF with embedded QR code.
   * Called automatically when enrollment progress reaches 100%.
   */
  async generateCertificate(userId: string, courseId: string) {
    // 1. Validate enrollment is 100% complete
    const enrollment = await Enrollment.findOne({ userId, courseId });
    if (!enrollment || enrollment.progress < 100) {
      throw new ApiError(400, 'Course must be 100% complete to generate a certificate.');
    }

    // 2. Check course has certificate enabled
    const course = await Course.findById(courseId).populate('instructor', 'name');
    if (!course) throw new ApiError(404, 'Course not found.');
    if (!course.certificate) {
      throw new ApiError(400, 'This course does not offer a certificate.');
    }

    // 3. Check no existing certificate
    const existing = await Certificate.findOne({ userId, courseId });
    if (existing) {
      logger.info(`[certificate] Certificate already exists for user ${userId} course ${courseId}`);
      return existing;
    }

    // 4. Fetch student info
    const student = await User.findById(userId);
    if (!student) throw new ApiError(404, 'User not found.');

    const instructorName = (course.instructor as unknown as { name: string })?.name ?? 'Instructor';
    const certificateId = uuidv4();
    const verifyUrl = `${env.FRONTEND_URL}/certificates/verify/${certificateId}`;

    // 5. Generate QR code as PNG buffer (Task 8.2)
    const qrBuffer = await QRCode.toBuffer(verifyUrl, { width: 150, margin: 1 });

    // 6. Build PDF with pdf-lib (Task 8.1)
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([842, 595]); // A4 landscape
    const { width, height } = page.getSize();

    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Background gradient simulation — light gold border
    page.drawRectangle({
      x: 20, y: 20,
      width: width - 40, height: height - 40,
      borderColor: rgb(0.8, 0.7, 0.2),
      borderWidth: 4,
    });

    // Title
    page.drawText('Certificate of Completion', {
      x: width / 2 - 180, y: height - 100,
      size: 32, font: boldFont, color: rgb(0.1, 0.1, 0.4),
    });

    // Subtitle
    page.drawText('This is to certify that', {
      x: width / 2 - 90, y: height - 160,
      size: 16, font: regularFont, color: rgb(0.3, 0.3, 0.3),
    });

    // Student name
    page.drawText(student.name, {
      x: width / 2 - (student.name.length * 11), y: height - 210,
      size: 28, font: boldFont, color: rgb(0.05, 0.05, 0.35),
    });

    // Course completion text
    page.drawText('has successfully completed the course', {
      x: width / 2 - 140, y: height - 260,
      size: 16, font: regularFont, color: rgb(0.3, 0.3, 0.3),
    });

    // Course name
    page.drawText(course.title, {
      x: width / 2 - (course.title.length * 7), y: height - 305,
      size: 22, font: boldFont, color: rgb(0.1, 0.1, 0.4),
    });

    // Issue date
    const issueDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    page.drawText(`Issued on: ${issueDate}`, {
      x: 60, y: 100,
      size: 12, font: regularFont, color: rgb(0.4, 0.4, 0.4),
    });

    // Instructor
    page.drawText(`Instructor: ${instructorName}`, {
      x: 60, y: 75,
      size: 12, font: regularFont, color: rgb(0.4, 0.4, 0.4),
    });

    // Certificate ID
    page.drawText(`Certificate ID: ${certificateId}`, {
      x: 60, y: 50,
      size: 10, font: regularFont, color: rgb(0.6, 0.6, 0.6),
    });

    // Embed QR code image
    const qrImage = await pdfDoc.embedPng(qrBuffer);
    page.drawImage(qrImage, {
      x: width - 190, y: 40,
      width: 150, height: 150,
    });

    page.drawText('Scan to verify', {
      x: width - 175, y: 30,
      size: 10, font: regularFont, color: rgb(0.5, 0.5, 0.5),
    });

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    // 7. Upload QR and PDF to Cloudinary
    const [qrResult, pdfResult] = await Promise.all([
      uploadImage(qrBuffer, { folder: 'lms/certificates/qr' }),
      uploadDocument(pdfBuffer, `cert_${certificateId}.pdf`, {
        folder: 'lms/certificates/pdf',
        format: 'pdf',
      }),
    ]);

    // 8. Save certificate record
    const certificate = await Certificate.create({
      uniqueId: certificateId,
      userId,
      courseId,
      courseName: course.title,
      studentName: student.name,
      instructorName,
      issuedAt: new Date(),
      qrCodeUrl: qrResult.secure_url,
      pdfUrl: pdfResult.secure_url,
    });

    // Update enrollment with certificateId
    await Enrollment.findOneAndUpdate({ userId, courseId }, { certificateId: certificate._id });

    logger.info(`[certificate] Generated certificate ${certificateId} for user ${userId} course ${courseId}`);
    return certificate;
  },

  // Task 8.3 — Public verification
  async verifyCertificate(uniqueId: string) {
    const cert = await Certificate.findOne({ uniqueId })
      .populate('userId', 'name avatar')
      .populate('courseId', 'title thumbnail');
    if (!cert) throw new ApiError(404, 'Certificate not found.');
    return cert;
  },

  // Task 8.4 — Download (returns PDF URL)
  async getCertificateDownload(certificateId: string, userId: string) {
    const cert = await Certificate.findById(certificateId);
    if (!cert) throw new ApiError(404, 'Certificate not found.');
    if (cert.userId.toString() !== userId) {
      throw new ApiError(403, 'You do not have permission to download this certificate.');
    }
    return { pdfUrl: cert.pdfUrl };
  },
};
