import app, { init } from "@/app";
import faker from "@faker-js/faker";
import { prisma } from "@/config";
import { TicketStatus } from "@prisma/client";
import httpStatus from "http-status";
import * as jwt from "jsonwebtoken";
import supertest from "supertest";
import {
  createEnrollmentWithAddress,
  createUser,
  createTicket,
  createHotel,
  createRoomWithHotelId,
  createTicketTypeWithHotel,
  createBooking,
} from "../factories";
import { cleanDb, generateValidToken } from "../helpers";

beforeAll(async () => {
  await init();
});

beforeEach(async () => {
  await cleanDb();
});

const server = supertest(app);

describe("GET /booking", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.get("/booking");

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();

    const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe("when token is valid", () => {
    it("should respond with status 200", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const hotel = await createHotel();
      const room = await createRoomWithHotelId(hotel.id);
      const booking = await createBooking(user.id, room.id);

      const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.OK);
      expect(response.body).toEqual(
        {
          id: booking.id,
          userId: user.id,
          roomId: room.id,
          createdAt: booking.createdAt.toISOString(),
          updatedAt: booking.updatedAt.toISOString(),
          Room: {
            id: room.id,
            name: room.name,
            capacity: room.capacity,
            hotelId: room.hotelId,
            createdAt: room.createdAt.toISOString(),
            updatedAt: room.updatedAt.toISOString(),
          },
        },
      );
    });
    it("should respond with status 404 if user not booking", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const hotel = await createHotel();
      await createRoomWithHotelId(hotel.id);

      const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.NOT_FOUND);
    });
  });
});

describe("POST /booking", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.post("/booking");

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();

    const response = await server.post("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.post("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe("when token is valid", () => {
    it("should respond with status 200", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const hotel = await createHotel();
      const room = await createRoomWithHotelId(hotel.id);

      const response = await server.post("/booking").send({ roomId: room.id })
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.OK);
      expect(response.body).toEqual({ bookingId: expect.any(Number) });
    });
   
    it("should respond with status 403 if room unavailable", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const hotel = await createHotel();
      const room = await prisma.room.create({
        data: {
          name: "9 3/4",
          capacity: 0,
          hotelId: hotel.id,
        }
      });

      const response = await server.post("/booking").send({ roomId: room.id })
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 if ticket not PAID", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.RESERVED);
      const hotel = await createHotel();
      const room = await createRoomWithHotelId(hotel.id);

      const response = await server.post("/booking").send({ roomId: room.id })
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });

    describe("roomId invalid", () => {
      it("should respond with status 404 if roomId absent", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await createTicketTypeWithHotel();
        await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
        await createHotel();

        const response = await server.post("/booking").send({ roomId: 1 })
          .set("Authorization", `Bearer ${token}`);

        expect(response.status).toEqual(httpStatus.NOT_FOUND);
      });
      it("should respond with status 404 if roomId invalid", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await createTicketTypeWithHotel();
        await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
        await createHotel();

        const response = await server.post("/booking").send({ roomId: 0 })
          .set("Authorization", `Bearer ${token}`);

        expect(response.status).toEqual(httpStatus.NOT_FOUND);
      });
      it("should respond with status 404 if roomId invalid", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await createTicketTypeWithHotel();
        await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
        await createHotel();

        const response = await server.post("/booking").send({ roomId: -1 })
          .set("Authorization", `Bearer ${token}`);

        expect(response.status).toEqual(httpStatus.NOT_FOUND);
      });
      it("should respond with status 404 if roomId invalid", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await createTicketTypeWithHotel();
        await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
        await createHotel();

        const response = await server.post("/booking").send({ roomId: "a" })
          .set("Authorization", `Bearer ${token}`);

        expect(response.status).toEqual(httpStatus.NOT_FOUND);
      });
      it("should respond with status 404 no roomId", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await createTicketTypeWithHotel();
        await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
        await createHotel();

        const response = await server.post("/booking").send({ })
          .set("Authorization", `Bearer ${token}`);

        expect(response.status).toEqual(httpStatus.NOT_FOUND);
      });
    });
  });
});

