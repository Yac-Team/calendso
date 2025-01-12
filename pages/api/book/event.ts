import { SchedulingType, Prisma, Credential } from "@prisma/client";
import async from "async";
import dayjs from "dayjs";
import dayjsBusinessDays from "dayjs-business-days";
import isBetween from "dayjs/plugin/isBetween";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import type { NextApiRequest, NextApiResponse } from "next";
import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import { handlePayment } from "@ee/lib/stripe/server";

import { CalendarEvent, getBusyCalendarTimes } from "@lib/calendarClient";
import { symmetricDecrypt } from "@lib/crypto";
import AsyncEventAttendeeMail from "@lib/emails/AsyncEventAttendeeMail";
import AsyncEventOrganizerMail from "@lib/emails/AsyncEventOrganizerMail";
import EventOrganizerRequestMail from "@lib/emails/EventOrganizerRequestMail";
import { getEventName } from "@lib/event";
import EventManager, { CreateUpdateResult, EventResult, PartialReference } from "@lib/events/EventManager";
import logger from "@lib/logger";
import prisma from "@lib/prisma";
import { BookingCreateBody } from "@lib/types/booking";
import { getBusyVideoTimes } from "@lib/videoClient";
import sendPayload from "@lib/webhooks/sendPayload";
import getSubscriberUrls from "@lib/webhooks/subscriberUrls";

export interface DailyReturnType {
  name: string;
  url: string;
  id: string;
  created_at: string;
}

dayjs.extend(dayjsBusinessDays);
dayjs.extend(utc);
dayjs.extend(isBetween);
dayjs.extend(timezone);

const translator = short();
const log = logger.getChildLogger({ prefix: ["[api] book:user"] });

type BufferedBusyTimes = { start: string; end: string }[];

/**
 * Refreshes a Credential with fresh data from the database.
 *
 * @param credential
 */
async function refreshCredential(credential: Credential): Promise<Credential> {
  const newCredential = await prisma.credential.findUnique({
    where: {
      id: credential.id,
    },
  });

  if (!newCredential) {
    return credential;
  } else {
    return newCredential;
  }
}

/**
 * Refreshes the given set of credentials.
 *
 * @param credentials
 */
async function refreshCredentials(credentials: Array<Credential>): Promise<Array<Credential>> {
  return await async.mapLimit(credentials, 5, refreshCredential);
}

function isAvailable(busyTimes: BufferedBusyTimes, time: string, length: number): boolean {
  // Check for conflicts
  let t = true;

  if (Array.isArray(busyTimes) && busyTimes.length > 0) {
    busyTimes.forEach((busyTime) => {
      const startTime = dayjs(busyTime.start);
      const endTime = dayjs(busyTime.end);

      // Check if time is between start and end times
      if (dayjs(time).isBetween(startTime, endTime, null, "[)")) {
        t = false;
      }

      // Check if slot end time is between start and end time
      if (dayjs(time).add(length, "minutes").isBetween(startTime, endTime)) {
        t = false;
      }

      // Check if startTime is between slot
      if (startTime.isBetween(dayjs(time), dayjs(time).add(length, "minutes"))) {
        t = false;
      }
    });
  }

  return t;
}

