import React from "react";
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps, View } from "react-native";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface ButtonProps extends TouchableOpacityProps {
  variant?: "default" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  className,
  variant = "default",
  size = "md",
  loading = false,
  disabled,
  children,
  leftIcon,
  rightIcon,
  ...props
}: ButtonProps) {
  const baseStyles = "flex-row items-center justify-center rounded-xl";
  
  const variants = {
    default: "bg-primary active:bg-primary-dark",
    secondary: "bg-neutral-100 active:bg-neutral-200",
    outline: "bg-transparent border border-neutral-200 active:bg-neutral-50",
    ghost: "bg-transparent active:bg-neutral-100",
    danger: "bg-danger active:bg-red-600",
  };

  const sizes = {
    sm: "px-3 py-2",
    md: "px-4 py-3",
    lg: "px-6 py-4",
  };

  const textVariants = {
    default: "text-white font-semibold",
    secondary: "text-neutral-900 font-medium",
    outline: "text-neutral-700 font-medium",
    ghost: "text-neutral-700 font-medium",
    danger: "text-white font-semibold",
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled || loading}
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        (disabled || loading) && "opacity-50",
        className
      )}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === "default" || variant === "danger" ? "white" : "#4B5563"} />
      ) : (
        <>
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          {typeof children === "string" ? (
            <Text className={cn(textVariants[variant], textSizes[size])}>{children}</Text>
          ) : (
            children
          )}
          {rightIcon && <View className="ml-2">{rightIcon}</View>}
        </>
      )}
    </TouchableOpacity>
  );
}
