import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../components/AuthProvider';

export default function AdminIndex() {
  const { signOut } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center p-6">
      <Text className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</Text>
      <Text className="text-gray-500 mb-8 text-center">You have successfully logged in as an administrator.</Text>
      
      <Button onPress={signOut} variant="outline" className="w-full">
        Sign Out
      </Button>
    </SafeAreaView>
  );
}
