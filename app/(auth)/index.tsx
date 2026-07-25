import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";

export default function AuthIndex() {
  return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center">
      <Text className="text-2xl font-bold mb-4">Auth Flow</Text>
      <Link href="/" className="text-indigo-600 underline">Back to Home</Link>
    </SafeAreaView>
  );
}
