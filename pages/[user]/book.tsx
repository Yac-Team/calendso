import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

import { asStringOrThrow } from "@lib/asStringOrNull";
import { getOrSetUserLocaleFromHeaders } from "@lib/core/i18n/i18n.utils";
import { symmetricEncrypt } from "@lib/crypto";
import prisma from "@lib/prisma";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import BookingPage from "@components/booking/pages/BookingPage";

dayjs.extend(utc);
dayjs.extend(timezone);

export type BookPageProps = inferSSRProps<typeof getServerSideProps>;

export default function Book(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return <BookingPage {...props} />;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const locale = await getOrSetUserLocaleFromHeaders(context.req);

  const user = await prisma.user.findUnique({
    where: {
      username: asStringOrThrow(context.query.user),
    },
    select: {
      username: true,
      name: true,
      email: true,
      bio: true,
      avatar: true,
      theme: true,
      asyncUseCalendar: true,
    },
  });

  if (!user) return { notFound: true };

  const eventType = await prisma.eventType.findUnique({
    where: {
      id: parseInt(asStringOrThrow(context.query.type)),
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      length: true,
      locations: true,
      customInputs: true,
      periodType: true,
      periodDays: true,
      periodStartDate: true,
      periodEndDate: true,
      periodCountCalendarDays: true,
      price: true,
      currency: true,
      disableGuests: true,
      users: {
        select: {
          username: true,
          name: true,
          email: true,
          bio: true,
          avatar: true,
          theme: true,
        },
      },
    },
  });

  if (!eventType) return { notFound: true };

  const eventTypeObject = [eventType].map((e) => {
    return {
      ...e,
      periodStartDate: e.periodStartDate?.toString() ?? null,
      periodEndDate: e.periodEndDate?.toString() ?? null,
    };
  })[0];

  let booking = null;

  if (context.query.rescheduleUid) {
    booking = await prisma.booking.findFirst({
      where: {
        uid: asStringOrThrow(context.query.rescheduleUid),
      },
      select: {
        description: true,
        attendees: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });
  }

  if (eventTypeObject.slug === "async" && user.asyncUseCalendar && !context.query.date) {
    return {
      redirect: { permanent: false, destination: "/" + user.username + "/async" },
    };
  }

  return {
    props: {
      localeProp: locale,
      profile: {
        slug: user.username,
        name: user.name,
        image: user.avatar,
        theme: user.theme,
        asyncUseCalendar: user.asyncUseCalendar,
      },
      eventType: {
        ...eventTypeObject,
        securityCheck: symmetricEncrypt(
          String(eventTypeObject.id) + "__" + String(user.username),
          process.env.CALENDSO_ENCRYPTION_KEY as string
        ),
      },
      booking,
      ...(await serverSideTranslations(locale, ["common"])),
    },
  };
}
