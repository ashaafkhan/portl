import React from "react";
import { View, Text, ViewProps } from "react-native";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface BadgeProps extends ViewProps {
  label: string;
  variant?: "success" | "pending" | "warning" | "neutral";
  size?: "sm" | "md";
}

export function Badge({ label, variant = "neutral", size = "sm", className, ...props }: BadgeProps) {
  const variants = {
    success: "bg-green-100 text-green-800",
    pending: "bg-orange-100 text-orange-800",
    warning: "bg-red-100 text-red-800",
    neutral: "bg-neutral-100 text-neutral-800",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
  };

  return (
    <View className={cn("rounded-full self-start", variants[variant].split(" ")[0], className)} {...props}>
      <Text className={cn("font-medium", variants[variant].split(" ")[1], sizes[size])}>
        {label}
      </Text>
    </View>
  );
}
