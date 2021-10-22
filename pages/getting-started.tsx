import { ArrowRightIcon } from "@heroicons/react/outline";
import { EventTypeCreateInput, ScheduleCreateInput, UserUpdateInput } from "@prisma/client";
import classnames from "classnames";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import debounce from "lodash.debounce";
import { NextPageContext, InferGetServerSidePropsType } from "next";
import { useSession } from "next-auth/client";
import Head from "next/head";
import { useRouter } from "next/router";
import { Integration } from "pages/integrations";
import React, { useEffect, useRef, useState } from "react";
import TimezoneSelect from "react-timezone-select";

import { getSession } from "@lib/auth";
import AddCalDavIntegration, {
  ADD_CALDAV_INTEGRATION_FORM_TITLE,
} from "@lib/integrations/CalDav/components/AddCalDavIntegration";
import getIntegrations from "@lib/integrations/getIntegrations";
import prisma from "@lib/prisma";

import { Dialog, DialogClose, DialogContent, DialogHeader } from "@components/Dialog";
import Loader from "@components/Loader";
import Button from "@components/ui/Button";
import SchedulerForm, { SCHEDULE_FORM_ID } from "@components/ui/Schedule/Schedule";
import Text from "@components/ui/Text";
import ErrorAlert from "@components/ui/alerts/Error";

import { AddCalDavIntegrationRequest } from "../lib/integrations/CalDav/components/AddCalDavIntegration";
import getEventTypes from "../lib/queries/event-types/get-event-types";

dayjs.extend(utc);
dayjs.extend(timezone);

const DEFAULT_EVENT_TYPES = [
  {
    title: "15 Min Meeting",
    slug: "15min",
    length: 15,
  },
  {
    title: "30 Min Meeting",
    slug: "30min",
    length: 30,
  },
  {
    title: "Secret Meeting",
    slug: "secret",
    length: 15,
    hidden: true,
  },
];

// type OnboardingProps = {
//   user: User;
//   integrations?: Record<string, string>[];
//   eventTypes?: EventType[];
//   schedules?: Schedule[];
// };

