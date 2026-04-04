import React from "react";
import plusgrowIcon from "../../assets/plusgrow icon.png";

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export const Logo = ({ className, width = 40, height = 40 }: LogoProps) => {
  return (
    <img
      src={plusgrowIcon}
      alt="Plusgrow"
      className={className}
      width={width}
      height={height}
    />
  );
};

export default Logo;
