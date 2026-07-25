import React from 'react';
import { View } from 'react-native';
import { FileText } from 'lucide-react-native';
import { EmptyState } from '../../components/ui/EmptyState';

export default function ContentScreen() {
  return (
    <View className="flex-1 bg-white">
      <EmptyState 
        icon={FileText}
        title="Content Management"
        description="Manage notices and polls here."
      />
    </View>
  );
}
