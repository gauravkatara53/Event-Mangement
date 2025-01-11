import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { Event } from '../models/Event.js';
import { eventStatusQueue } from '../queues/EventStatusQueue.js';
import moment from 'moment-timezone';

const createAnEvent = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    category,
    location, // Expect location as an object with type, coordinates, and address
    startDate,
    endDate,
    status,
    price,
    availableTickets,
  } = req.body;

  // Convert startDate and endDate from IST to UTC
  const startDateUtc = moment.tz(startDate, 'Asia/Kolkata').utc().toISOString();
  const endDateUtc = moment.tz(endDate, 'Asia/Kolkata').utc().toISOString();

  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;
  if (!thumbnailLocalPath) {
    throw new ApiError(400, 'Thumbnail is required.');
  }

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
  if (!thumbnail) {
    throw new ApiError(500, 'Failed to upload thumbnail.');
  }

  let parsedLocation; // Declare the variable

  if (typeof location === 'string') {
    try {
      parsedLocation = JSON.parse(location); // Parse location from string
    } catch (error) {
      throw new ApiError(400, 'Invalid location format.');
    }
  } else {
    parsedLocation = location; // If already an object, assign directly
  }

  // Validate parsedLocation
  if (
    !parsedLocation ||
    !parsedLocation.coordinates ||
    !Array.isArray(parsedLocation.coordinates) ||
    parsedLocation.coordinates.length !== 2 ||
    parsedLocation.coordinates.some((coord) => typeof coord !== 'number')
  ) {
    throw new ApiError(
      400,
      'Invalid location.coordinates. Must be an array of two numbers.'
    );
  }

  if (!parsedLocation.address || typeof parsedLocation.address !== 'string') {
    throw new ApiError(400, 'Invalid or missing location.address.');
  }

  // Use parsedLocation for event creation
  const event = await Event.create({
    title,
    description,
    category,
    location: {
      type: 'Point',
      coordinates: parsedLocation.coordinates,
      address: parsedLocation.address,
    },
    startDate: startDateUtc,
    endDate: endDateUtc,
    status,
    price,
    availableTickets,
    thumbnail: thumbnail.url,
    organizer: req.user._id,
  });

  // Populate the 'organizer' field after the event is created
  const createdEvent = await Event.findById(event._id).populate(
    'organizer',
    'name email avatar role'
  ); // Populate the 'organizer' field
  if (!createdEvent) {
    throw new ApiError(500, 'Error creating event.');
  }

  // Add a job to the queue to update event status when the event start date is reached
  const startDateTime = moment.tz(startDate, 'Asia/Kolkata');
  const delay = startDateTime.diff(moment()); // Delay in milliseconds

  // Add the job with a delay
  await eventStatusQueue.add(
    { eventId: event._id },
    { delay: delay > 0 ? delay : 0 } // Ensure the delay is non-negative
  );

  return res
    .status(201)
    .json(new ApiResponse(201, createdEvent, 'Event successfully created.'));
});

const getAllEevents = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    category,
    status,
  } = req.query;

  // Construct filters based on query parameters
  const filters = {};
  if (category) filters.category = category;
  if (status) filters.status = status;

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Fetch events with filters, sorting, and pagination
  const events = await Event.find(filters)
    .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
    .skip(skip)
    .limit(Number(limit))
    .populate('organizer', 'name email avatar role'); // Populate organizer field for additional details

  // Fetch total count for pagination metadata
  const totalEvents = await Event.countDocuments(filters);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        events,
        totalEvents,
        currentPage: page,
        totalPages: Math.ceil(totalEvents / limit),
      },
      'Events fetched successfully.'
    )
  );
});

