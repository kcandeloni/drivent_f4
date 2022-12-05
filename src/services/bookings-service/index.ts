import bookingRepositer from "@/repositories/booking-repository";
import enrollmentRepository from "@/repositories/enrollment-repository";
import ticketRepository from "@/repositories/ticket-repository";
import { notFoundError, unauthorizedError } from "@/errors";

async function validateRoom(userId: number, roomId: number) {
  const room = await bookingRepositer.findRooms(roomId);

  if (!room) {
    throw notFoundError();
  }
  const availability = await bookingRepositer.availabilityRoom(roomId);
  if(room.capacity <= availability.length) {
    throw unauthorizedError();
  }
 
  const enrollment = await enrollmentRepository.findWithAddressByUserId(userId);
  if (!enrollment) {
    throw unauthorizedError();
  }
  const ticket = await ticketRepository.findTicketByEnrollmentId(enrollment.id);

  if (!ticket || ticket.status === "RESERVED" || ticket.TicketType.isRemote || !ticket.TicketType.includesHotel) {
    throw unauthorizedError();
  }
}

async function getBooking(userId: number) {
  const booking = await bookingRepositer.findBooking(userId);
  if (!booking) {
    throw notFoundError();
  }
  return booking;
}

async function createBooking(userId: number, roomId: number) {
  await validateRoom(userId, roomId);
  const booking = await bookingRepositer.createBooking(userId, roomId);
  return booking.id;
}

async function updateBooking(userId: number, roomId: number, bookingId: number) {
  await validateRoom(userId, roomId);
  const booking = await bookingRepositer.findBooking(userId);
  if(!booking || bookingId !== booking.id) {
    throw unauthorizedError();
  }

  await bookingRepositer.updateBooking(booking.id, roomId);

  return booking.id;
}

const bookingService = {
  getBooking,
  createBooking,
  updateBooking,
};

export default bookingService;
