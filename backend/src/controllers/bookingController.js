import { paymentQueue } from '../queues/paymentQueue.js';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Booking } from '../models/Booking.js';
import { Event } from '../models/Event.js';
import { Payment } from '../models/payment.js';
import razorpay from '../config/razorpayConfig.js';

const bookTicket = asyncHandler(async (req, res) => {
  const { id: eventId } = req.params;
  const { quantity, bookingDetails, paymentMethod } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const event = await Event.findById(eventId).session(session);
    if (!event) throw new ApiError(404, 'Event not found');
    if (event.status === 'inactive') {
      throw new ApiError(400, 'Booking is closed');
    }
    if (event.availableTickets < quantity) {
      throw new ApiError(400, 'Not enough tickets available');
    }

    const ticketPrice = event.price;
    const totalPrice = ticketPrice * quantity;

    const booking = await Booking.create(
      [
        {
          bookingDetails,
          eventId,
          ticketPrice,
          quantity,
          totalPrice,
          paymentStatus: 'Pending',
          status: 'Pending', // Initial status
          userId: req.user._id,
        },
      ],
      { session }
    );

    await Event.findByIdAndUpdate(
      eventId,
      { $inc: { availableTickets: -quantity } },
      { new: true, session }
    );

    const options = {
      amount: totalPrice * 100,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    };

    const razorpayOrder = await razorpay.orders.create(options);

    const payment = await Payment.create(
      [
        {
          methodDetails: options.receipt,
          amount: totalPrice,
          paymentMethod,
          paymentStatus: 'Pending',
          userId: req.user._id,
          bookingId: booking[0]._id,
          razorpayOrderId: razorpayOrder.id,
        },
      ],
      { session }
    );

    // Schedule a job to check and update booking and payment after 5 minutes
    const bookingId = booking[0]._id;
    await paymentQueue.add(
      { bookingId, eventId, quantity, paymentId: payment[0]._id },
      { delay: 300000 } // 5 minutes
    );

    await session.commitTransaction();

    const populatedBooking = await Booking.findById(bookingId)
      .populate('eventId', 'title date location price')
      .populate('userId', 'name email');

    return res.status(201).json(
      new ApiResponse(201, 'Booking successful. Complete payment to confirm.', {
        booking: populatedBooking,
        payment: {
          orderId: razorpayOrder.id,
          paymentId: payment[0]._id,
        },
      })
    );
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

const getAllTicketOfUser = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { page = 1, limit = 10, status, startDate, endDate } = req.query;

  try {
    // Convert page and limit to integers
    const pageNum = parseInt(page, 10);
    const pageLimit = parseInt(limit, 10);

    // Calculate skip value based on page and limit
    const skip = (pageNum - 1) * pageLimit;

    // Build the filter object
    const filter = { userId };

    if (status) {
      filter.status = status; // Filter by booking status
    }

    if (startDate && endDate) {
      filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) }; // Filter by date range
    }

    // Query the Booking collection with pagination and filters
    const bookings = await Booking.find(filter)
      .populate('eventId', 'title date location price') // Populate event details like name, date, location, and price
      .populate('userId', 'name email') // Populate user details like name and email
      .sort({ createdAt: -1 }) // Sort bookings by creation date in descending order
      .skip(skip) // Skip records for pagination
      .limit(pageLimit); // Limit the number of records per page

    // Get the total count of bookings for pagination information
    const totalBookings = await Booking.countDocuments(filter);

    if (!bookings || bookings.length === 0) {
      throw new ApiError(404, 'No bookings found for this user.');
    }

    // Calculate total pages for pagination
    const totalPages = Math.ceil(totalBookings / pageLimit);

    // Return paginated response with filtered bookings
    return res.status(200).json(
      new ApiResponse(200, 'Bookings retrieved successfully.', {
        bookings,
        pagination: {
          page: pageNum,
          totalPages,
          totalBookings,
          limit: pageLimit,
        },
      })
    );
  } catch (error) {
    console.error('Error retrieving user bookings:', error);
    return res
      .status(error.statusCode || 500)
      .json(new ApiResponse(error.statusCode || 500, error.message));
  }
});

const getALLEventBooking = asyncHandler(async (req, res) => {
  const { eventId } = req.params; // Extract eventId from URL parameters
  const { page = 1, limit = 10, status, startDate, endDate } = req.query;

  try {
    // Convert page and limit to integers
    const pageNum = parseInt(page, 10);
    const pageLimit = parseInt(limit, 10);

    // Calculate skip value based on page and limit
    const skip = (pageNum - 1) * pageLimit;

    // Build the filter object
    const filter = { eventId };

    if (status) {
      filter.status = status; // Filter by booking status
    }

    if (startDate && endDate) {
      filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) }; // Filter by date range
    }

    // Query the Booking collection with pagination and filters
    const bookings = await Booking.find(filter)
      .populate('eventId', 'title date location price') // Populate event details like name, date, location, and price
      .populate('userId', 'name email') // Populate user details like name and email
      .sort({ createdAt: -1 }) // Sort bookings by creation date in descending order
      .skip(skip) // Skip records for pagination
      .limit(pageLimit); // Limit the number of records per page

    // Get the total count of bookings for pagination information
    const totalBookings = await Booking.countDocuments(filter);

    if (!bookings || bookings.length === 0) {
      throw new ApiError(404, 'No bookings found for this event.');
    }

    // Calculate total pages for pagination
    const totalPages = Math.ceil(totalBookings / pageLimit);

    // Return paginated response with filtered bookings
    return res.status(200).json(
      new ApiResponse(200, 'Bookings retrieved successfully for the event.', {
        bookings,
        pagination: {
          page: pageNum,
          totalPages,
          totalBookings,
          limit: pageLimit,
        },
      })
    );
  } catch (error) {
    console.error('Error retrieving event bookings:', error);
    return res
      .status(error.statusCode || 500)
      .json(new ApiResponse(error.statusCode || 500, error.message));
  }
});

export { bookTicket, getAllTicketOfUser, getALLEventBooking };
