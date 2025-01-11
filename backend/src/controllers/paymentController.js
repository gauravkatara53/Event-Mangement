import razorpay from '../config/razorpayConfig.js';
import { Payment } from '../models/payment.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import crypto from 'crypto';

const createPayment = asyncHandler(async (req, res) => {
  const { bookingId, amount, paymentMethod } = req.body;

  if (!bookingId || !amount || !paymentMethod) {
    throw new ApiError(400, 'Invalid payment details');
  }

  // Generate Razorpay order
  const options = {
    amount: amount * 100, // Convert to smallest currency unit
    currency: 'INR',
    receipt: `receipt_${Date.now()}`,
  };

  const order = await razorpay.orders.create(options);

  // Create payment record
  const payment = await Payment.create({
    methodDetails: options.receipt,
    amount,
    paymentMethod,
    paymentStatus: 'Pending',
    userId: req.user._id,
    bookingId,
    razorpayOrderId: order.id,
  });

  res.status(201).json({
    success: true,
    message: 'Payment order created',
    data: { orderId: order.id, paymentId: payment._id },
  });
});

const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

  // Verify Razorpay signature
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (generatedSignature !== razorpaySignature) {
    await Payment.findOneAndUpdate(
      { razorpayOrderId },
      { paymentStatus: 'Failed' },
      { new: true }
    );
    throw new ApiError(400, 'Invalid payment signature');
  }

  // Update payment status to completed
  const payment = await Payment.findOneAndUpdate(
    { razorpayOrderId },
    {
      paymentStatus: 'Completed',
      razorpayPaymentId,
      razorpaySignature,
    },
    { new: true }
  );

  // Update booking payment status
  await Booking.findByIdAndUpdate(payment.bookingId, {
    paymentStatus: 'Completed',
  });

  res.status(200).json({
    success: true,
    message: 'Payment verified successfully',
  });
});

const handleRazorpayWebhook = async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];
  const body = JSON.stringify(req.body);

  // Generate expected signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  // Verify signature
  if (signature !== expectedSignature) {
    return res.status(400).json({ message: 'Invalid webhook signature' });
  }

  // Process the webhook payload
  const event = req.body.event;
  console.log('Webhook Event:', event);

  switch (event) {
    case 'payment.captured':
      console.log(
        'Payment captured successfully:',
        req.body.payload.payment.entity
      );
      // Handle payment captured event
      break;
    case 'payment.failed':
      console.log('Payment failed:', req.body.payload.payment.entity);
      // Handle payment failed event
      break;
    // Add more cases for different events as needed
    default:
      console.log('Unhandled event:', event);
  }

  // Respond to Razorpay
  res.status(200).json({ message: 'Webhook processed successfully' });
};

export { createPayment, verifyPayment, handleRazorpayWebhook };
