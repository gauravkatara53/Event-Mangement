import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cookieParser());

// create routes for the app
import userRouter from './routes/userRoutes.js';
import eventRouter from './routes/eventRoutes.js';
import bookingRouter from './routes/bookingRoutes.js';
import paymentRouter from './routes/paymentRoutes.js';
import webhooksRouter from './routes/webhookRoutes.js';
import reviewwRouter from './routes/ReviewRoutes.js';
// routes declarations for the app
app.use('/api/v1/user', userRouter);
app.use('/api/v1/event', eventRouter);
app.use('/api/v1/booking', bookingRouter);
app.use('/api/v1/payment', paymentRouter);
app.use('/api/v1/webhook', webhooksRouter);
app.use('/api/v1/review', reviewwRouter);

export { app };
