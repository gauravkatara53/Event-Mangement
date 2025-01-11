import Queue from 'bull';
import { Booking } from '../models/Booking.js';
import { Event } from '../models/Event.js';
import { Payment } from '../models/payment.js';

// Initialize the payment queue
const paymentQueue = new Queue('paymentQueue', {
  redis: { host: '127.0.0.1', port: 6379 },
});

// Process payment status update jobs
paymentQueue.process(async (job) => {
  const { bookingId, eventId, quantity, paymentId } = job.data;

  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new Error('Booking not found');

    const payment = await Payment.findById(paymentId);
    if (!payment) throw new Error('Payment not found');

    if (booking.paymentStatus === 'Pending') {
      // Update Booking status to 'Failed'
      await Booking.findByIdAndUpdate(
        bookingId,
        { paymentStatus: 'Failed', status: 'Failed' },
        { new: true }
      );

      // Restore the ticket count in the Event
      await Event.findByIdAndUpdate(
        eventId,
        { $inc: { availableTickets: quantity } },
        { new: true }
      );

      // Update Payment status to 'Failed'
      await Payment.findByIdAndUpdate(
        paymentId,
        { paymentStatus: 'Failed' },
        { new: true }
      );

      console.log(
        `Booking ${bookingId} and Payment ${paymentId} marked as failed`
      );
    }
  } catch (error) {
    console.error(
      `Error processing payment status for booking ${bookingId}:`,
      error
    );
  }
});

export { paymentQueue };
