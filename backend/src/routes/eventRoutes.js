import { Router } from 'express';
import {
  createAnEvent,
  deleteEvent,
  getAllEevents,
  getDetailSelectedEvents,
  UpdateEvent,
} from '../controllers/eventController.js';
import { upload } from '../middlewares/multer.js';
import { verifyJWT } from '../middlewares/authMiddleware.js';
import { verifyAdmin } from '../middlewares/adminMiddleware.js';

const router = Router();

router.route('/create-event').post(
  verifyJWT,
  verifyAdmin,
  upload.fields([
    {
      name: 'thumbnail', // Corrected the field name here
      maxCount: 1,
    },
  ]),
  createAnEvent
);
router.route('/all-events').get(verifyJWT, getAllEevents);
router.route('/detail/:id').get(verifyJWT, getDetailSelectedEvents);
router.route('/update-event/:id').post(verifyJWT, verifyAdmin, UpdateEvent);
router.route('/delete-event/:id').delete(verifyJWT, verifyAdmin, deleteEvent);

export default router;
