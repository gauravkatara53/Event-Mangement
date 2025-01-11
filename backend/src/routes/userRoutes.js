import { Router } from 'express';
import {
  loginUser,
  registerUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
} from '../controllers/userController.js';
import { upload } from '../middlewares/multer.js';
import { verifyJWT } from '../middlewares/authMiddleware.js';

const router = Router();

router.route('/register').post(
  upload.fields([
    {
      name: 'avatar',
      maxCount: 1,
    },
  ]),
  registerUser
); // No need for `upload` here unless handling file uploads
router.route('/loginUser').post(loginUser);

// Secured routes
router.route('/logout').post(verifyJWT, logoutUser);
router.route('/refresh').post(refreshAccessToken);
router.route('/change-password').post(verifyJWT, changeCurrentPassword);
router.route('/current-user').get(verifyJWT, getCurrentUser);
router.route('/update-account').patch(verifyJWT, updateAccountDetails);

router
  .route('/avatar')
  .patch(verifyJWT, upload.single('avatar'), updateUserAvatar); // Use `.single` for 'avatar' field

export default router;
