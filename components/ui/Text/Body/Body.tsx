import classnames from "classnames";
import React from "react";

import { TextProps } from "../Text";

const Body: React.FunctionComponent<TextProps> = (props: TextProps) => {
  const classes = classnames("text-gray-900 ", props?.className);

  return <p className={classes}>{props?.text || props.children}</p>;
};

export default Body;
