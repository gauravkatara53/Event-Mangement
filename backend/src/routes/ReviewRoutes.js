import { Router } from 'express';
import {
  createReview,
  getAllReview,
  getAllUserReview,
} from '../controllers/ReviewsController.js';
import { verifyJWT } from '../middlewares/authMiddleware.js';
import { verifyAdmin } from '../middlewares/adminMiddleware.js';

const router = Router();

router.route('/create-review/:id').post(verifyJWT, createReview);
router.route('/all-review/:id').get(verifyJWT, verifyAdmin, getAllReview);
router.route('/user/all-review').get(verifyJWT, getAllUserReview);

export default router;
