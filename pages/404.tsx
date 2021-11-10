import { HomeIcon, ArrowCircleLeftIcon } from "@heroicons/react/outline";
import { ChevronRightIcon } from "@heroicons/react/solid";
import Link from "next/link";
import { useRouter } from "next/router";
import React from "react";

import { HeadSeo } from "@components/seo/head-seo";

export default function Custom404(props) {
  if (Math.random() > 1) {
    console.log(props);
  }
  const router = useRouter();
  return (
    <>
      <HeadSeo
        title="404: This page could not be found."
        description="404: This page could not be found."
        nextSeoProps={{
          nofollow: true,
          noindex: true,
        }}
      />
      <div className="min-h-screen px-4 bg-white">
        <main className="max-w-xl pt-16 pb-6 mx-auto sm:pt-24">
          <div className="text-center">
            <p className="text-sm font-semibold tracking-wide uppercase text-yellow">404 error</p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-gray-900 font-cal sm:text-5xl">
              This page does not exist.
            </h1>
            <span className="inline-block mt-2 text-lg ">
              Check for spelling mistakes or go back to the previous page.
            </span>
          </div>
          <div className="mt-12">
            <ul role="list" className="mt-4 border-gray-200 divide-y divide-gray-400">
              <li className="px-4 py-2">
                <div onClick={() => router.back()} className="cursor-pointer">
                  <a className="relative flex items-start py-6 space-x-4">
                    <div className="flex-shrink-0">
                      <span className="flex items-center justify-center w-12 h-12 rounded-lg bg-gray-50">
                        <ArrowCircleLeftIcon className="w-6 h-6 text-gray-700" aria-hidden="true" />
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-medium text-gray-900">
                        <span className="rounded-sm focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-gray-500">
                          <span className="absolute inset-0" aria-hidden="true" />
                          Go Back
                        </span>
                      </h3>
                      <p className="text-base text-gray-500">Go to the previous page.</p>
                    </div>
                    <div className="self-center flex-shrink-0">
                      <ChevronRightIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
                    </div>
                  </a>
                </div>
              </li>
              <li className="px-4 py-2">
                <Link href="/">
                  <a className="relative flex items-start py-6 space-x-4">
                    <div className="flex-shrink-0">
                      <span className="flex items-center justify-center w-12 h-12 rounded-lg bg-gray-50">
                        <HomeIcon className="w-6 h-6 text-gray-700" aria-hidden="true" />
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-medium text-gray-900">
                        <span className="rounded-sm focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-gray-500">
                          <span className="absolute inset-0" aria-hidden="true" />
                          Go Home
                        </span>
                      </h3>
                      <p className="text-base text-gray-500">Navigate home.</p>
                    </div>
                    <div className="self-center flex-shrink-0">
                      <ChevronRightIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
                    </div>
                  </a>
                </Link>
              </li>
            </ul>
          </div>
        </main>
      </div>
    </>
  );
}
