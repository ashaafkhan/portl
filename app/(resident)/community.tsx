import React from 'react';
import { View } from 'react-native';
import { Building2 } from 'lucide-react-native';
import { EmptyState } from '../../components/ui/EmptyState';

export default function CommunityScreen() {
  return (
    <View className="flex-1 bg-white">
      <EmptyState 
        icon={Building2}
        title="Community Board"
        description="Notices, polls, and amenities will appear here."
      />
    </View>
  );
}
