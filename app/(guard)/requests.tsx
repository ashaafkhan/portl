import React from 'react';
import { View } from 'react-native';
import { List } from 'lucide-react-native';
import { EmptyState } from '../../components/ui/EmptyState';

export default function RequestsScreen() {
  return (
    <View className="flex-1 bg-white">
      <EmptyState 
        icon={List}
        title="No Pending Requests"
        description="All visitor requests have been resolved."
      />
    </View>
  );
}
