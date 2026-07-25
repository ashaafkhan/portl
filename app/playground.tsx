import React from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { Mail, ArrowRight } from "lucide-react-native";

export default function PlaygroundScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <Stack.Screen options={{ title: "Component Playground", headerShown: true }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} className="flex-1">
        
        <Text className="text-2xl font-bold mb-6 text-neutral-900">Buttons</Text>
        <View className="gap-4 mb-8">
          <Button variant="default" onPress={() => {}}>Default Button</Button>
          <Button variant="secondary" onPress={() => {}}>Secondary Button</Button>
          <Button variant="outline" onPress={() => {}}>Outline Button</Button>
          <Button variant="ghost" onPress={() => {}}>Ghost Button</Button>
          <Button variant="danger" onPress={() => {}}>Danger Button</Button>
          <Button loading variant="default">Loading</Button>
          <Button disabled variant="default">Disabled</Button>
          <Button leftIcon={<Mail color="white" size={20} />} variant="default">With Left Icon</Button>
          <Button rightIcon={<ArrowRight color="white" size={20} />} variant="default">With Right Icon</Button>
        </View>

        <Text className="text-2xl font-bold mb-6 text-neutral-900">Inputs</Text>
        <View className="mb-8">
          <Input label="Email Address" placeholder="you@example.com" leftIcon={<Mail color="#9CA3AF" size={20} />} />
          <Input label="Password" placeholder="Enter password" secureTextEntry error="Password is required" />
          <Input label="Disabled" placeholder="Cannot type here" editable={false} />
        </View>

        <Text className="text-2xl font-bold mb-6 text-neutral-900">Cards</Text>
        <View className="gap-4 mb-8">
          <Card>
            <Text className="text-lg font-bold mb-2">Basic Card</Text>
            <Text className="text-neutral-500">This is a basic card component used to group related information.</Text>
          </Card>
          <Card onPress={() => {}}>
            <Text className="text-lg font-bold mb-2 text-primary">Interactive Card</Text>
            <Text className="text-neutral-500">Tap me to see the active opacity effect in action.</Text>
          </Card>
        </View>

        <Text className="text-2xl font-bold mb-6 text-neutral-900">Badges</Text>
        <View className="flex-row flex-wrap gap-3 mb-8">
          <Badge label="Neutral" variant="neutral" />
          <Badge label="Success" variant="success" />
          <Badge label="Pending" variant="pending" />
          <Badge label="Warning" variant="warning" />
        </View>

        <Text className="text-2xl font-bold mb-6 text-neutral-900">Skeletons</Text>
        <View className="gap-4 mb-8">
          <Skeleton className="w-full h-32 rounded-xl" />
          <View className="flex-row items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-full" />
            <View className="flex-1 gap-2">
              <Skeleton className="w-3/4 h-4" />
              <Skeleton className="w-1/2 h-4" />
            </View>
          </View>
        </View>

        <Text className="text-2xl font-bold mb-6 text-neutral-900">Empty State</Text>
        <View className="mb-8 border border-neutral-100 rounded-2xl overflow-hidden h-80">
          <EmptyState 
            title="No Visitors Yet" 
            description="When someone arrives at the gate, their request will appear here."
            actionLabel="Refresh"
            onAction={() => {}}
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
