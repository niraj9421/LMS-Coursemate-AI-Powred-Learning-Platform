import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  await mongoose.connect(process.env['MONGODB_URI']!);
  console.log('DB connected');

  const { User } = await import('../models/User');
  const { Course } = await import('../models/Course');
  const { Enrollment } = await import('../models/Enrollment');
  const { Certificate } = await import('../models/Certificate');
  const { CertificateService } = await import('../services/certificate.service');

  // Find a student
  const student = await User.findOne({ role: 'student' });
  if (!student) { console.log('No student found. Run seed first.'); process.exit(1); }
  console.log('Student:', student._id.toString(), student.name);

  // Find a published course with certificate enabled
  const course = await Course.findOne({ certificate: true, status: 'published' });
  if (!course) { console.log('No published certificate course found.'); process.exit(1); }
  console.log('Course:', course._id.toString(), course.title);

  // Upsert enrollment at 100%
  await Enrollment.findOneAndUpdate(
    { userId: student._id, courseId: course._id },
    { userId: student._id, courseId: course._id, progress: 100, status: 'completed' },
    { upsert: true, new: true },
  );
  console.log('Enrollment set to 100%');

  // Remove existing cert so we can regenerate
  await Certificate.deleteOne({ userId: student._id, courseId: course._id });

  // Generate certificate
  console.log('Generating certificate...');
  const cert = await CertificateService.generateCertificate(
    student._id.toString(),
    course._id.toString(),
  );

  console.log('\n✅ Certificate generated!');
  console.log('  Certificate ID :', cert.uniqueId);
  console.log('  Student        :', cert.studentName);
  console.log('  Course         :', cert.courseName);
  console.log('  Issued         :', cert.issuedAt.toLocaleDateString());
  console.log('  PDF URL        :', cert.pdfUrl);
  console.log('  QR Code URL    :', cert.qrCodeUrl);
  console.log('  Verify URL     :', `${process.env['FRONTEND_URL']}/certificates/verify/${cert.uniqueId}`);
  console.log('\nOpen the PDF URL above in your browser to view the certificate.');

  process.exit(0);
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
