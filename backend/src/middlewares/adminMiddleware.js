import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { User } from '../models/User.js';

export const verifyAdmin = asyncHandler(async (req, _, next) => {
  try {
    // Extract token from cookies or Authorization header
    const token =
      req.cookies?.accessToken ||
      req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw new ApiError(401, 'Access denied, no token provided.');
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // Fetch user details to confirm admin role
    const user = await User.findById(decoded?._id).select(
      '-password -refreshToken'
    );

    if (!user) {
      throw new ApiError(401, 'Invalid access token.');
    }

    // Check if the user has admin privileges
    if (user.role !== 'admin') {
      throw new ApiError(403, 'Access denied, not an admin.');
    }

    req.user = user; // Attach user details to request
    next(); // Continue to the next middleware
  } catch (error) {
    const message =
      error instanceof jwt.TokenExpiredError
        ? 'Token has expired.'
        : 'Invalid access token.';
    throw new ApiError(400, message);
  }
});
