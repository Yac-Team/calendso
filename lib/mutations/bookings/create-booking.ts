import * as fetch from "@lib/core/http/fetch-wrapper";
import { symmetricEncrypt } from "@lib/crypto";
import { BookingCreateBody, BookingResponse } from "@lib/types/booking";

const createBooking = async (data: BookingCreateBody) => {
  const response = await fetch.post<BookingCreateBody, BookingResponse>("/api/book/event", data, {
    headers: {
      "X-Calendso-Security-Check": symmetricEncrypt(
        String(data.eventTypeId) + "__" + String(data.user),
        process.env.CALENDSO_ENCRYPTION_KEY as string
      ),
    },
  });

  return response;
};

export default createBooking;
