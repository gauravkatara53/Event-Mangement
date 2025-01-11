// eventStatusQueue.js
import Queue from 'bull';
import { Event } from '../models/Event.js';

// Initialize the event status update queue
const eventStatusQueue = new Queue('eventStatusQueue', {
  redis: { host: '127.0.0.1', port: 6379 },
});

// Process event status update jobs
eventStatusQueue.process(async (job) => {
  const { eventId } = job.data;

  try {
    const event = await Event.findById(eventId);
    if (!event) throw new Error('Event not found');

    const currentDate = new Date();
    if (
      new Date(event.startDate) < currentDate &&
      event.status !== 'inactive'
    ) {
      // If the event start date has passed and status is not 'inactive', update the status
      await Event.findByIdAndUpdate(
        eventId,
        { status: 'inactive' },
        { new: true }
      );

      console.log(`Event ${eventId} status updated to 'inactive'`);
    }
  } catch (error) {
    console.error(`Error processing event status for event ${eventId}:`, error);
  }
});

export { eventStatusQueue };
