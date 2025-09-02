import * as React from "react";
export const Label = ({className="", ...props}: React.LabelHTMLAttributes<HTMLLabelElement>) =>
  <label className={className} {...props} />;
export default Label;
