import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { List, Clock, CheckCircle2, XCircle } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../components/AuthProvider';

export default function RequestsScreen() {
  const { session } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
    
    // Realtime subscription
    const channel = supabase
      .channel('visitor_requests_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitor_requests' }, () => {
        fetchRequests(); // Refetch on any change
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRequests = async () => {
    try {
      const { data: profile } = await supabase.from('profiles').select('society_id').eq('id', session?.user.id).single();
      
      if (profile?.society_id) {
        // Fetch requests for all flats in this society (via tower via flat)
        // Since we are guards, RLS allows viewing all requests in society.
        const { data, error } = await supabase
          .from('visitor_requests')
          .select(`
            id, status, created_at,
            visitors (name, category),
            flats (number, towers(name))
          `)
          .order('created_at', { ascending: false })
          .limit(20);
          
        if (error) throw error;
        setRequests(data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'pending': return <Clock color="#F59E0B" size={20} />;
      case 'approved': return <CheckCircle2 color="#10B981" size={20} />;
      case 'rejected': return <XCircle color="#EF4444" size={20} />;
      default: return <Clock color="#9CA3AF" size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return 'text-amber-500';
      case 'approved': return 'text-emerald-500';
      case 'rejected': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View className="bg-white p-4 rounded-2xl border border-neutral-200 mb-3 shadow-sm flex-row items-center justify-between">
      <View className="flex-1">
        <Text className="text-lg font-bold text-neutral-900">{item.visitors?.name}</Text>
        <Text className="text-neutral-500 capitalize">{item.visitors?.category} • Flat {item.flats?.towers?.name}-{item.flats?.number}</Text>
        <Text className="text-xs text-neutral-400 mt-1">
          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      <View className="items-center gap-1">
        {getStatusIcon(item.status)}
        <Text className={`text-xs font-bold capitalize ${getStatusColor(item.status)}`}>{item.status}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <View className="px-6 py-4 bg-white border-b border-neutral-200">
        <Text className="text-2xl font-bold text-neutral-900">Requests Log</Text>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : requests.length === 0 ? (
        <EmptyState 
          icon={List}
          title="No Requests"
          description="There are no recent visitor requests."
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