export default function Onboarding(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const router = useRouter();

  const [isSubmitting, setSubmitting] = React.useState(false);
  const [enteredName, setEnteredName] = React.useState();
  const Sess = useSession();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  const updateUser = async (data: UserUpdateInput) => {
    const res = await fetch(`/api/user/${props.user.id}`, {
      method: "PATCH",
      body: JSON.stringify({ data: { ...data } }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error((await res.json()).message);
    }
    const responseData = await res.json();
    return responseData.data;
  };

  const createEventType = async (data: EventTypeCreateInput) => {
    const res = await fetch(`/api/availability/eventtype`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error((await res.json()).message);
    }
    const responseData = await res.json();
    return responseData.data;
  };

  const createSchedule = async (data: ScheduleCreateInput) => {
    const res = await fetch(`/api/schedule`, {
      method: "POST",
      body: JSON.stringify({ data: { ...data } }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error((await res.json()).message);
    }
    const responseData = await res.json();
    return responseData.data;
  };

  const handleAddIntegration = (type: string) => {
    if (type === "caldav_calendar") {
      setAddCalDavError(null);
      setIsAddCalDavIntegrationDialogOpen(true);
      return;
    }

    fetch("/api/integrations/" + type.replace("_", "") + "/add")
      .then((response) => response.json())
      .then((data) => {
        window.location.href = data.url;
      });
  };

  /** Internal Components */
  const IntegrationGridListItem = ({ integration }: { integration: Integration }) => {
    if (!integration || !integration.installed) {
      return null;
    }

    return integration.type === "google_calendar" ? (
      <li
        onClick={() => handleAddIntegration(integration.type)}
        key={integration.type}
        className="flex flex-col items-center px-4 py-3 lg:flex-row">
        <div className="flex pb-3 lg:pb-0">
          <div className="w-1/12 mr-4">
            <img className="w-8 h-8 mr-2" src={integration.imageSrc} alt={integration.title} />
          </div>
          <div className="w-10/12">
            <Text className="text-sm font-medium text-gray-900">{integration.title}</Text>
            <Text className="text-gray-400" variant="subtitle">
              {integration.description}
            </Text>
          </div>
        </div>
        <div>
          <button
            onClick={() => handleAddIntegration(integration.type)}
            style={{
              fontFamily: "Roboto",
              backgroundColor: "#4285f4",
              borderRadius: 2,
              paddingRight: 8,
              alignItems: "center",
            }}
            className="flex justify-start py-[2px] px-[2px] min-w-[215px] font-medium text-neutral-900 active:bg-[#1669F2] hover:opacity-80">
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 2,
                padding: 11,
                backgroundColor: "white",
                marginRight: 16,
              }}>
              <img
                width="18px"
                src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg"
                alt="Google logo"
              />
            </div>
            Sign in with Google
          </button>
        </div>
      </li>
    ) : (
      <></>
    );
  };
  /** End Internal Components */

  /** Name */
  const nameRef = useRef(null);
  const bioRef = useRef(null);
  /** End Name */
  /** TimeZone */
  const [selectedTimeZone, setSelectedTimeZone] = useState({
    value: props.user.timeZone ?? dayjs.tz.guess(),
    label: null,
  });
  const currentTime = React.useMemo(() => {
    return dayjs().tz(selectedTimeZone.value).format("h:mm A");
  }, [selectedTimeZone]);
  /** End TimeZone */

  /** CalDav Form */
  const addCalDavIntegrationRef = useRef<HTMLFormElement>(null);
  const [isAddCalDavIntegrationDialogOpen, setIsAddCalDavIntegrationDialogOpen] = useState(false);
  const [addCalDavError, setAddCalDavError] = useState<{ message: string } | null>(null);

  const handleAddCalDavIntegration = async ({ url, username, password }: AddCalDavIntegrationRequest) => {
    const requestBody = JSON.stringify({
      url,
      username,
      password,
    });

    return await fetch("/api/integrations/caldav/add", {
      method: "POST",
      body: requestBody,
      headers: {
        "Content-Type": "application/json",
      },
    });
  };

  const handleAddCalDavIntegrationSaveButtonPress = async () => {
    const form = addCalDavIntegrationRef.current.elements;
    const url = form.url.value;
    const password = form.password.value;
    const username = form.username.value;

    try {
      setAddCalDavError(null);
      const addCalDavIntegrationResponse = await handleAddCalDavIntegration({ username, password, url });
      if (addCalDavIntegrationResponse.ok) {
        setIsAddCalDavIntegrationDialogOpen(false);
        incrementStep();
      } else {
        const j = await addCalDavIntegrationResponse.json();
        setAddCalDavError({ message: j.message });
      }
    } catch (reason) {
      console.error(reason);
    }
  };

  const ConnectCalDavServerDialog = () => {
    return (
      <Dialog
        open={isAddCalDavIntegrationDialogOpen}
        onOpenChange={(isOpen) => setIsAddCalDavIntegrationDialogOpen(isOpen)}>
        <DialogContent>
          <DialogHeader
            title="Connect to CalDav Server"
            subtitle="Your credentials will be stored and encrypted."
          />
          <div className="my-4">
            {addCalDavError && (
              <p className="text-sm text-red-700">
                <span className="font-bold">Error: </span>
                {addCalDavError.message}
              </p>
            )}
            <AddCalDavIntegration
              ref={addCalDavIntegrationRef}
              onSubmit={handleAddCalDavIntegrationSaveButtonPress}
            />
          </div>
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="submit"
              form={ADD_CALDAV_INTEGRATION_FORM_TITLE}
              className="flex justify-center px-4 py-2 text-sm font-medium text-white border border-transparent rounded-sm shadow-sm bg-neutral-900 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900">
              Save
            </button>
            <DialogClose
              onClick={() => {
                setIsAddCalDavIntegrationDialogOpen(false);
              }}
              asChild>
              <Button color="secondary">Cancel</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    );
  };
  /**End CalDav Form */

  /** Onboarding Steps */
  const [currentStep, setCurrentStep] = useState(0);
  const detectStep = () => {
    let step = 0;
    const hasSetUserNameOrTimeZone = props.user.name && props.user.timeZone;
    if (hasSetUserNameOrTimeZone) {
      step = 1;
    }

    const hasConfigureCalendar = props.integrations.some((integration) => integration.credential != null);
    if (hasConfigureCalendar) {
      step = 2;
    }

    const hasSchedules = props.schedules && props.schedules.length > 0;
    if (hasSchedules) {
      step = 3;
    }

    setCurrentStep(step);
  };

  const handleConfirmStep = async () => {
    try {
      setSubmitting(true);
      if (
        steps[currentStep] &&
        steps[currentStep]?.onComplete &&
        typeof steps[currentStep]?.onComplete === "function"
      ) {
        await steps[currentStep].onComplete();
      }
      incrementStep();
      setSubmitting(false);
    } catch (error) {
      console.log("handleConfirmStep", error);
      setSubmitting(false);
      setError(error);
    }
  };

  const debouncedHandleConfirmStep = debounce(handleConfirmStep, 850);

  const handleSkipStep = () => {
    incrementStep();
  };

  const incrementStep = () => {
    const nextStep = currentStep + 1;

    if (nextStep >= steps.length) {
      completeOnboarding();
      return;
    }
    setCurrentStep(nextStep);
  };

  const decrementStep = () => {
    const previous = currentStep - 1;

    if (previous < 0) {
      return;
    }
    setCurrentStep(previous);
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
  };

  /**
   * Complete Onboarding finalizes the onboarding flow for a new user.
   *
   * Here, 3 event types are pre-created for the user as well.
   * Set to the availability the user enter during the onboarding.
   *
   * If a user skips through the Onboarding flow,
   * then the default availability is applied.
   */
  const completeOnboarding = async () => {
    setSubmitting(true);
    if (!props.eventTypes || props.eventTypes.length === 0) {
      const eventTypes = await getEventTypes();
      if (eventTypes.length === 0) {
        Promise.all(
          DEFAULT_EVENT_TYPES.map(async (event) => {
            return await createEventType(event);
          })
        );
      }
    }
    await updateUser({
      completedOnboarding: true,
    });

    setSubmitting(false);
    router.push("/event-types");
  };

  const steps = [
    {
      id: "welcome",
      title: "Welcome to Yac Meet",
      description:
        "Tell us what to call you and let us know what timezone you’re in. You’ll be able to edit this later.",
      Component: (
        <form className="sm:mx-auto sm:w-full">
          <section className="space-y-8">
            <fieldset>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                ref={nameRef}
                type="text"
                name="name"
                id="name"
                autoComplete="given-name"
                placeholder="Your name"
                defaultValue={props.user.name ?? enteredName}
                required
                className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-sm shadow-sm focus:outline-none focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
              />
            </fieldset>

            <fieldset>
              <section className="flex justify-between">
                <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700">
                  Timezone
                </label>
                <Text variant="caption">
                  Current time:&nbsp;
                  <span className="text-black">{currentTime}</span>
                </Text>
              </section>
              <TimezoneSelect
                id="timeZone"
                value={selectedTimeZone}
                onChange={setSelectedTimeZone}
                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </fieldset>
          </section>
        </form>
      ),
      hideConfirm: false,
      confirmText: "Continue",
      showCancel: true,
      cancelText: "Set up later",
      onComplete: async () => {
        try {
          setSubmitting(true);
          await updateUser({
            name: nameRef.current.value,
            timeZone: selectedTimeZone.value,
          });
          setEnteredName(nameRef.current.value);
          setSubmitting(true);
        } catch (error) {
          setError(error);
          setSubmitting(false);
        }
      },
    },
    {
      id: "connect-calendar",
      title: "Connect your calendar",
      description:
        "Connect your calendar to automatically check for busy times and new events as they’re scheduled.",
      Component: (
        <ul className="border border-gray-200 divide-y divide-gray-200 rounded-sm sm:mx-auto sm:w-full">
          {props.integrations.map((integration) => {
            return <IntegrationGridListItem key={integration.type} integration={integration} />;
          })}
        </ul>
      ),
      hideConfirm: true,
      confirmText: "Continue",
      showCancel: true,
      cancelText: "Continue without calendar",
    },
    {
      id: "set-availability",
      title: "Set your availability",
      description:
        "Define ranges of time when you are available on a recurring basis. You can create more of these later and assign them to different calendars.",
      Component: (
        <>
          <section className="max-w-lg mx-auto text-black bg-white ">
            <SchedulerForm
              onSubmit={async (data) => {
                try {
                  setSubmitting(true);
                  await createSchedule({
                    freeBusyTimes: data,
                  });
                  debouncedHandleConfirmStep();
                  setSubmitting(false);
                } catch (error) {
                  setError(error);
                }
              }}
            />
          </section>
          <footer className="flex flex-col py-6 space-y-6 sm:mx-auto sm:w-full">
            <Button className="justify-center" EndIcon={ArrowRightIcon} type="submit" form={SCHEDULE_FORM_ID}>
              Continue
            </Button>
          </footer>
        </>
      ),
      hideConfirm: true,
      showCancel: false,
    },
    {
      id: "profile",
      title: "Nearly there",
      description:
        "Last thing, a brief description about you and a photo really help you get meetings and let people know who they’re meeting with.",
      Component: (
        <form className="sm:mx-auto sm:w-full" id="ONBOARDING_STEP_4">
          <section className="space-y-4">
            <fieldset>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                ref={nameRef}
                type="text"
                name="name"
                id="name"
                autoComplete="given-name"
                placeholder="Your name"
                defaultValue={props.user.name || enteredName}
                required
                className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-sm shadow-sm focus:outline-none focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
              />
            </fieldset>
            <fieldset>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                About
              </label>
              <input
                ref={bioRef}
                type="text"
                name="bio"
                id="bio"
                required
                className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-sm shadow-sm focus:outline-none focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
                defaultValue={props.user.bio}
              />
              <Text variant="caption" className="mt-2">
                A few sentences about yourself. This will appear on your personal url page.
              </Text>
            </fieldset>
          </section>
        </form>
      ),
      hideConfirm: false,
      confirmText: "Finish",
      showCancel: true,
      cancelText: "Set up later",
      onComplete: async () => {
        try {
          setSubmitting(true);
          console.log("updating");
          await updateUser({
            description: bioRef.current.value,
          });
          setSubmitting(false);
        } catch (error) {
          setError(error);
          setSubmitting(false);
        }
      },
    },
  ];
  /** End Onboarding Steps */

  useEffect(() => {
    detectStep();
    setReady(true);
  }, []);

  if (Sess[1] || !ready) {
    return <div className="loader"></div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Yac Meet - Getting Started</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {isSubmitting && (
        <div className="fixed z-10 flex flex-col items-center content-center justify-center w-full h-full bg-white bg-opacity-25">
          <Loader />
        </div>
      )}
      <div className="px-4 py-24 mx-auto">
        <article className="relative">
          <section className="space-y-4 sm:mx-auto sm:w-full sm:max-w-lg">
            <header>
              <Text className="text-[#fff]" variant="largetitle">
                {steps[currentStep].title}
              </Text>
              <Text className="text-[#fff]" variant="subtitle">
                {steps[currentStep].description}
              </Text>
            </header>
            <section className="pt-4 space-y-2">
              <Text variant="footnote">
                Step {currentStep + 1} of {steps.length}
              </Text>

              {error && <ErrorAlert {...error} />}

              <section className="flex w-full space-x-2">
                {steps.map((s, index) => {
                  return index <= currentStep ? (
                    <div
                      key={`step-${index}`}
                      onClick={() => goToStep(index)}
                      className={classnames(
                        "h-1 bg-black w-1/4",
                        index < currentStep ? "cursor-pointer" : ""
                      )}></div>
                  ) : (
                    <div key={`step-${index}`} className="w-1/4 h-1 bg-black bg-opacity-25"></div>
                  );
                })}
              </section>
            </section>
          </section>
          <section className="max-w-xl p-10 mx-auto mt-10 bg-white rounded-sm">
            {steps[currentStep].Component}

            {!steps[currentStep].hideConfirm && (
              <footer className="flex flex-col mt-8 space-y-6 sm:mx-auto sm:w-full">
                <Button
                  className="justify-center"
                  disabled={isSubmitting}
                  onClick={debouncedHandleConfirmStep}
                  EndIcon={ArrowRightIcon}>
                  {steps[currentStep].confirmText}
                </Button>
              </footer>
            )}
          </section>
          <section className="max-w-xl py-8 mx-auto">
            <div className="flex flex-row-reverse justify-between text-gray-800">
              <button disabled={isSubmitting} onClick={handleSkipStep}>
                <Text variant="caption">Skip Step</Text>
              </button>
              {currentStep !== 0 && (
                <button disabled={isSubmitting} onClick={decrementStep}>
                  <Text variant="caption">Prev Step</Text>
                </button>
              )}
            </div>
          </section>
        </article>
      </div>
      <ConnectCalDavServerDialog />
    </div>
  );
}

export async function getServerSideProps(context: NextPageContext) {
  const session = await getSession(context);

  let integrations = [];
  let credentials = [];
  let eventTypes = [];
  let schedules = [];
  if (!session?.user?.id) {
    return {
      redirect: {
        permanent: false,
        destination: "/auth/login",
      },
    };
  }
  const user = await prisma.user.findFirst({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      username: true,
      name: true,
      email: true,
      bio: true,
      avatar: true,
      timeZone: true,
      completedOnboarding: true,
    },
  });
  if (!user) {
    throw new Error(`Signed in as ${session.user.id} but cannot be found in db`);
  }

  if (user.completedOnboarding) {
    return {
      redirect: {
        permanent: false,
        destination: "/event-types",
      },
    };
  }

  credentials = await prisma.credential.findMany({
    where: {
      userId: user.id,
    },
    select: {
      id: true,
      type: true,
      key: true,
    },
  });

  integrations = getIntegrations(credentials);

  eventTypes = await prisma.eventType.findMany({
    where: {
      userId: user.id,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      length: true,
      hidden: true,
    },
  });

  schedules = await prisma.schedule.findMany({
    where: {
      userId: user.id,
    },
    select: {
      id: true,
    },
  });

  return {
    props: {
      session,
      user,
      integrations,
      eventTypes,
      schedules,
    },
  };
}
