import mongoose from 'mongoose';
import validator from 'validator';
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2';

// Define Review Schema
const ReviewSchema = new mongoose.Schema(
  {
    comment: {
      type: String,
      required: [true, 'Comment is required'],
      trim: true,
      maxlength: [500, 'Comment must not exceed 500 characters'],
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating must not exceed 5'],
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be an integer',
      },
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event ID is required'],
      index: true,
    },
  },
  { timestamps: true } // Ensure timestamps are correctly defined
);

// Plugins
ReviewSchema.plugin(mongooseAggregatePaginate);

// Static Methods for Aggregation (if needed for future use)
ReviewSchema.statics.aggregateReviews = function (filter) {
  return this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$eventId',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
      },
    },
  ]);
};

// Pre-save hook to sanitize data if needed (example: trimming comments)
ReviewSchema.pre('save', function (next) {
  if (this.comment) {
    this.comment = this.comment.trim();
  }
  next();
});

// Create Review model
export const Review = mongoose.model('Review', ReviewSchema);