describe("PUT /booking", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.put("/booking/1");

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();

    const response = await server.put("/booking/1").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.put("/booking/1").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe("when token is valid", () => {
    it("should respond with status 200", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const hotel = await createHotel();
      const room = await createRoomWithHotelId(hotel.id);
      const booking = await createBooking(user.id, room.id);
      const room2 = await createRoomWithHotelId(hotel.id);

      const response = await server.put(`/booking/${booking.id}`).send({ roomId: room2.id })
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.OK);
      expect(response.body).toEqual({ bookingId: booking.id });
    });
   
    it("should respond with status 403 if room unavailable", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const hotel = await createHotel();
      const room = await createRoomWithHotelId(hotel.id);
      const room2 = await prisma.room.create({
        data: {
          name: "9 3/4",
          capacity: 0,
          hotelId: hotel.id,
        }
      });
      const booking = await createBooking(user.id, room.id);

      const response = await server.put(`/booking/${booking.id}`).send({ roomId: room2.id })
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 if ticket not PAID", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.RESERVED);
      const hotel = await createHotel();
      const room = await createRoomWithHotelId(hotel.id);
      const booking = await createBooking(user.id, room.id);
      const room2 = await createRoomWithHotelId(hotel.id);

      const response = await server.put(`/booking/${booking.id}`).send({ roomId: room2.id })
        .set("Authorization", `Bearer ${token}`);//situação hipotética que não pode ocorrer :(

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });
    describe("bookingId invalid", () => {
      it("should respond with status 403 if bookingId absent", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await createTicketTypeWithHotel();
        await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
        const hotel = await createHotel();
        const room = await createRoomWithHotelId(hotel.id);
        const booking = await createBooking(user.id, room.id);
        const room2 = await createRoomWithHotelId(hotel.id);

        const response = await server.put(`/booking/${booking.id+1}`).send({ roomId: room2.id })
          .set("Authorization", `Bearer ${token}`);

        expect(response.status).toEqual(httpStatus.FORBIDDEN);
      });
      it("should respond with status 403 if bookingId invalid", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await createTicketTypeWithHotel();
        await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
        const hotel = await createHotel();
        const room = await createRoomWithHotelId(hotel.id);
        await createBooking(user.id, room.id);
        const room2 = await createRoomWithHotelId(hotel.id);

        const response = await server.put("/booking/0").send({ roomId: room2.id })
          .set("Authorization", `Bearer ${token}`);

        expect(response.status).toEqual(httpStatus.FORBIDDEN);
      });
      it("should respond with status 403 if bookingId invalid", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await createTicketTypeWithHotel();
        await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
        const hotel = await createHotel();
        const room = await createRoomWithHotelId(hotel.id);
        await createBooking(user.id, room.id);
        const room2 = await createRoomWithHotelId(hotel.id);

        const response = await server.put("/booking/a").send({ roomId: room2.id })
          .set("Authorization", `Bearer ${token}`);

        expect(response.status).toEqual(httpStatus.FORBIDDEN);
      });
      it("should respond with status 403 if bookingId outher user", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await createTicketTypeWithHotel();
        await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
        const hotel = await createHotel();
        const room = await createRoomWithHotelId(hotel.id);
        await createBooking(user.id, room.id);
        const room2 = await createRoomWithHotelId(hotel.id);

        const user2 = await createUser();
        await generateValidToken(user);
        const enrollment2 = await createEnrollmentWithAddress(user2);
        const ticketType2 = await createTicketTypeWithHotel();
        await createTicket(enrollment2.id, ticketType2.id, TicketStatus.PAID);
        const booking2 = await createBooking(user2.id, room.id);

        const response = await server.put(`/booking/${booking2.id}`).send({ roomId: room2.id })
          .set("Authorization", `Bearer ${token}`);

        expect(response.status).toEqual(httpStatus.FORBIDDEN);
      });
    });
    describe("roomId invalid", () => {
      it("should respond with status 404 if roomId absent", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await createTicketTypeWithHotel();
        await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
        const hotel = await createHotel();
        const room = await createRoomWithHotelId(hotel.id);
        const booking = await createBooking(user.id, room.id);
        const room2 = await createRoomWithHotelId(hotel.id);

        const response = await server.put(`/booking/${booking.id}`).send({ roomId: room2.id + 1 })
          .set("Authorization", `Bearer ${token}`);

        expect(response.status).toEqual(httpStatus.NOT_FOUND);
      });
      it("should respond with status 404 if roomId invalid", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await createTicketTypeWithHotel();
        await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
        const hotel = await createHotel();
        const room = await createRoomWithHotelId(hotel.id);
        const booking = await createBooking(user.id, room.id);
        await createRoomWithHotelId(hotel.id);

        const response = await server.put(`/booking/${booking.id}`).send({ roomId: 0 })
          .set("Authorization", `Bearer ${token}`);

        expect(response.status).toEqual(httpStatus.NOT_FOUND);
      });
      it("should respond with status 404 if roomId invalid", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await createTicketTypeWithHotel();
        await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
        const hotel = await createHotel();
        const room = await createRoomWithHotelId(hotel.id);
        const booking = await createBooking(user.id, room.id);
        await createRoomWithHotelId(hotel.id);

        const response = await server.put(`/booking/${booking.id}`).send({ roomId: -1 })
          .set("Authorization", `Bearer ${token}`);

        expect(response.status).toEqual(httpStatus.NOT_FOUND);
      });
      it("should respond with status 404 if roomId invalid", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await createTicketTypeWithHotel();
        await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
        const hotel = await createHotel();
        const room = await createRoomWithHotelId(hotel.id);
        const booking = await createBooking(user.id, room.id);
        await createRoomWithHotelId(hotel.id);

        const response = await server.put(`/booking/${booking.id}`).send({ roomId: "a" })
          .set("Authorization", `Bearer ${token}`);

        expect(response.status).toEqual(httpStatus.NOT_FOUND);
      });
      it("should respond with status 404 no roomId", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await createTicketTypeWithHotel();
        await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
        const hotel = await createHotel();
        const room = await createRoomWithHotelId(hotel.id);
        const booking = await createBooking(user.id, room.id);
        await createRoomWithHotelId(hotel.id);

        const response = await server.put(`/booking/${booking.id}`).send({ })
          .set("Authorization", `Bearer ${token}`);

        expect(response.status).toEqual(httpStatus.NOT_FOUND);
      });
    });
  });
});
