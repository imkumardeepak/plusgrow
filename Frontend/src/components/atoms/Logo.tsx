import React from "react";
import plusgrowIcon from "../../assets/plusgrow icon.png";

interface LogoProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties;
}

export const Logo = ({
  className,
  width = "100%",
  height = "auto",
  style,
}: LogoProps) => {
  return (
    <img
      src={plusgrowIcon}
      alt="Plusgrow"
      className={className}
      width={width}
      height={height}
      style={{ display: "block", ...style }}
    />
  );
};

export default Logo;
