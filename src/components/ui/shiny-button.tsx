import type React from "react";

export interface ShinyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  href?: string;
}

export function ShinyButton({
  children,
  onClick,
  className = "",
  href,
  ...props
}: ShinyButtonProps) {
  if (href) {
    return (
      <a
        href={href}
        className={`shiny-cta ${className}`}
        onClick={onClick}
      >
        <span>{children}</span>
      </a>
    );
  }

  return (
    <button
      className={`shiny-cta ${className}`}
      onClick={onClick}
      {...props}
    >
      <span>{children}</span>
    </button>
  );
}
