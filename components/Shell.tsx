import { Menu, Transition } from "@headlessui/react";
import { SelectorIcon } from "@heroicons/react/outline";
import {
  CalendarIcon,
  ClockIcon,
  CogIcon,
  ExternalLinkIcon,
  LinkIcon,
  LogoutIcon,
  PuzzleIcon,
} from "@heroicons/react/solid";
import { signOut, useSession } from "next-auth/client";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { Fragment, ReactNode, useEffect } from "react";
import { Toaster } from "react-hot-toast";

import LicenseBanner from "@ee/components/LicenseBanner";

import classNames from "@lib/classNames";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@lib/telemetry";
import { trpc } from "@lib/trpc";

import { HeadSeo } from "@components/seo/head-seo";
import Avatar from "@components/ui/Avatar";

import Logo from "./Logo";

function useMeQuery() {
  const [session] = useSession();
  const meQuery = trpc.useQuery(["viewer.me"], {
    // refetch max once per 5s
    staleTime: 5000,
  });

  useEffect(() => {
    // refetch if sesion changes
    meQuery.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  return meQuery;
}

function useRedirectToLoginIfUnauthenticated() {
  const [session, loading] = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) {
      router.replace({
        pathname: "/auth/login",
        query: {
          callbackUrl: `${location.pathname}${location.search}`,
        },
      });
    }
  }, [loading, session, router]);
}

export default function Shell(props: {
  centered?: boolean;
  title?: string;
  heading: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  CTA?: ReactNode;
}) {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  useRedirectToLoginIfUnauthenticated();

  const telemetry = useTelemetry();
  const query = useMeQuery();

  const navigation = [
    {
      name: "Event Types",
      href: "/event-types",
      icon: LinkIcon,
      current: router.asPath.startsWith("/event-types"),
    },
    {
      name: "Meetings",
      href: "/meetings/upcoming",
      icon: ClockIcon,
      current: router.asPath.startsWith("/meetings"),
    },
    {
      name: "Availability",
      href: "/availability",
      icon: CalendarIcon,
      current: router.asPath.startsWith("/availability"),
    },
    {
      name: "Integrations",
      href: "/integrations",
      icon: PuzzleIcon,
      current: router.asPath.startsWith("/integrations"),
    },
    {
      name: "Settings",
      href: "/settings/profile",
      icon: CogIcon,
      current: router.asPath.startsWith("/settings"),
    },
  ];

  useEffect(() => {
    telemetry.withJitsu((jitsu) => {
      return jitsu.track(telemetryEventTypes.pageView, collectPageParameters(router.asPath));
    });
  }, [telemetry]);

  if (query.status !== "loading" && !query.data) {
    router.replace("/auth/login");
  }

  const pageTitle = typeof props.heading === "string" ? props.heading : props.title;

  return (
    <>
      <HeadSeo
        title={pageTitle ?? "Yac Meet"}
        description={props.subtitle ? props.subtitle?.toString() : ""}
        nextSeoProps={{
          nofollow: true,
          noindex: true,
        }}
      />
      <div>
        <Toaster position="bottom-right" />
      </div>

      <div className="flex h-screen overflow-hidden bg-gray-100">
        {/* Static sidebar for desktop */}
        <div className="hidden md:flex md:flex-shrink-0">
          <div className="flex flex-col w-56">
            {/* Sidebar component, swap this element with another sidebar if you like */}
            <div className="flex flex-col flex-1 h-0 bg-white border-r border-gray-200">
              <div className="flex flex-col flex-1 pt-5 pb-4 overflow-y-auto">
                <Link href="/event-types">
                  <a className="px-4">
                    <Logo />
                  </a>
                </Link>
                <nav className="flex-1 px-2 mt-5 space-y-1 bg-white">
                  {navigation.map((item) => (
                    <Link key={item.name} href={item.href}>
                      <a
                        className={classNames(
                          item.current
                            ? "bg-neutral-100 text-neutral-900"
                            : "text-neutral-500 hover:bg-gray-50 hover:text-neutral-900",
                          "group flex items-center px-2 py-2 text-sm font-medium rounded-sm"
                        )}>
                        <item.icon
                          className={classNames(
                            item.current
                              ? "text-neutral-800"
                              : "text-neutral-500 group-hover:text-neutral-500",
                            "mr-3 flex-shrink-0 h-5 w-5"
                          )}
                          aria-hidden="true"
                        />
                        {item.name}
                      </a>
                    </Link>
                  ))}
                </nav>
              </div>
              <div className="flex flex-shrink-0 p-4">
                <UserDropdown />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col flex-1 w-0 overflow-hidden">
          <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none max-w-[1700px]">
            {/* show top navigation for md and smaller (tablet and phones) */}
            <nav className="flex items-center justify-between p-4 bg-white shadow md:hidden">
              <Link href="/event-types">
                <a>
                  <Logo />
                </a>
              </Link>
              <div className="flex items-center self-center gap-3">
                <button className="p-2 text-gray-400 bg-white rounded-full hover:text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow">
                  <span className="sr-only">View notifications</span>
                  <Link href="/settings/profile">
                    <a>
                      <CogIcon className="w-6 h-6" aria-hidden="true" />
                    </a>
                  </Link>
                </button>
                <div className="mt-1">
                  <UserDropdown small bottom />
                </div>
              </div>
            </nav>
            <div className={classNames(props.centered && "md:max-w-5xl mx-auto", "py-8")}>
              <div className="block sm:flex justify-between px-4 sm:px-6 md:px-8 min-h-[80px]">
                <div className="w-full mb-8">
                  <h1 className="mb-1 text-xl font-bold tracking-wide text-gray-900 font-cal">
                    {props.heading}
                  </h1>
                  <p className="mr-4 text-sm text-neutral-500">{props.subtitle}</p>
                </div>
                <div className="flex-shrink-0 mb-4">{props.CTA}</div>
              </div>
              <div className="px-4 sm:px-6 md:px-8">{props.children}</div>

              {/* show bottom navigation for md and smaller (tablet and phones) */}
              <nav className="fixed bottom-0 flex w-full bg-white shadow bottom-nav md:hidden">
                {/* note(PeerRich): using flatMap instead of map to remove settings from bottom nav */}
                {navigation.flatMap((item, itemIdx) =>
                  item.name === "Settings" ? (
                    []
                  ) : (
                    <Link key={item.name} href={item.href}>
                      <a
                        className={classNames(
                          item.current ? "text-gray-900" : "text-neutral-400 hover:text-gray-700",
                          itemIdx === 0 ? "rounded-l-lg" : "",
                          itemIdx === navigation.length - 1 ? "rounded-r-lg" : "",
                          "group relative min-w-0 flex-1 overflow-hidden bg-white py-2 px-2 text-xs sm:text-sm font-medium text-center hover:bg-gray-50 focus:z-10"
                        )}
                        aria-current={item.current ? "page" : undefined}>
                        <item.icon
                          className={classNames(
                            item.current ? "text-gray-900" : "text-gray-400 group-hover:text-gray-500",
                            "block mx-auto flex-shrink-0 h-5 w-5 mb-1 text-center"
                          )}
                          aria-hidden="true"
                        />
                        <span>{item.name}</span>
                      </a>
                    </Link>
                  )
                )}
              </nav>

              {/* add padding to content for mobile navigation*/}
              <div className="block pt-12 md:hidden" />
            </div>
            <LicenseBanner />
          </main>
        </div>
      </div>
    </>
  );
}

