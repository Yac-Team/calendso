import * as fetch from "@lib/core/http/fetch-wrapper";
import { BookingCreateBody, BookingResponse } from "@lib/types/booking";

const createBooking = async (data: BookingCreateBody) => {
  const response = await fetch.post<BookingCreateBody, BookingResponse>("/api/book/event", data, {
    headers: {
      "x-calendso-security-check": data.securityCheck || "",
    },
  });

  return response;
};

export default createBooking;
