import * as React from "react";
export const Button = ({className="", ...props}: React.ButtonHTMLAttributes<HTMLButtonElement>) =>
  <button className={className} {...props} />;
export default Button;
