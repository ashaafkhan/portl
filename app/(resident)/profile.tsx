import React from 'react';
import { View } from 'react-native';
import { User } from 'lucide-react-native';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../components/AuthProvider';

export default function ProfileScreen() {
  const { signOut } = useAuth();
  
  return (
    <View className="flex-1 bg-white">
      <EmptyState 
        icon={User}
        title="Your Profile"
        description="Manage your account settings here."
        actionLabel="Sign Out"
        onAction={signOut}
      />
    </View>
  );
}