function UserDropdown({ small, bottom }: { small?: boolean; bottom?: boolean }) {
  const query = useMeQuery();
  const user = query.data;

  return (
    <Menu as="div" className="relative inline-block w-full text-left">
      {({ open }) => (
        <>
          <div>
            {user && (
              <Menu.Button className="w-full text-sm font-medium text-left text-gray-700 rounded-md group focus:outline-none">
                <span className="flex items-center justify-between w-full">
                  <span className="flex items-center justify-between min-w-0 space-x-3">
                    <Avatar
                      imageSrc={user.avatar}
                      alt={user.username}
                      className={classNames(
                        small ? "w-8 h-8" : "w-10 h-10",
                        "bg-gray-300 rounded-full flex-shrink-0"
                      )}
                    />
                    {!small && (
                      <span className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-900 truncate">{user.name}</span>
                        <span className="text-sm font-normal truncate text-neutral-500">
                          /{user.username}
                        </span>
                      </span>
                    )}
                  </span>
                  {!small && (
                    <SelectorIcon
                      className="flex-shrink-0 w-5 h-5 text-gray-400 group-hover:text-gray-500"
                      aria-hidden="true"
                    />
                  )}
                </span>
              </Menu.Button>
            )}
          </div>
          <Transition
            show={open}
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95">
            <Menu.Items
              static
              className={classNames(
                bottom ? "origin-top top-1 right-0" : "origin-bottom bottom-14 left-0",
                "w-64 z-10 absolute mt-1 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-400 focus:outline-none"
              )}>
              <div className="py-1">
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`${process.env.NEXT_PUBLIC_APP_URL}/${user?.username || ""}`}
                  className="flex px-4 py-2 text-sm text-neutral-500">
                  View public page <ExternalLinkIcon className="w-3 h-3 mt-1 ml-1 text-neutral-400" />
                </a>
              </div>
              <div className="py-1">
                <Menu.Item>
                  {({ active }) => (
                    <a
                      onClick={() => signOut({ callbackUrl: "/auth/logout" })}
                      className={classNames(
                        active ? "bg-gray-100 text-gray-900" : "text-gray-700",
                        "flex px-4 py-2 text-sm font-medium"
                      )}>
                      <LogoutIcon
                        className={classNames(
                          "text-neutral-400 group-hover:text-neutral-500",
                          "mr-2 flex-shrink-0 h-5 w-5"
                        )}
                        aria-hidden="true"
                      />
                      Sign out
                    </a>
                  )}
                </Menu.Item>
              </div>
            </Menu.Items>
          </Transition>
        </>
      )}
    </Menu>
  );
}
