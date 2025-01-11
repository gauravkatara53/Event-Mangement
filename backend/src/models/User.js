import mongoose from 'mongoose';
import validator from 'validator'; // For additional validation
import bcrypt from 'bcrypt'; // For password hashing
import jwt from 'jsonwebtoken'; // For generating JWTs

const GENDER_ENUM = ['Male', 'Female', 'Other'];
const STATUS_ENUM = ['normal', 'premium', 'extra premium'];
const ROLE_ENUM = ['user', 'admin'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: validator.isEmail,
        message: (props) => `${props.value} is not a valid email address!`,
      },
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: (v) => /^[0-9]{10}$/.test(v),
        message: (props) =>
          `${props.value} is not a valid phone number! It must be 10 digits.`,
      },
    },
    dob: {
      type: Date,
      validate: {
        validator: (v) => new Date(v) < new Date(),
        message: (props) =>
          `${props.value} is not a valid date of birth! It must be in the past.`,
      },
    },
    gender: { type: String, enum: GENDER_ENUM },
    avatar: { type: String, default: 'default_profile_image.png' },
    address: { type: String, default: 'No address provided.' },
    bio: { type: String, default: 'No bio provided.' },
    status: {
      type: String,
      enum: STATUS_ENUM,
      default: 'normal',
    },
    role: { type: String, enum: ROLE_ENUM, default: 'user' },
    bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
    paymentMethods: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Payment' }],
    // authToken: { type: String }, // Optional
    refreshToken: { type: String },
  },
  { timestamps: true }
);

// Pre-save hook to hash password
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    const saltRounds = 10;
    this.password = await bcrypt.hash(this.password, saltRounds);
  }
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// userSchema.methods.isPasswordCorrect = async function (password) {
//   return await bcrypt.compare(password, this.password);
// };

// Method to generate JWT token
userSchema.methods.generateAccessToken = function () {
  const token = jwt.sign(
    {
      _id: this._id,
      email: this.email,
      name: this.name,
      phone: this.phone,
      role: this.role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY, // e.g., '1h'
    }
  );
  return token;
};

// Method to generate refresh token
userSchema.methods.generateRefreshToken = function () {
  const token = jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY, // e.g., '7d'
    }
  );
  return token;
};

// Export the User model
export const User = mongoose.model('User', userSchema);
