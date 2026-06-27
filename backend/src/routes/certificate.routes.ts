import { Router } from 'express';
import { CertificateController } from '../controllers/certificate.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/v1/certificates/verify/:id — public (no auth required)
router.get('/verify/:id', CertificateController.verifyCertificate);

// GET /api/v1/certificates/:id/download — authenticated
router.get('/:id/download', authenticate, CertificateController.downloadCertificate);

export default router;
