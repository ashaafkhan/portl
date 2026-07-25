import React from 'react';
import { View } from 'react-native';
import { Shield } from 'lucide-react-native';
import { EmptyState } from '../../components/ui/EmptyState';

export default function GuardIndex() {
  return (
    <View className="flex-1 bg-white">
      <EmptyState 
        icon={Shield}
        title="Gate Registration"
        description="Select a visitor type to register."
      />
    </View>
  );
}
