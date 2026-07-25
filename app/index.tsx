import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";

export default function Index() {
  return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center">
      <View className="items-center justify-center p-4">
        <Text className="text-3xl font-bold text-indigo-600 mb-4">Hello Portl</Text>
        <Text className="text-gray-600 text-center mb-8">
          This is the Stage 1 Foundation test screen.
        </Text>
        
        <View className="gap-4 w-full max-w-sm">
          <Link href="/(auth)" className="bg-indigo-600 text-white p-4 rounded-xl text-center font-bold">
            Go to Auth
          </Link>
          <Link href="/(resident)" className="bg-coral-500 text-white p-4 rounded-xl text-center font-bold" style={{ backgroundColor: '#FF7A59' }}>
            Go to Resident
          </Link>
          <Link href="/(guard)" className="bg-indigo-800 text-white p-4 rounded-xl text-center font-bold">
            Go to Guard
          </Link>
          <Link href="/(admin)" className="bg-gray-800 text-white p-4 rounded-xl text-center font-bold">
            Go to Admin
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}
