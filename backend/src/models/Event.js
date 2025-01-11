import mongoose from 'mongoose';
import validator from 'validator';
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2';

const EventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    location: {
      type: {
        type: String, // Specify the type of location (e.g., Point for GeoJSON)
        enum: ['Point'], // GeoJSON supports different types; here, we use Point
        required: true,
      },
      coordinates: {
        type: [Number], // Array of numbers: [longitude, latitude]
        required: true,
      },
      address: {
        type: String, // Human-readable address
        required: true,
        trim: true,
      },
    },

    startDate: {
      type: Date,
      required: true,
      validate: {
        validator: (v) => v > Date.now(),
        message: (props) => `${props.value} must be in the future.`,
      },
    },
    endDate: {
      type: Date,
      required: true,
    },
    thumbnail: {
      type: String,
      required: true,
      validate: {
        validator: validator.isURL,
        message: (props) => `${props.value} is not a valid URL.`,
      },
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    availableTickets: {
      type: Number,
      required: true,
      min: 0,
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Middleware to validate `endDate` against `startDate`
EventSchema.pre('validate', function (next) {
  if (this.endDate <= this.startDate) {
    return next(
      new Error('Validation failed: End date must be after the start date.')
    );
  }
  next();
});

EventSchema.plugin(mongooseAggregatePaginate);

export const Event = mongoose.model('Event', EventSchema);
