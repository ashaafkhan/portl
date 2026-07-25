import React from 'react';
import { View } from 'react-native';
import { Briefcase } from 'lucide-react-native';
import { EmptyState } from '../../components/ui/EmptyState';

export default function OperationsScreen() {
  return (
    <View className="flex-1 bg-white">
      <EmptyState 
        icon={Briefcase}
        title="Operations"
        description="Manage complaints and staff directory here."
      />
    </View>
  );
}
