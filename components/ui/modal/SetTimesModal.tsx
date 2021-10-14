import { ClockIcon } from "@heroicons/react/outline";
import { useRef, useState } from "react";

export default function SetTimesModal(props) {
  const [startHours, startMinutes] = [
    Math.floor(props.startTime / 60) === 0
      ? 12
      : Math.floor(props.startTime / 60) > 12
      ? Math.floor(props.startTime / 60) - 12
      : Math.floor(props.startTime / 60),
    props.startTime % 60,
  ];
  const [endHours, endMinutes] = [
    Math.floor(props.endTime / 60) === 0
      ? 12
      : Math.floor(props.endTime / 60) > 12
      ? Math.floor(props.endTime / 60) - 12
      : Math.floor(props.endTime / 60),
    props.endTime % 60,
  ];

  const [startIsPM, setStartIsPM] = useState(Number(Math.floor(props.startTime / 60) > 12));
  const [endIsPM, setEndIsPM] = useState(Number(Math.floor(props.endTime / 60) > 12));

  const startHoursRef = useRef<HTMLInputElement>();
  const startMinsRef = useRef<HTMLInputElement>();
  const endHoursRef = useRef<HTMLInputElement>();
  const endMinsRef = useRef<HTMLInputElement>();

  function updateStartEndTimesHandler(event) {
    event.preventDefault();

    const startHours12Hour = parseInt(startHoursRef.current.value);
    const endHours12Hour = parseInt(endHoursRef.current.value);

    const enteredStartHours = startIsPM
      ? startHours12Hour + 12
      : startHours12Hour === 12
      ? 0
      : startHours12Hour;
    const enteredStartMins = parseInt(startMinsRef.current.value);
    const enteredEndHours = endIsPM ? endHours12Hour + 12 : endHours12Hour === 12 ? 0 : endHours12Hour;
    const enteredEndMins = parseInt(endMinsRef.current.value);

    props.onChange({
      startTime: enteredStartHours * 60 + enteredStartMins,
      endTime: enteredEndHours * 60 + enteredEndMins,
    });

    props.onExit(0);
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true">
      <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 z-0 transition-opacity bg-gray-500 bg-opacity-75"
          aria-hidden="true"></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="mb-4 sm:flex sm:items-start">
            <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 mx-auto bg-gray-900 rounded-full sm:mx-0 sm:h-10 sm:w-10">
              <ClockIcon className="w-6 h-6 text-black" />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
                Change when you are available for bookings
              </h3>
              <div>
                <p className="text-sm text-gray-500">Set your work schedule</p>
              </div>
            </div>
          </div>
          <div className="flex mb-4">
            <label className="block w-1/4 pt-2 text-sm font-medium text-gray-700">Start time</label>
            <div>
              <label htmlFor="startHours" className="sr-only">
                Hours
              </label>
              <input
                ref={startHoursRef}
                type="number"
                min="0"
                max={startIsPM ? "11" : "12"}
                maxLength="2"
                name="hours"
                id="startHours"
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm"
                placeholder="9"
                defaultValue={startHours}
              />
            </div>
            <span className="pt-1 mx-2 text-gray-900">:</span>
            <div>
              <label htmlFor="startMinutes" className="sr-only">
                Minutes
              </label>
              <input
                ref={startMinsRef}
                type="number"
                min="0"
                max="59"
                step="15"
                maxLength="2"
                name="minutes"
                id="startMinutes"
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm"
                placeholder="30"
                defaultValue={startMinutes}
              />
            </div>
            <span className="pt-1 mx-2"></span>
            <div>
              <label htmlFor="startAMPM" className="sr-only">
                AM/PM
              </label>
              <select
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm"
                name="AMPM"
                value={String(startIsPM)}
                onChange={(e) => {
                  setStartIsPM(Number(e.target.value));
                }}
                id="startAMPM">
                <option value="0">AM</option>
                <option value="1">PM</option>
              </select>
            </div>
          </div>
          <div className="flex">
            <label className="block w-1/4 pt-2 text-sm font-medium text-gray-700">End time</label>
            <div>
              <label htmlFor="endHours" className="sr-only">
                Hours
              </label>
              <input
                ref={endHoursRef}
                type="number"
                min="0"
                max={endIsPM ? "11" : "12"}
                maxLength="2"
                name="hours"
                id="endHours"
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm"
                placeholder="17"
                defaultValue={endHours}
              />
            </div>
            <span className="pt-1 mx-2 text-gray-900">:</span>
            <div>
              <label htmlFor="endMinutes" className="sr-only">
                Minutes
              </label>
              <input
                ref={endMinsRef}
                type="number"
                min="0"
                max="59"
                maxLength="2"
                step="15"
                name="minutes"
                id="endMinutes"
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm"
                placeholder="30"
                defaultValue={endMinutes}
              />
            </div>
            <span className="pt-1 mx-2"></span>
            <div>
              <label htmlFor="endAMPM" className="sr-only">
                AM/PM
              </label>
              <select
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm"
                name="AMPM"
                value={String(endIsPM)}
                onChange={(e) => {
                  setEndIsPM(Number(e.target.value));
                }}
                id="endAMPM">
                <option value="0">AM</option>
                <option value="1">PM</option>
              </select>
            </div>
          </div>
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button onClick={updateStartEndTimesHandler} type="submit" className="btn btn-primary">
              Save
            </button>
            <button onClick={props.onExit} type="button" className="mr-2 btn btn-white">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