function isOutOfBounds(
  time: dayjs.ConfigType,
  { periodType, periodDays, periodCountCalendarDays, periodStartDate, periodEndDate, timeZone }
): boolean {
  const date = dayjs(time);

  switch (periodType) {
    case "rolling": {
      const periodRollingEndDay = periodCountCalendarDays
        ? dayjs().tz(timeZone).add(periodDays, "days").endOf("day")
        : dayjs().tz(timeZone).businessDaysAdd(periodDays, "days").endOf("day");
      return date.endOf("day").isAfter(periodRollingEndDay);
    }

    case "range": {
      const periodRangeStartDay = dayjs(periodStartDate).tz(timeZone).endOf("day");
      const periodRangeEndDay = dayjs(periodEndDate).tz(timeZone).endOf("day");
      return date.endOf("day").isBefore(periodRangeStartDay) || date.endOf("day").isAfter(periodRangeEndDay);
    }

    case "unlimited":
    default:
      return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const reqBody = JSON.parse(req.body) as BookingCreateBody;
  const eventTypeId = reqBody.eventTypeId;

  log.debug(`Booking eventType ${eventTypeId} started`);

  const isTimeInPast = (time: string): boolean => {
    return dayjs(time).isBefore(new Date(), "day");
  };
  if (req.body.start) {
    if (isTimeInPast(reqBody.start)) {
      const error = {
        errorCode: "BookingDateInPast",
        message: "Attempting to create a meeting in the past.",
      };
      log.error(`Booking ${eventTypeId} failed`, error);
      return res.status(400).json(error);
    }
  }

  const userSelect = Prisma.validator<Prisma.UserSelect>()({
    id: true,
    email: true,
    name: true,
    username: true,
    timeZone: true,
    credentials: true,
    bufferTime: true,
    teamId: true,
  });

  const userData = Prisma.validator<Prisma.UserArgs>()({
    select: userSelect,
  });

  const eventType = await prisma.eventType.findUnique({
    where: {
      id: eventTypeId,
    },
    select: {
      users: {
        select: userSelect,
      },
      team: {
        select: {
          id: true,
          name: true,
        },
      },
      title: true,
      slug: true,
      length: true,
      eventName: true,
      schedulingType: true,
      periodType: true,
      periodStartDate: true,
      periodEndDate: true,
      periodDays: true,
      periodCountCalendarDays: true,
      requiresConfirmation: true,
      userId: true,
      price: true,
      currency: true,
    },
  });

  if (!eventType) return res.status(404).json({ message: "eventType.notFound" });

  let users = eventType.users;

  const securityCheck = req.headers["x-calendso-security-check"];
  if (!securityCheck) {
    const error = {
      errorCode: "NoSecurityCheck",
      message: "No security check header was passed.",
    };
    log.error(`Booking ${eventTypeId} failed`, error);
    return res.status(400).json(error);
  }

  const decryptedSecurityCheck = symmetricDecrypt(
    securityCheck as string,
    process.env.CALENDSO_ENCRYPTION_KEY as string
  );
  const securityCheckParts = decryptedSecurityCheck.split("__");
  if (Number(securityCheckParts[0]) !== Number(eventTypeId) || securityCheckParts[1] !== users[0].username) {
    const error = {
      errorCode: "FailedSecurityCheck",
      message: "Incorrect security check header was passed.",
    };
    log.error(`Booking ${eventTypeId} failed`, error);
    return res.status(400).json(error);
  }

  /* If this event was pre-relationship migration */
  if (!users.length && eventType.userId) {
    const eventTypeUser = await prisma.user.findUnique({
      where: {
        id: eventType.userId,
      },
      select: userSelect,
    });
    if (!eventTypeUser) return res.status(404).json({ message: "eventTypeUser.notFound" });
    users.push(eventTypeUser);
  }

  if (eventType.schedulingType === SchedulingType.ROUND_ROBIN) {
    const selectedUsers = reqBody.users || [];
    const selectedUsersDataWithBookingsCount = await prisma.user.findMany({
      where: {
        username: { in: selectedUsers },
        bookings: {
          every: {
            startTime: {
              gt: new Date(),
            },
          },
        },
      },
      select: {
        username: true,
        _count: {
          select: { bookings: true },
        },
      },
    });

    const bookingCounts = selectedUsersDataWithBookingsCount.map((userData) => ({
      username: userData.username,
      bookingCount: userData._count?.bookings || 0,
    }));

    if (!bookingCounts.length) users.slice(0, 1);

    const [firstMostAvailableUser] = bookingCounts.sort((a, b) => (a.bookingCount > b.bookingCount ? 1 : -1));
    const luckyUser = users.find((user) => user.username === firstMostAvailableUser?.username);
    users = luckyUser ? [luckyUser] : users;
  }

  const invitee = [{ email: reqBody.email, name: reqBody.name, timeZone: reqBody.timeZone }];
  const guests = reqBody.guests.map((guest) => {
    const g = {
      email: guest,
      name: "",
      timeZone: reqBody.timeZone,
    };
    return g;
  });

  const teamMembers =
    eventType.schedulingType === SchedulingType.COLLECTIVE
      ? users.slice(1).map((user) => ({
          email: user.email || "",
          name: user.name || "",
          timeZone: user.timeZone,
        }))
      : [];

  const attendeesList = [...invitee, ...guests, ...teamMembers];

  const seed = `${users[0].username}:${
    req.body.start
      ? `${dayjs(req.body.start).utc().format()}:${new Date().getTime()}`
      : `${dayjs(new Date()).utc().format()}:${new Date().getTime()}`
  }`;

  const rescheduleUid = reqBody.rescheduleUid;
  const uid = rescheduleUid || translator.fromUUID(uuidv5(seed, uuidv5.URL));

  const evt: CalendarEvent = {
    type: eventType.title,
    title: getEventName(reqBody.name, eventType.title, eventType.eventName),
    description: reqBody.notes,
    startTime: reqBody.start,
    endTime: reqBody.end,
    organizer: {
      name: users[0].name || "Nameless",
      email: users[0].email || "Email-less",
      timeZone: users[0].timeZone,
    },
    attendees: attendeesList,
    location: reqBody.location, // Will be processed by the EventManager later.
  };

  if (eventType.schedulingType === SchedulingType.COLLECTIVE) {
    evt.team = {
      members: users.map((user) => user.name || user.username || "Nameless"),
      name: eventType.team?.name || "Nameless",
    }; // used for invitee emails
  }

  try {
    if (eventType.slug === "async") {
      const yacCredential = await prisma.credential.findFirst({
        where: {
          type: "yac",
          userId: users[0].id,
        },
        select: {
          key: true,
        },
      });
      if (!(yacCredential && yacCredential.key && (yacCredential.key as any).api_token)) {
        log.error(`Booking ${eventTypeId} failed`, "Error getting yac credential for user");
        res.status(500).json({ message: "Could not get Yac user credentials for " + users[0].name });
        return;
      }
      if (!users[0].teamId) {
        log.error(`Booking ${eventTypeId} failed`, "Error getting team associated with user");
        res.status(500).json({ message: "Could not get Yac team associated for " + users[0].name });
        return;
      }
      const yacToken = (yacCredential.key as any).api_token;
      const groupCreateRes = await fetch("https://api-v3.yacchat.com/api/v1/group/create", {
        method: "POST",
        headers: {
          Authorization: yacToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          createdBy: users[0].id,
          teamId: users[0].teamId,
          name: evt.title.replace("[async] ", "") + " - " + req.body.topic,
          bio: req.body.notes || "This meeting was created with Yac Meet and has no notes.",
        }),
      });
      const { groupDetails = {} } = await groupCreateRes.json();
      const { id: groupId } = groupDetails;
      if (!groupId) {
        log.error(`Booking ${eventTypeId} failed`, "Error getting groupId from Yac API");
        res.status(500).json({ message: "Could not create a Yac meeting with " + users[0].name });
        return;
      }
      await fetch(`https://api-v3.yacchat.com/api/v2/groups/${groupId}/members`, {
        method: "POST",
        headers: {
          Authorization: yacToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emails: attendeesList.map((x) => x.email),
          resendInvite: true,
        }),
      });
      const { inviteLink } = await (
        await fetch(`https://api-v3.yacchat.com/api/v2/groups/${groupId}/invite-link`, {
          method: "GET",
          headers: {
            Authorization: yacToken,
            "Content-Type": "application/json",
          },
        })
      ).json();
      evt.location = inviteLink;
    }
  } catch (error) {
    log.error(`Booking ${eventTypeId} failed`, "Error getting yac invite link", error);
    res.status(500).json({ message: "Could not get Yac invite link" });
  }

  function createBooking() {
    if (rescheduleUid) {
      return prisma.booking.update({
        where: { uid: rescheduleUid },
        data: {
          title: evt.title,
          startTime: evt.startTime ? dayjs(evt.startTime).toDate() : null,
          endTime: evt.startTime ? dayjs(evt.endTime).toDate() : null,
          description: evt.description,
          location: evt.location,
        },
        include: {
          user: {
            select: { email: true, name: true, timeZone: true },
          },
          attendees: true,
        },
      });
    } else {
      return prisma.booking.create({
        include: {
          user: {
            select: { email: true, name: true, timeZone: true },
          },
          attendees: true,
        },
        data: {
          uid,
          title: evt.title,
          startTime: evt.startTime ? dayjs(evt.startTime).toDate() : null,
          endTime: evt.startTime ? dayjs(evt.endTime).toDate() : null,
          description: evt.description,
          confirmed: !eventType.requiresConfirmation || !!rescheduleUid,
          location: evt.location,
          eventType: {
            connect: {
              id: eventTypeId,
            },
          },
          attendees: {
            createMany: {
              data: evt.attendees,
            },
          },
          user: {
            connect: {
              id: users[0].id,
            },
          },
        },
      });
    }
  }

  type Booking = Prisma.PromiseReturnType<typeof createBooking>;
  let booking: Booking | null = null;
  try {
    booking = await createBooking();
    console.log("booking", booking);
  } catch (e) {
    log.error(`Booking ${eventTypeId} failed`, "Error when saving booking to db", e.message);
    if (e.code === "P2002") {
      res.status(409).json({ message: "booking.conflict" });
      return;
    }
    res.status(500).end();
    return;
  }

  let results: EventResult[] = [];
  let referencesToCreate: PartialReference[] = [];
  type User = Prisma.UserGetPayload<typeof userData>;
  let user: User | null = null;

  for (const currentUser of users) {
    if (!currentUser) {
      console.error(`currentUser not found`);
      return;
    }
    if (!user) user = currentUser;

    const selectedCalendars = await prisma.selectedCalendar.findMany({
      where: {
        userId: currentUser.id,
      },
    });

    const credentials = currentUser.credentials;
    if (req.body.start && req.body.end && credentials) {
      const calendarBusyTimes = await getBusyCalendarTimes(
        credentials,
        reqBody.start,
        reqBody.end,
        selectedCalendars
      );

      const videoBusyTimes = (await getBusyVideoTimes(credentials)).filter((time) => time);
      calendarBusyTimes.push(...videoBusyTimes);
      console.log("calendarBusyTimes==>>>", calendarBusyTimes);

      const bufferedBusyTimes: BufferedBusyTimes = calendarBusyTimes.map((a) => ({
        start: dayjs(a.start).subtract(currentUser.bufferTime, "minute").toString(),
        end: dayjs(a.end).add(currentUser.bufferTime, "minute").toString(),
      }));

      let isAvailableToBeBooked = true;
      try {
        isAvailableToBeBooked = isAvailable(bufferedBusyTimes, reqBody.start, eventType.length);
      } catch {
        log.debug({
          message: "Unable set isAvailableToBeBooked. Using true. ",
        });
      }

      if (!isAvailableToBeBooked) {
        const error = {
          errorCode: "BookingUserUnAvailable",
          message: `${currentUser.name} is unavailable at this time.`,
        };

        log.debug(`Booking ${currentUser.name} failed`, error);
      }

      let timeOutOfBounds = false;

      try {
        timeOutOfBounds = isOutOfBounds(reqBody.start, {
          periodType: eventType.periodType,
          periodDays: eventType.periodDays,
          periodEndDate: eventType.periodEndDate,
          periodStartDate: eventType.periodStartDate,
          periodCountCalendarDays: eventType.periodCountCalendarDays,
          timeZone: currentUser.timeZone,
        });
      } catch {
        log.debug({
          message: "Unable set timeOutOfBounds. Using false. ",
        });
      }

      if (timeOutOfBounds) {
        const error = {
          errorCode: "BookingUserUnAvailable",
          message: `${currentUser.name} is unavailable at this time.`,
        };

        log.debug(`Booking ${currentUser.name} failed`, error);
        res.status(400).json(error);
      }
    }
  }

  if (!user) throw Error("Can't continue, user not found.");

  // After polling videoBusyTimes, credentials might have been changed due to refreshment, so query them again.
  const eventManager = new EventManager(await refreshCredentials(user.credentials));

  if (rescheduleUid) {
    // Use EventManager to conditionally use all needed integrations.
    const updateResults: CreateUpdateResult = await eventManager.update(evt, rescheduleUid);

    results = updateResults.results;
    referencesToCreate = updateResults.referencesToCreate;

    if (results.length > 0 && results.every((res) => !res.success)) {
      const error = {
        errorCode: "BookingReschedulingMeetingFailed",
        message: "Booking Rescheduling failed",
      };

      log.error(`Booking ${user.name} failed`, error, results);
    }
  } else if (evt.startTime && evt.endTime && !eventType.requiresConfirmation && !eventType.price) {
    // Use EventManager to conditionally use all needed integrations.
    const createResults: CreateUpdateResult = await eventManager.create(evt, uid);
    results = createResults.results;
    referencesToCreate = createResults.referencesToCreate;

    if (results.length > 0 && results.every((res) => !res.success)) {
      const error = {
        errorCode: "BookingCreatingMeetingFailed",
        message: "Booking failed",
      };

      log.error(`Booking ${user.username} failed`, error, results);
    }
  }

  if (!evt.startTime && !evt.endTime && eventType.slug === "async") {
    await new AsyncEventOrganizerMail(evt, uid).sendEmail();
    await new AsyncEventAttendeeMail(evt, uid).sendEmail();
  }

  //for Daily.co video calls will grab the meeting token for the call
  const isDaily = evt.location === "integrations:daily";

  let dailyEvent: DailyReturnType;

  if (!rescheduleUid) {
    dailyEvent = results.filter((ref) => ref.type === "daily")[0]?.createdEvent as DailyReturnType;
  } else {
    dailyEvent = results.filter((ref) => ref.type === "daily_video")[0]?.updatedEvent as DailyReturnType;
  }

  let meetingToken;
  if (isDaily) {
    const response = await fetch("https://api.daily.co/v1/meeting-tokens", {
      method: "POST",
      body: JSON.stringify({ properties: { room_name: dailyEvent.name, is_owner: true } }),
      headers: {
        Authorization: "Bearer " + process.env.DAILY_API_KEY,
        "Content-Type": "application/json",
      },
    });
    meetingToken = await response.json();
  }

  //for Daily.co video calls will update the dailyEventReference table

  if (isDaily) {
    await prisma.dailyEventReference.create({
      data: {
        dailyurl: dailyEvent.url,
        dailytoken: meetingToken.token,
        booking: {
          connect: {
            uid: booking.uid,
          },
        },
      },
    });
  }

  if (eventType.requiresConfirmation && !rescheduleUid) {
    await new EventOrganizerRequestMail(evt, uid).sendEmail();
  }

  if (typeof eventType.price === "number" && eventType.price > 0) {
    try {
      const [firstStripeCredential] = user.credentials.filter((cred) => cred.type == "stripe_payment");
      if (!booking.user) booking.user = user;
      const payment = await handlePayment(evt, eventType, firstStripeCredential, booking);

      res.status(201).json({ ...booking, message: "Payment required", paymentUid: payment.uid });
      return;
    } catch (e) {
      log.error(`Creating payment failed`, e);
      res.status(500).json({ message: "Payment Failed" });
      return;
    }
  }

  log.debug(`Booking ${user.username} completed`);

  const eventTrigger = rescheduleUid ? "BOOKING_RESCHEDULED" : "BOOKING_CREATED";
  // Send Webhook call if hooked to BOOKING_CREATED & BOOKING_RESCHEDULED
  const subscriberUrls = await getSubscriberUrls(user.id, eventTrigger);
  const promises = subscriberUrls.map((url) =>
    sendPayload(eventTrigger, new Date().toISOString(), url, evt).catch((e) => {
      console.error(`Error executing webhook for event: ${eventTrigger}, URL: ${url}`, e);
    })
  );
  await Promise.all(promises);

  if (!rescheduleUid && referencesToCreate && referencesToCreate.length) {
    await prisma.booking.update({
      where: {
        uid: booking.uid,
      },
      data: {
        references: {
          createMany: {
            data: referencesToCreate,
          },
        },
      },
    });
  }

  // booking successful
  return res.status(201).json(booking);
}
