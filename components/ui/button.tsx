import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "outline"
  | "outline-blue"
  | "outline-cyan"
  | "outline-purple";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-accent-cyan text-bg-base hover:brightness-110 focus:shadow-glow active:scale-95",
  secondary:
    "border border-accent-purple text-accent-purple hover:bg-accent-purple-dim active:scale-95",
  danger: "border border-danger text-danger hover:bg-red-500/10 active:scale-95",
  outline:
    "border border-fg-muted text-fg-muted hover:border-fg-secondary hover:text-fg-secondary active:scale-95",
  "outline-blue": "border border-blue-500 text-blue-500 hover:bg-blue-500/10 active:scale-95",
  "outline-cyan":
    "border border-accent-cyan text-accent-cyan hover:bg-accent-cyan-dim active:scale-95",
  "outline-purple":
    "border border-accent-purple text-accent-purple hover:bg-accent-purple-dim active:scale-95",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1 text-sm rounded-lg",
  md: "px-4 py-2 text-sm rounded-lg",
  lg: "px-6 py-3 text-base rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center gap-1.5 font-medium
          transition-all duration-200 cursor-pointer
          disabled:opacity-40 disabled:pointer-events-none
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
