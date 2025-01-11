import { Router } from 'express';
import {
  bookTicket,
  getAllTicketOfUser,
} from '../controllers/bookingController.js';
import { verifyJWT } from '../middlewares/authMiddleware.js';
import { verifyAdmin } from '../middlewares/adminMiddleware.js';

const router = Router();

router.route('/book-ticket/:id').post(verifyJWT, bookTicket);
router.route('/get-all-ticket').get(verifyJWT, getAllTicketOfUser);
router
  .route('/get-all-event-ticket/:id')
  .get(verifyJWT, verifyAdmin, getAllTicketOfUser);

export default router;
