import { Response } from "express";
import { AuthenticatedRequest } from "@/middlewares";
import bookingService from "@/services/bookings-service";
import httpStatus from "http-status";

export async function getBooking(req: AuthenticatedRequest, res: Response) {
  const userId = Number(req.userId);

  try {
    const booking = await bookingService.getBooking(userId);
    return res.status(httpStatus.OK).send(booking);
  } catch (error) {
    if (error.name === "NotFoundError") {
      return res.sendStatus(httpStatus.NOT_FOUND);
    }
    return res.sendStatus(httpStatus.PAYMENT_REQUIRED);
  }
}

export async function createBooking(req: AuthenticatedRequest, res: Response) {
  const { userId } = req;
  const { roomId } = req.body;

  if(Number(roomId) < 1 || isNaN(Number(roomId))) {
    return res.sendStatus(httpStatus.NOT_FOUND);
  }

  try {
    const booking = await bookingService.createBooking(userId, roomId);
    return res.send({ bookingId: booking }).status(httpStatus.OK);
  } catch (error) {
    if (error.name === "NotFoundError") {
      return res.sendStatus(httpStatus.NOT_FOUND);
    }
    if (error.name === "UnauthorizedError") {
      return res.sendStatus(httpStatus.FORBIDDEN);
    }
    return res.sendStatus(httpStatus.BAD_REQUEST);
  }
}

export async function updateBooking(req: AuthenticatedRequest, res: Response) {
  const { userId } = req;
  const { roomId } = req.body;
  const bookingId = Number(req.params.bookingId);

  if(roomId < 1 || isNaN(Number(roomId))) {
    return res.sendStatus(httpStatus.NOT_FOUND);
  }
  
  if(bookingId < 1 || isNaN(Number(bookingId))) {
    return res.sendStatus(httpStatus.FORBIDDEN);
  }

  try {
    const booking = await bookingService.updateBooking(userId, roomId, bookingId);

    return res.send({ bookingId: booking }).status(httpStatus.OK);
  } catch (error) {
    if (error.name === "NotFoundError") {
      return res.sendStatus(httpStatus.NOT_FOUND);
    }
    if (error.name === "UnauthorizedError") {
      return res.sendStatus(httpStatus.FORBIDDEN);
    }
    return res.sendStatus(httpStatus.BAD_REQUEST);
  }
}
