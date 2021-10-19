import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import { useEffect, useState } from "react";

import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";

import Loader from "@components/Loader";
import Shell from "@components/Shell";

dayjs.extend(utc);

export default function Troubleshoot({ user }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState([]);
  const [selectedDate, setSelectedDate] = useState(dayjs());

  function convertMinsToHrsMins(mins: number) {
    let h = Math.floor(mins / 60);
    let m = mins % 60;
    h = h < 10 ? "0" + h : h;
    m = m < 10 ? "0" + m : m;
    return `${h}:${m}`;
  }

  const fetchAvailability = (date) => {
    const dateFrom = date.startOf("day").utc().format();
    const dateTo = date.endOf("day").utc().format();

    fetch(`/api/availability/${user.username}?dateFrom=${dateFrom}&dateTo=${dateTo}`)
      .then((res) => {
        return res.json();
      })
      .then((availableIntervals) => {
        setAvailability(availableIntervals.busy);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
      });
  };

  useEffect(() => {
    fetchAvailability(selectedDate);
  }, [selectedDate]);

  if (loading) {
    return <Loader />;
  }

  return (
    <div>
      <Shell
        heading="Troubleshoot"
        subtitle="Understand why certain times are available and others are blocked.">
        <div className="max-w-xl overflow-hidden text-gray-900 bg-white rounded-sm shadow">
          <div className="px-4 py-5 sm:p-6">
            Here is an overview of your day on{" "}
            <input
              type="date"
              className="bg-white"
              defaultValue={selectedDate.format("YYYY-MM-DD")}
              onBlur={(e) => {
                setSelectedDate(dayjs(e.target.value));
              }}
            />
            <small className="block text-neutral-900">
              Tip: Hover over the bold times for a full timestamp
            </small>
            <div className="mt-4 space-y-4">
              <div className="overflow-hidden bg-black rounded-sm">
                <div className="px-4 py-2 text-white sm:px-6">
                  Your day starts at {convertMinsToHrsMins(user.startTime)}
                </div>
              </div>
              {availability.map((slot) => (
                <div key={slot.start} className="overflow-hidden rounded-sm bg-neutral-100">
                  <div className="px-4 py-5 text-black sm:p-6">
                    Your calendar shows you as busy between{" "}
                    <span className="font-medium text-neutral-800" title={slot.start}>
                      {dayjs(slot.start).format("HH:mm")}
                    </span>{" "}
                    and{" "}
                    <span className="font-medium text-neutral-800" title={slot.end}>
                      {dayjs(slot.end).format("HH:mm")}
                    </span>{" "}
                    on {dayjs(slot.start).format("D MMMM YYYY")}
                  </div>
                </div>
              ))}
              {availability.length === 0 && <Loader />}
              <div className="overflow-hidden bg-black rounded-sm">
                <div className="px-4 py-2 text-white sm:px-6">
                  Your day ends at {convertMinsToHrsMins(user.endTime)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Shell>
    </div>
  );
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const session = await getSession(context);
  if (!session?.user?.id) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  const user = await prisma.user.findFirst({
    where: {
      id: session.user.id,
    },
    select: {
      startTime: true,
      endTime: true,
      username: true,
    },
  });

  if (!user) return { redirect: { permanent: false, destination: "/auth/login" } };

  return {
    props: { session, user },
  };
};
