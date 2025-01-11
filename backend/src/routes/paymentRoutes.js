import { Router } from 'express';
import { upload } from '../middlewares/multer.js';
import { verifyJWT } from '../middlewares/authMiddleware.js';
import { verifyAdmin } from '../middlewares/adminMiddleware.js';
import {
  createPayment,
  verifyPayment,
} from '../controllers/paymentController.js';

const router = Router();

router.route('/create').post(verifyJWT, createPayment);
router.route('/verify').post(verifyJWT, verifyAdmin, verifyPayment);

export default router;
