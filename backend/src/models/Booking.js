import mongoose from 'mongoose';
import validator from 'validator';

const bookingSchema = new mongoose.Schema(
  {
    bookingDetails: [
      {
        _id: {
          type: mongoose.Schema.Types.ObjectId,
          default: () => new mongoose.Types.ObjectId(),
        },
        name: {
          type: String,
          required: true,
          trim: true,
          minlength: 1,
          maxlength: 100,
        },
        email: {
          type: String,
          required: true,
          trim: true,
          lowercase: true,
          validate: [validator.isEmail, 'Invalid email address'],
        },
        phone: {
          type: String,
          required: true,
          validate: {
            validator: (v) => /^[0-9]{10}$/.test(v),
            message: 'Phone number must be 10 digits',
          },
        },
      },
    ],
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    ticketPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, max: 10 },
    totalPrice: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ['Net Banking', 'Debit card', 'Credit card', 'UPI'],
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Completed', 'Failed'],
      default: 'Pending',
    },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Failed', 'Cancelled'],
      default: 'Pending',
    },
    paymentDate: { type: Date, default: Date.now },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    cancellationReason: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

bookingSchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate();
  if (update.paymentStatus) {
    if (update.paymentStatus === 'Completed') {
      this.setUpdate({ ...update, status: 'Confirmed' });
    } else if (update.paymentStatus === 'Failed') {
      this.setUpdate({ ...update, status: 'Failed' });
    } else {
      this.setUpdate({ ...update, status: 'Pending' });
    }
  }
  next();
});


export const Booking = mongoose.model('Booking', bookingSchema);
