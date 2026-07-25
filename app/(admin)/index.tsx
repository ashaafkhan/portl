import React from 'react';
import { View } from 'react-native';
import { LayoutDashboard } from 'lucide-react-native';
import { EmptyState } from '../../components/ui/EmptyState';

export default function AdminIndex() {
  return (
    <View className="flex-1 bg-white">
      <EmptyState 
        icon={LayoutDashboard}
        title="Admin Dashboard"
        description="Overview of society activity will appear here."
      />
    </View>
  );
}
