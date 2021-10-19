import { XIcon } from "@heroicons/react/outline";
import { useState } from "react";

export default function AddToHomescreen() {
  const [closeBanner, setCloseBanner] = useState(false);
  return <></>;
  if (typeof window !== "undefined") {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return <></>;
    }
  }
  return (
    !closeBanner && (
      <div className="fixed inset-x-0 bottom-0 pb-2 sm:hidden sm:pb-5">
        <div className="px-2 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="p-2 bg-gray-900 rounded-lg shadow-lg sm:p-3">
            <div className="flex flex-wrap items-center justify-between">
              <div className="flex items-center flex-1 w-0">
                <span className="flex p-2 bg-black rounded-lg bg-opacity-90">
                  <svg
                    className="fill-current text-gray-50 h-7 w-7"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 50 50"
                    enableBackground="new 0 0 50 50">
                    <path d="M30.3 13.7L25 8.4l-5.3 5.3-1.4-1.4L25 5.6l6.7 6.7z" />
                    <path d="M24 7h2v21h-2z" />
                    <path d="M35 40H15c-1.7 0-3-1.3-3-3V19c0-1.7 1.3-3 3-3h7v2h-7c-.6 0-1 .4-1 1v18c0 .6.4 1 1 1h20c.6 0 1-.4 1-1V19c0-.6-.4-1-1-1h-7v-2h7c1.7 0 3 1.3 3 3v18c0 1.7-1.3 3-3 3z" />
                  </svg>
                </span>
                <p className="ml-3 text-xs font-medium text-white">
                  <span className="inline">
                    Add this app to your home screen for faster access and improved experience.
                  </span>
                </p>
              </div>

              <div className="flex-shrink-0 order-2 sm:order-3 sm:ml-2">
                <button
                  onClick={() => setCloseBanner(true)}
                  type="button"
                  className="flex p-2 -mr-1 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-white">
                  <span className="sr-only">Dismiss</span>
                  <XIcon className="w-6 h-6 text-white" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  );
}
