import React from "react";
import { View, ViewProps, TouchableOpacity, TouchableOpacityProps } from "react-native";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface CardProps extends ViewProps {
  onPress?: TouchableOpacityProps["onPress"];
}

export function Card({ className, onPress, children, ...props }: CardProps) {
  const Component = onPress ? TouchableOpacity : View;
  return (
    <Component
      activeOpacity={0.8}
      onPress={onPress as any}
      className={cn(
        "bg-white rounded-2xl border border-neutral-100 p-4 shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
