import { prisma } from "@/config";

async function findBooking(userId: number) {
  return prisma.booking.findFirst({
    where: {
      userId
    },
    include: {
      Room: true
    }
  });
}

async function findRooms(roomId: number) {
  return prisma.room.findUnique({
    where: {
      id: roomId,
    }
  });
}

async function availabilityRoom(roomId: number) {
  return prisma.booking.findMany({
    where: {
      roomId
    }
  });
}

async function createBooking(userId: number, roomId: number) {
  return prisma.booking.create({
    data: {
      userId,
      roomId
    }
  });
}

async function updateBooking(bookingId: number, roomId: number) {
  return prisma.booking.update({
    data: {
      roomId
    },
    where: {
      id: bookingId
    }
  });
}

const bookingRepositer = {
  findBooking,
  findRooms,
  availabilityRoom,
  createBooking,
  updateBooking,
};

export default bookingRepositer;
