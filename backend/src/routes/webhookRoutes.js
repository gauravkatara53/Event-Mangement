import express from 'express';

import { handleRazorpayWebhook } from '../controllers/paymentController.js';
import validateWebhook from '../middlewares/validateWebhook.js';

const router = express.Router();

// Webhook route for handling Razorpay events
router.post('/razorpay/webhook', validateWebhook, handleRazorpayWebhook);

export default router;
