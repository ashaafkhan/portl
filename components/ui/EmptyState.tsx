import React from "react";
import { View, Text } from "react-native";
import { Image } from "expo-image";
import { Button } from "./Button";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}
import { LucideIcon } from "lucide-react-native";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <View className={cn("flex-1 items-center justify-center p-6", className)}>
      <View className="w-32 h-32 bg-neutral-100 rounded-full items-center justify-center mb-6">
        {Icon ? <Icon size={48} color="#A3A3A3" strokeWidth={1.5} /> : <Text className="text-4xl">📭</Text>}
      </View>
      <Text className="text-xl font-bold text-neutral-900 mb-2 text-center">{title}</Text>
      {description && (
        <Text className="text-base text-neutral-500 text-center mb-6">{description}</Text>
      )}
      {actionLabel && onAction && (
        <Button onPress={onAction} variant="outline" className="min-w-[160px]">
          {actionLabel}
        </Button>
      )}
    </View>
  );
}
