import { ClockIcon } from "@heroicons/react/outline";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { useToggleQuery } from "@lib/hooks/useToggleQuery";
import showToast from "@lib/notification";
import { trpc } from "@lib/trpc";

import { Dialog, DialogContent } from "@components/Dialog";
import Loader from "@components/Loader";
import Shell from "@components/Shell";
import { Alert } from "@components/ui/Alert";
import Button from "@components/ui/Button";

function convertMinsToHrsMins(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const hours = h < 10 ? "0" + h : h;
  const minutes = m < 10 ? "0" + m : m;
  return `${hours}:${minutes}`;
}
export default function Availability(props) {
  if (Math.random() > 1) console.log(props);

  const queryMe = trpc.useQuery(["viewer.me"]);
  const formModal = useToggleQuery("edit");

  const formMethods = useForm<{
    startHours: string;
    startMins: string;
    startIsPM: string;
    endHours: string;
    endMins: string;
    endIsPM: string;
    bufferHours: string;
    bufferMins: string;
  }>({});
  const router = useRouter();

  useEffect(() => {
    /**
     * This hook populates the form with new values as soon as the user is loaded or changes
     */
    const user = queryMe.data;
    if (formMethods.formState.isDirty || !user) {
      return;
    }
    const startHoursNum = Number(convertMinsToHrsMins(user.startTime).split(":")[0]);
    const endHoursNum = Number(convertMinsToHrsMins(user.endTime).split(":")[0]);
    formMethods.reset({
      startHours: String(startHoursNum === 0 ? 12 : startHoursNum > 12 ? startHoursNum - 12 : startHoursNum),
      startMins: convertMinsToHrsMins(user.startTime).split(":")[1],
      startIsPM: String(Number(startHoursNum > 12)),
      endHours: String(endHoursNum === 0 ? 12 : endHoursNum > 12 ? endHoursNum - 12 : endHoursNum),
      endMins: convertMinsToHrsMins(user.endTime).split(":")[1],
      endIsPM: String(Number(endHoursNum > 12)),
      bufferHours: convertMinsToHrsMins(user.bufferTime).split(":")[0],
      bufferMins: convertMinsToHrsMins(user.bufferTime).split(":")[1],
    });
  }, [formMethods, queryMe.data]);

  if (queryMe.status === "loading") {
    return <Loader />;
  }
  if (queryMe.status !== "success") {
    return <Alert severity="error" title="Something went wrong" />;
  }
  const user = queryMe.data;

  return (
    <div>
      <Shell heading="Availability" subtitle="Configure times when you are available for meetings.">
        <div className="flex">
          <div className="w-1/2 mr-2 bg-white border border-gray-200 rounded-sm">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Change the start and end times of your day
              </h3>
              <div className="max-w-xl mt-2 text-sm text-gray-500">
                <p>
                  Currently, your day is set to start at {convertMinsToHrsMins(user.startTime)} and end at{" "}
                  {convertMinsToHrsMins(user.endTime)}.
                </p>
              </div>
              <div className="mt-5">
                <Button href={formModal.hrefOn}>Change available times</Button>
              </div>
            </div>
          </div>

          <div className="w-1/2 ml-2 border border-gray-200 rounded-sm">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Something doesn&apos;t look right?
              </h3>
              <div className="max-w-xl mt-2 text-sm text-gray-500">
                <p>Troubleshoot your availability to explore why your times are showing as they are.</p>
              </div>
              <div className="mt-5">
                <Link href="/availability/troubleshoot">
                  <a className="btn btn-white">Launch troubleshooter</a>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <Dialog
          open={formModal.isOn}
          onOpenChange={(isOpen) => {
            router.push(isOpen ? formModal.hrefOn : formModal.hrefOff);
          }}>
          <DialogContent className="min-w-[420px]">
            <div className="mb-4 sm:flex sm:items-start">
              <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 mx-auto rounded-full bg-neutral-100 sm:mx-0 sm:h-10 sm:w-10">
                <ClockIcon className="w-6 h-6 text-neutral-600" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
                  Change your available times
                </h3>
                <div>
                  <p className="text-sm text-gray-500">
                    Set the start and end time of your day and a minimum buffer between your meetings.
                  </p>
                </div>
              </div>
            </div>
            <form
              onSubmit={formMethods.handleSubmit(async (values) => {
                const startHours12Hour = parseInt(values.startHours);
                const startHours24Hour = Number(values.startIsPM)
                  ? startHours12Hour + 12
                  : startHours12Hour === 12
                  ? 0
                  : startHours12Hour;

                const endHours12Hour = parseInt(values.endHours);
                const endHours24Hour = Number(values.endIsPM)
                  ? endHours12Hour + 12
                  : endHours12Hour === 12
                  ? 0
                  : endHours12Hour;

                const startMins = startHours24Hour * 60 + parseInt(values.startMins);
                const endMins = endHours24Hour * 60 + parseInt(values.endMins);
                const bufferMins = parseInt(values.bufferHours) * 60 + parseInt(values.bufferMins);

                // TODO: Add validation
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const response = await fetch("/api/availability/day", {
                  method: "PATCH",
                  body: JSON.stringify({ start: startMins, end: endMins, buffer: bufferMins }),
                  headers: {
                    "Content-Type": "application/json",
                  },
                });
                if (!response.ok) {
                  showToast("Something went wrong", "error");
                  return;
                }
                await queryMe.refetch();
                router.push(formModal.hrefOff);

                showToast("The start and end times for your day have been changed successfully.", "success");
              })}>
              <div className="flex mb-4">
                <label className="block w-1/4 pt-2 text-sm font-medium text-gray-700">Start Time</label>
                <div>
                  <label htmlFor="startHours" className="sr-only">
                    Hours
                  </label>
                  <input
                    {...formMethods.register("startHours")}
                    id="startHours"
                    type="number"
                    className="block w-[6rem] border-gray-300 rounded-sm shadow-sm focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
                    placeholder="9"
                    defaultValue={convertMinsToHrsMins(user.startTime).split(":")[0]}
                    max="12"
                    min="0"
                  />
                </div>
                <span className="pt-1 mx-2 text-gray-900">:</span>
                <div>
                  <label htmlFor="startMins" className="sr-only">
                    Minutes
                  </label>
                  <input
                    {...formMethods.register("startMins")}
                    id="startMins"
                    max="59"
                    min="0"
                    type="number"
                    className="block w-[6rem] border-gray-300 rounded-sm shadow-sm focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
                    placeholder="30"
                  />
                </div>
                <span className="pt-1 mx-2"></span>
                <div>
                  <label htmlFor="startAMPM" className="sr-only">
                    AM/PM
                  </label>
                  <select
                    {...formMethods.register("startIsPM")}
                    className="block w-[6rem] border-gray-300 rounded-sm shadow-sm focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
                    id="startAMPM">
                    <option value="0">AM</option>
                    <option value="1">PM</option>
                  </select>
                </div>
              </div>
              <div className="flex mb-4">
                <label className="block w-1/4 pt-2 text-sm font-medium text-gray-700">End Time</label>
                <div>
                  <label htmlFor="endHours" className="sr-only">
                    Hours
                  </label>
                  <input
                    {...formMethods.register("endHours")}
                    type="number"
                    id="endHours"
                    max="12"
                    min="0"
                    className="block w-[6rem] border-gray-300 rounded-sm shadow-sm focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
                    placeholder="5"
                  />
                </div>
                <span className="pt-1 mx-2 text-gray-900">:</span>
                <div>
                  <label htmlFor="endMins" className="sr-only">
                    Minutes
                  </label>
                  <input
                    {...formMethods.register("endMins")}
                    type="number"
                    max="59"
                    min="0"
                    id="endMins"
                    className="block w-[6rem] border-gray-300 rounded-sm shadow-sm focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
                    placeholder="30"
                  />
                </div>
                <span className="pt-1 mx-2"></span>
                <div>
                  <label htmlFor="endAMPM" className="sr-only">
                    AM/PM
                  </label>
                  <select
                    {...formMethods.register("endIsPM")}
                    className="block w-[6rem] border-gray-300 rounded-sm shadow-sm focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
                    id="endAMPM">
                    <option value="0">AM</option>
                    <option value="1">PM</option>
                  </select>
                </div>
              </div>
              <div className="flex mb-4">
                <label className="block w-1/4 pt-2 text-sm font-medium text-gray-700">Buffer</label>
                <div>
                  <label htmlFor="bufferHours" className="sr-only">
                    Hours
                  </label>
                  <input
                    {...formMethods.register("bufferHours")}
                    type="number"
                    id="bufferHours"
                    className="block w-[6rem] border-gray-300 rounded-sm shadow-sm focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
                    placeholder="0"
                  />
                </div>
                <span className="pt-1 mx-2 text-gray-900">:</span>
                <div>
                  <label htmlFor="bufferMins" className="sr-only">
                    Minutes
                  </label>
                  <input
                    {...formMethods.register("bufferMins")}
                    type="number"
                    id="bufferMins"
                    className="block w-[6rem] border-gray-300 rounded-sm shadow-sm focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
                    placeholder="10"
                  />
                </div>
              </div>
              <div className="mt-5 space-x-2 sm:mt-4 sm:flex">
                <Button href={formModal.hrefOff} color="secondary" tabIndex={-1}>
                  Cancel
                </Button>
                <Button type="submit" loading={formMethods.formState.isSubmitting}>
                  Update
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </Shell>
    </div>
  );
}
