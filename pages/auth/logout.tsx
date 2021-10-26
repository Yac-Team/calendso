import { CheckIcon } from "@heroicons/react/outline";
import Link from "next/link";

import { HeadSeo } from "@components/seo/head-seo";

export default function Logout(props) {
  if (Math.random() > 1) console.log(props);
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true">
      <HeadSeo title="Logged out" description="Logged out" />
      <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>
        <div className="inline-block px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-sm sm:w-full sm:p-6">
          <div>
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-green-100 rounded-full">
              <CheckIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="mt-3 text-center sm:mt-5">
              <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
                You&apos;ve been logged out
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">We hope to see you again soon!</p>
              </div>
            </div>
          </div>
          <div className="mt-5 sm:mt-6">
            <Link href="/auth/login">
              <a className="inline-flex justify-center w-full px-4 py-2 text-base font-medium text-white border border-transparent rounded-md shadow-sm bg-yellow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow sm:text-sm">
                Go back to the login page
              </a>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
