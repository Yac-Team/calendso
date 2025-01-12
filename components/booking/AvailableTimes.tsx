import { ExclamationIcon } from "@heroicons/react/solid";
import { SchedulingType } from "@prisma/client";
import { Dayjs } from "dayjs";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { FC } from "react";

import { useLocale } from "@lib/hooks/useLocale";
import { useSlots } from "@lib/hooks/useSlots";

import Loader from "@components/Loader";

type AvailableTimesProps = {
  localeProp: string;
  workingHours: {
    days: number[];
    startTime: number;
    endTime: number;
  }[];
  timeFormat: string;
  minimumBookingNotice: number;
  eventTypeId: number;
  eventLength: number;
  date: Dayjs;
  users: {
    username: string | null;
  }[];
  schedulingType: SchedulingType | null;
};

const AvailableTimes: FC<AvailableTimesProps> = ({
  localeProp,
  date,
  eventLength,
  eventTypeId,
  minimumBookingNotice,
  workingHours,
  timeFormat,
  users,
  schedulingType,
}) => {
  const { t } = useLocale({ localeProp: localeProp });
  const router = useRouter();
  const { rescheduleUid } = router.query;

  const { slots, loading, error } = useSlots({
    date,
    eventLength,
    schedulingType,
    workingHours,
    users,
    minimumBookingNotice,
    eventTypeId,
  });

  return (
    <div className="mt-8 text-center sm:pl-4 sm:mt-0 sm:w-1/3 md:-mb-5">
      <div className="mb-4 text-lg font-light text-left text-gray-600">
        <span className="w-1/2 text-gray-600 ">
          <strong>{t(date.format("dddd").toLowerCase())}</strong>
          <span className="text-gray-500">
            {date.format(", DD ")}
            {t(date.format("MMMM").toLowerCase())}
          </span>
        </span>
      </div>
      <div className="md:max-h-[364px] overflow-y-auto">
        {!loading &&
          slots?.length > 0 &&
          slots.map((slot) => {
            const bookingUrl = {
              pathname: "book",
              query: {
                ...router.query,
                date: slot.time.format(),
                type: eventTypeId,
              },
            };

            if (rescheduleUid) {
              bookingUrl.query.rescheduleUid = rescheduleUid;
            }

            if (schedulingType === SchedulingType.ROUND_ROBIN) {
              bookingUrl.query.user = slot.users;
            }

            return (
              <div key={slot.time.format()}>
                <Link href={bookingUrl}>
                  <a className="block py-4 mb-2 font-medium bg-white border rounded-sm text-primary-500 border-primary-500 hover:text-white hover:bg-primary-500 :border-yellow :bg-yellow">
                    {slot.time.format(timeFormat)}
                  </a>
                </Link>
              </div>
            );
          })}
        {!loading && !error && !slots.length && (
          <div className="flex flex-col items-center content-center justify-center w-full h-full -mt-4">
            <h1 className="my-6 text-xl text-yellow">{t("all_booked_today")}</h1>
          </div>
        )}

        {loading && <Loader />}

        {error && (
          <div className="p-4 border-l-4 border-yellow-400 bg-yellow-50">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationIcon className="w-5 h-5 text-red-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-600">{t("slots_load_fail")}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AvailableTimes;
