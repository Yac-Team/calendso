import { ArrowRightIcon } from "@heroicons/react/outline";
import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Link from "next/link";
import React from "react";

import { getOrSetUserLocaleFromHeaders } from "@lib/core/i18n/i18n.utils";
import { useLocale } from "@lib/hooks/useLocale";
import useTheme from "@lib/hooks/useTheme";
import prisma from "@lib/prisma";

import EventTypeDescription from "@components/eventtype/EventTypeDescription";
import { HeadSeo } from "@components/seo/head-seo";
import Avatar from "@components/ui/Avatar";

export default function User(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { isReady } = useTheme(props.user.theme);
  const { user, localeProp, eventTypes } = props;
  const { t, locale } = useLocale({ localeProp });

  return (
    <>
      <HeadSeo
        title={user.name || user.username}
        description={"@" + user.username}
        name={user.name || user.username}
        avatar={user.avatar}
      />
      {isReady && (
        <div className="h-screen bg-neutral-50 ">
          <main className="max-w-3xl px-4 py-24 mx-auto">
            <div className="mb-8 text-center">
              <Avatar
                imageSrc={user.avatar}
                displayName={user.name}
                className="w-24 h-24 mx-auto mb-4 rounded-full"
              />
              <h1 className="mb-1 text-3xl font-bold font-cal text-neutral-900 ">
                {user.name || user.username}
              </h1>
              <p className="text-neutral-500 ">{user.bio}</p>
            </div>
            <div className="space-y-6" data-testid="event-types">
              {eventTypes.map((type) => (
                <div
                  key={type.id}
                  className="relative bg-white border rounded-sm group :border-neutral-600 hover:bg-gray-50 border-neutral-200 hover:border-black">
                  <ArrowRightIcon className="absolute w-4 h-4 text-black transition-opacity opacity-0 right-3 top-3 group-hover:opacity-100" />
                  <Link href={`/${user.username}/${type.slug}`}>
                    <a className="block px-6 py-4">
                      <h2 className="font-semibold text-neutral-900 ">{type.title}</h2>
                      <EventTypeDescription
                        localeProp={locale}
                        asyncUseCalendar={user.asyncUseCalendar}
                        eventType={type}
                      />
                    </a>
                  </Link>
                </div>
              ))}
            </div>
            {eventTypes.length === 0 && (
              <div className="overflow-hidden rounded-sm shadow">
                <div className="p-8 text-center text-gray-400 ">
                  <h2 className="text-3xl font-semibold text-gray-600 font-cal ">{t("uh_oh")}</h2>
                  <p className="max-w-md mx-auto">{t("no_event_types_have_been_setup")}</p>
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </>
  );
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const username = (context.query.user as string).toLowerCase();
  const locale = await getOrSetUserLocaleFromHeaders(context.req);

  const user = await prisma.user.findUnique({
    where: {
      username: username.toLowerCase(),
    },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      bio: true,
      avatar: true,
      theme: true,
      plan: true,
    },
  });

  if (!user) {
    return {
      notFound: true,
    };
  }

  const eventTypesWithHidden = await prisma.eventType.findMany({
    where: {
      AND: [
        {
          teamId: null,
        },
        {
          OR: [
            {
              userId: user.id,
            },
            {
              users: {
                some: {
                  id: user.id,
                },
              },
            },
          ],
        },
      ],
    },
    select: {
      id: true,
      slug: true,
      title: true,
      length: true,
      description: true,
      hidden: true,
      schedulingType: true,
      price: true,
      currency: true,
    },
    take: user.plan === "FREE" ? 1 : undefined,
  });

  const eventTypes = eventTypesWithHidden.filter((evt) => !evt.hidden);

  return {
    props: {
      localeProp: locale,
      user,
      eventTypes,
      ...(await serverSideTranslations(locale, ["common"])),
    },
  };
};
