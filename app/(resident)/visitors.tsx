import React from 'react';
import { View } from 'react-native';
import { Users } from 'lucide-react-native';
import { EmptyState } from '../../components/ui/EmptyState';

export default function VisitorsScreen() {
  return (
    <View className="flex-1 bg-white">
      <EmptyState 
        icon={Users}
        title="No Visitors"
        description="You haven't had any visitors recently."
      />
    </View>
  );
}
