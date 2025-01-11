import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Review } from '../models/Reviews.js';

const createReview = asyncHandler(async (req, res) => {
  try {
    const { id: eventId } = req.params; // Fixed typo `prams` to `params`
    const { comment, rating } = req.body;

    // Validation - Ensure all required fields are present
    if (!comment?.trim() || !rating) {
      throw new ApiError(400, 'All fields are required');
    }

    // Create a review and store it in the database
    const review = await Review.create({
      comment,
      rating,
      userId: req.user._id,
      eventId,
    });

    // Populate fields in the created review
    const createdReview = await Review.findById(review._id)
      .populate('eventId', 'title date location price') // Removed duplicate fields
      .populate('userId', 'name email');

    return res.status(200).json(
      new ApiResponse(200, 'Review created successfully', {
        review: createdReview, // Updated to return the populated review
      })
    );
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(
        new ApiResponse(
          error.statusCode || 500,
          error.message || 'Internal Server Error'
        )
      );
  }
});

const getAllReview = asyncHandler(async (req, res) => {
  const { id: eventId } = req.params; // Extract eventId from URL parameters
  const { page = 1, limit = 10, startDate, endDate } = req.query;

  // Validate that eventId exists
  if (!eventId) {
    throw new ApiError(400, 'Event ID is required.');
  }

  try {
    // Convert page and limit to integers
    const pageNum = parseInt(page, 10);
    const pageLimit = parseInt(limit, 10);

    // Calculate skip value based on page and limit
    const skip = (pageNum - 1) * pageLimit;

    // Build the filter object for reviews
    const filter = { eventId };

    // Add date range filter if both startDate and endDate are provided
    if (startDate && endDate) {
      filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
      console.log('Applying date filter:', filter.createdAt);
    }

    // Query the Review collection with pagination and filters
    const reviews = await Review.find(filter)
      .populate('eventId', 'title date location price') // Populate event details like title, date, location, price
      .populate('userId', 'name email') // Populate user details like name and email
      .sort({ createdAt: -1 }) // Sort reviews by creation date in descending order
      .skip(skip) // Skip records for pagination
      .limit(pageLimit); // Limit the number of records per page

    // Log the number of reviews retrieved
    console.log(`Found ${reviews.length} reviews for event ID: ${eventId}`);

    // Get the total count of reviews for pagination information
    const totalReviews = await Review.countDocuments(filter);
    console.log(
      `Total reviews count for event ID: ${eventId} is ${totalReviews}`
    );

    if (reviews.length === 0) {
      return res
        .status(200)
        .json(new ApiResponse(200, 'No reviews found for this event.'));
    }

    // Calculate total pages for pagination
    const totalPages = Math.ceil(totalReviews / pageLimit);

    // Return paginated response with filtered reviews
    return res.status(200).json(
      new ApiResponse(200, 'Reviews retrieved successfully for the event.', {
        reviews,
        pagination: {
          page: pageNum,
          totalPages,
          totalReviews,
          limit: pageLimit,
        },
      })
    );
  } catch (error) {
    console.error('Error retrieving event reviews:', error);
    return res
      .status(error.statusCode || 500)
      .json(new ApiResponse(error.statusCode || 500, error.message));
  }
});

const getAllUserReview = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { page = 1, limit = 10, startDate, endDate } = req.query;

  // Validate userId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json(new ApiResponse(400, 'Invalid User ID.'));
  }

  try {
    // Pagination setup
    const pageNum = parseInt(page, 10) || 1;
    const pageLimit = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * pageLimit;

    // Filter for reviews
    const filter = { userId }; // All reviews by this user
    if (startDate && endDate) {
      filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    console.log('Filter:', filter); // Debugging log

    // Fetch reviews
    const reviews = await Review.find(filter)
      .populate('eventId', 'title date location price') // Populating event details
      .populate('userId', 'name email') // Populating user details
      .sort({ createdAt: -1 }) // Sort by newest first
      .skip(skip)
      .limit(pageLimit);

    // Total review count
    const totalReviews = await Review.countDocuments(filter);

    // Handle no reviews case
    if (!reviews.length) {
      return res.status(200).json(
        new ApiResponse(200, 'No reviews found for this user.', {
          reviews: [],
          pagination: {
            page: pageNum,
            totalPages: 0,
            totalReviews: 0,
            limit: pageLimit,
          },
        })
      );
    }

    // Calculate total pages
    const totalPages = Math.ceil(totalReviews / pageLimit);

    // Success response
    return res.status(200).json(
      new ApiResponse(200, 'Reviews retrieved successfully.', {
        reviews,
        pagination: {
          page: pageNum,
          totalPages,
          totalReviews,
          limit: pageLimit,
        },
      })
    );
  } catch (error) {
    console.error('Error retrieving user reviews:', error);
    return res
      .status(error.statusCode || 500)
      .json(new ApiResponse(error.statusCode || 500, error.message));
  }
});

export { createReview, getAllReview, getAllUserReview };
