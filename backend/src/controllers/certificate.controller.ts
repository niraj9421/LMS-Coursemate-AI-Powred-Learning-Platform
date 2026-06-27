import { Request, Response } from 'express';
import { CertificateService } from '../services/certificate.service';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const CertificateController = {

  // GET /api/v1/certificates/verify/:id — public
  verifyCertificate: asyncHandler(async (req: Request, res: Response) => {
    const cert = await CertificateService.verifyCertificate(req.params['id']!);
    ApiResponse.success(res, 200, 'Certificate verified', cert);
  }),

  // GET /api/v1/certificates/:id/download — authenticated
  downloadCertificate: asyncHandler(async (req: Request, res: Response) => {
    const result = await CertificateService.getCertificateDownload(
      req.params['id']!,
      req.user!.userId,
    );
    ApiResponse.success(res, 200, 'Certificate download URL', result);
  }),
};
