import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Check, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/supabase';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../components/AuthProvider';

export default function ResidentIndex() {
  const { session } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingRequests();
    
    // Realtime subscription for visitor requests
    const channel = supabase
      .channel('resident_visitor_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitor_requests' }, () => {
        fetchPendingRequests(); // Refetch on any change
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPendingRequests = async () => {
    try {
      const { data: profile } = await supabase.from('profiles').select('flat_id').eq('id', session?.user.id).single();
      
      if (profile?.flat_id) {
        const { data, error } = await supabase
          .from('visitor_requests')
          .select(`
            id, status, created_at,
            visitors (name, category, phone)
          `)
          .eq('flat_id', profile.flat_id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        setRequests(data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (requestId: string, newStatus: 'approved' | 'rejected') => {
    try {
      if (newStatus === 'approved') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      const { error } = await supabase
        .from('visitor_requests')
        .update({ status: newStatus, decided_by: session?.user.id, decided_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) throw error;
      
      // Auto-create entry log for approved visitors
      if (newStatus === 'approved') {
        const { error: logError } = await supabase
          .from('entry_exit_logs')
          .insert({
            ref_type: 'request',
            ref_id: requestId,
            // guard_id is null since it's auto-logged via resident approval
          });
          
        if (logError) console.error("Error creating entry log:", logError);
      }
      
      // Update local state instantly for snappy UI
      setRequests(requests.filter(r => r.id !== requestId));
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View className="bg-white p-6 rounded-3xl border border-neutral-200 mb-4 shadow-sm">
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center gap-2">
          <View className="bg-amber-100 px-3 py-1 rounded-full">
            <Text className="text-amber-600 text-xs font-bold uppercase tracking-wider">
              {item.visitors?.category}
            </Text>
          </View>
          <Text className="text-neutral-400 text-xs">
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
      
      <Text className="text-2xl font-bold text-neutral-900 mb-1">{item.visitors?.name}</Text>
      {item.visitors?.phone && (
        <Text className="text-neutral-500 mb-6">{item.visitors?.phone}</Text>
      )}

      <View className="flex-row gap-3 mt-4">
        <TouchableOpacity 
          onPress={() => handleUpdateStatus(item.id, 'rejected')}
          className="flex-1 bg-red-50 p-4 rounded-xl flex-row justify-center items-center gap-2"
        >
          <X color="#EF4444" size={20} />
          <Text className="text-red-500 font-bold text-lg">Deny</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => handleUpdateStatus(item.id, 'approved')}
          className="flex-1 bg-emerald-500 p-4 rounded-xl flex-row justify-center items-center gap-2"
        >
          <Check color="white" size={20} />
          <Text className="text-white font-bold text-lg">Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <View className="px-6 py-4 bg-white border-b border-neutral-200 flex-row justify-between items-center">
        <Text className="text-2xl font-bold text-neutral-900">Live Feed</Text>
        {requests.length > 0 && (
          <View className="bg-red-500 h-3 w-3 rounded-full absolute right-6 top-6" />
        )}
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FF7A59" />
        </View>
      ) : requests.length === 0 ? (
        <EmptyState 
          icon={Bell}
          title="All clear!"
          description="No pending visitors right now."
        />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 24 }}
        />
      )}
    </SafeAreaView>
  );
}
