import React from "react";

const UsernameInput = React.forwardRef((props, ref) => (
  // todo, check if username is already taken here?
  <div>
    <label htmlFor="username" className="block text-sm font-medium text-gray-700">
      {props.label ? props.label : "Username"}
    </label>
    <div className="flex mt-1 rounded-md shadow-sm">
      <span className="inline-flex items-center px-3 text-gray-500 border border-r-0 border-gray-300 rounded-l-sm bg-gray-50 sm:text-sm">
        {process.env.NEXT_PUBLIC_APP_URL}/{props.label && "team/"}
      </span>
      <input
        disabled={props.disabled}
        ref={ref}
        type="text"
        name="username"
        id="username"
        autoComplete="username"
        required
        {...props}
        className="flex-grow block w-full min-w-0 text-gray-500 placeholder-gray-600 lowercase bg-gray-400 border-gray-300 rounded-none rounded-r-sm focus:ring-yellow focus:border-yellow sm:text-sm"
      />
    </div>
  </div>
));

UsernameInput.displayName = "UsernameInput";

export { UsernameInput };
