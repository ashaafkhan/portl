import React from 'react';
import { View } from 'react-native';
import { Building } from 'lucide-react-native';
import { EmptyState } from '../../components/ui/EmptyState';

export default function SocietyScreen() {
  return (
    <View className="flex-1 bg-white">
      <EmptyState 
        icon={Building}
        title="Society Management"
        description="Manage towers, flats, and residents here."
      />
    </View>
  );
}
