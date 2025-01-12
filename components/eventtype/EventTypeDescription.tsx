import { ClockIcon, CreditCardIcon, UserIcon, UsersIcon } from "@heroicons/react/solid";
import { SchedulingType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import React from "react";
import { FormattedNumber, IntlProvider } from "react-intl";

import classNames from "@lib/classNames";
import { useLocale } from "@lib/hooks/useLocale";

const eventTypeData = Prisma.validator<Prisma.EventTypeArgs>()({
  select: {
    id: true,
    length: true,
    price: true,
    currency: true,
    schedulingType: true,
    description: true,
    slug: true,
  },
});

type EventType = Prisma.EventTypeGetPayload<typeof eventTypeData>;

export type EventTypeDescriptionProps = {
  localeProp: string;
  eventType: EventType;
  className?: string;
  asyncUseCalendar: boolean;
};

export const EventTypeDescription = ({
  localeProp,
  eventType,
  className,
  asyncUseCalendar,
}: EventTypeDescriptionProps) => {
  const { t } = useLocale({ localeProp });

  return (
    <>
      <div className={classNames("text-neutral-500 ", className)}>
        {eventType.description && (
          <h2 className="opacity-60 truncate max-w-[280px] sm:max-w-[500px]">
            {eventType.description.substring(0, 100)}
          </h2>
        )}
        <ul className="flex mt-2 space-x-4 ">
          {(eventType.slug !== "async" || asyncUseCalendar) && (
            <li className="flex whitespace-nowrap">
              <ClockIcon className="inline mt-0.5 mr-1.5 h-4 w-4 text-neutral-400" aria-hidden="true" />
              {eventType.length}m
            </li>
          )}
          {eventType.schedulingType ? (
            <li className="flex whitespace-nowrap">
              <UsersIcon className="inline mt-0.5 mr-1.5 h-4 w-4 text-neutral-400" aria-hidden="true" />
              {eventType.schedulingType === SchedulingType.ROUND_ROBIN && t("round_robin")}
              {eventType.schedulingType === SchedulingType.COLLECTIVE && t("collective")}
            </li>
          ) : (
            <li className="flex whitespace-nowrap">
              <UserIcon className="inline mt-0.5 mr-1.5 h-4 w-4 text-neutral-400" aria-hidden="true" />
              {t("1_on_1")}
            </li>
          )}
          {eventType.price > 0 && (
            <li className="flex whitespace-nowrap">
              <CreditCardIcon className="inline mt-0.5 mr-1.5 h-4 w-4 text-neutral-400" aria-hidden="true" />
              <IntlProvider locale="en">
                <FormattedNumber
                  value={eventType.price / 100.0}
                  style="currency"
                  currency={eventType.currency.toUpperCase()}
                />
              </IntlProvider>
            </li>
          )}
        </ul>
      </div>
    </>
  );
};

export default EventTypeDescription;