const getDetailSelectedEvents = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate ID
  if (!id) {
    throw new ApiError(400, 'Event ID is required.');
  }

  // Find the event by ID
  const event = await Event.findById(id).populate(
    'organizer',
    'name email avatar role'
  );

  // If no event is found, throw an error
  if (!event) {
    throw new ApiError(404, 'Event not found.');
  }

  // Return the event details
  return res
    .status(200)
    .json(new ApiResponse(200, event, 'Event details fetched successfully.'));
});

const UpdateEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, 'Event ID is required.');
  }

  const event = await Event.findById(id);
  if (!event) {
    throw new ApiError(404, 'Event not found.');
  }

  // Get the current time in IST (Indian Standard Time)
  const currentDateTimeIST = moment().tz('Asia/Kolkata');

  // Convert the event startDate to IST
  const eventStartDateIST = moment(event.startDate).tz('Asia/Kolkata');

  // If the event has already started, prevent updating the status
  if (eventStartDateIST <= currentDateTimeIST && req.body.status) {
    throw new ApiError(400, 'Cannot update status once the event has started.');
  }

  const updateFields = {};
  const allowedFields = [
    'title',
    'description',
    'category',
    'location', // Allow location updates but validate first
    'startDate',
    'endDate',
    'price',
    'availableTickets',
    'status', // Allow status updates but validate first
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updateFields[field] = req.body[field];
    }
  });

  // Validate and parse location if it's being updated
  if (updateFields.location) {
    let parsedLocation;

    if (typeof updateFields.location === 'string') {
      try {
        parsedLocation = JSON.parse(updateFields.location); // Parse location from string
      } catch (error) {
        throw new ApiError(400, 'Invalid location format.');
      }
    } else {
      parsedLocation = updateFields.location; // If already an object, assign directly
    }

    // Validate parsedLocation
    if (
      !parsedLocation ||
      !parsedLocation.coordinates ||
      !Array.isArray(parsedLocation.coordinates) ||
      parsedLocation.coordinates.length !== 2 ||
      parsedLocation.coordinates.some((coord) => typeof coord !== 'number')
    ) {
      throw new ApiError(
        400,
        'Invalid location.coordinates. Must be an array of two numbers.'
      );
    }

    if (!parsedLocation.address || typeof parsedLocation.address !== 'string') {
      throw new ApiError(400, 'Invalid or missing location.address.');
    }

    // Assign parsedLocation to updateFields
    updateFields.location = {
      type: 'Point',
      coordinates: parsedLocation.coordinates,
      address: parsedLocation.address,
    };
  }

  if (Object.keys(updateFields).length === 0) {
    throw new ApiError(400, 'At least one field is required to update.');
  }

  const updatedEvent = await Event.findByIdAndUpdate(
    id,
    { $set: updateFields },
    { new: true, runValidators: true }
  );

  if (!updatedEvent) {
    throw new ApiError(404, 'Event not found.');
  }

  // Re-schedule the event status update job if the start date changes
  if (updateFields.startDate) {
    const startDateTime = moment(updatedEvent.startDate).tz('Asia/Kolkata');
    const delay = startDateTime.diff(moment()); // Get the delay in milliseconds

    await eventStatusQueue.add(
      { eventId: updatedEvent._id },
      { delay: delay > 0 ? delay : 0 }
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedEvent, 'Event details updated successfully.')
    );
});

const deleteEvent = asyncHandler(async (req, res) => {
  const { id } = req.params; // Extract event ID from URL parameters

  // Check if ID is provided
  if (!id) {
    throw new ApiError(400, 'Event ID is required.');
  }

  // Find the event by ID and delete it
  const deletedEvent = await Event.findByIdAndDelete(id);

  // If the event is not found, return an error
  if (!deletedEvent) {
    throw new ApiError(404, 'Event not found.');
  }

  // Return a success response
  return res
    .status(200)
    .json(new ApiResponse(200, deletedEvent, 'Event deleted successfully.'));
});
// In your event update logic

export {
  createAnEvent,
  getAllEevents,
  getDetailSelectedEvents,
  UpdateEvent,
  deleteEvent,
};
