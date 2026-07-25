import React, { useState } from "react";
import { TextInput, View, Text, TextInputProps } from "react-native";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({ label, error, leftIcon, rightIcon, className, ...props }: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className={cn("w-full mb-4", className)}>
      {label && <Text className="text-sm font-medium text-neutral-700 mb-1.5">{label}</Text>}
      <View
        className={cn(
          "flex-row items-center border rounded-xl bg-neutral-50 px-3 py-3",
          isFocused ? "border-primary bg-white" : "border-neutral-200",
          error && "border-danger bg-red-50",
          props.editable === false && "bg-neutral-100 opacity-70"
        )}
      >
        {leftIcon && <View className="mr-2">{leftIcon}</View>}
        <TextInput
          className="flex-1 text-base text-neutral-900 placeholder:text-neutral-400"
          placeholderTextColor="#9CA3AF"
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
        {rightIcon && <View className="ml-2">{rightIcon}</View>}
      </View>
      {error && <Text className="text-sm text-danger mt-1">{error}</Text>}
    </View>
  );
}
