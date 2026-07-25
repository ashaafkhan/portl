import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, Ticket, Plus, History } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../components/AuthProvider';

export default function VisitorsScreen() {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<'passes' | 'create' | 'history'>('passes');
  
  // Data
  const [passes, setPasses] = useState<any[]>([]);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [guestName, setGuestName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    } else if (activeTab === 'passes') {
      fetchPasses();
    }
  }, [activeTab]);

  const fetchPasses = async () => {
    setLoading(true);
    try {
      const { data: profile } = await supabase.from('profiles').select('flat_id').eq('id', session?.user.id).single();
      if (profile?.flat_id) {
        const { data, error } = await supabase.from('guest_preapprovals').select('*').eq('flat_id', profile.flat_id).order('created_at', { ascending: false });
        if (error) throw error;
        setPasses(data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data: profile } = await supabase.from('profiles').select('flat_id').eq('id', session?.user.id).single();
      if (profile?.flat_id) {
        const { data, error } = await supabase
          .from('visitor_requests')
          .select('id, status, created_at, decided_at, visitors(name, category, phone)')
          .eq('flat_id', profile.flat_id)
          .neq('status', 'pending')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setHistoryLogs(data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePass = async () => {
    if (!guestName) return Alert.alert('Error', 'Guest name is required');
    setSubmitting(true);
    try {
      const { data: profile } = await supabase.from('profiles').select('flat_id').eq('id', session?.user.id).single();
      if (!profile?.flat_id) throw new Error('Flat not found for resident');

      const qrToken = Math.random().toString(36).substring(2, 8).toUpperCase();
      const validFrom = new Date();
      const validUntil = new Date();
      validUntil.setHours(validUntil.getHours() + 24);

      const { error } = await supabase.from('guest_preapprovals').insert({
        flat_id: profile.flat_id, resident_id: session?.user.id, guest_name: guestName, valid_from: validFrom.toISOString(), valid_until: validUntil.toISOString(), qr_token: qrToken,
      });

      if (error) throw error;
      Alert.alert('Success', `Pass created! Share this code with your guest: ${qrToken}`);
      setGuestName('');
      setActiveTab('passes');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderPass = ({ item }: { item: any }) => {
    const isExpired = new Date(item.valid_until) < new Date();
    const isActive = item.status === 'active' && !isExpired;

    return (
      <View className="bg-white p-5 rounded-2xl border border-neutral-200 mb-4 flex-row items-center justify-between shadow-sm">
        <View className="flex-1">
          <Text className="text-lg font-bold text-neutral-900">{item.guest_name}</Text>
          <Text className="text-neutral-500 text-sm mt-1">Valid until {new Date(item.valid_until).toLocaleDateString()}</Text>
        </View>
        <View className={`px-4 py-2 rounded-lg items-center justify-center ${isActive ? 'bg-indigo-50 border border-indigo-200' : 'bg-neutral-100'}`}>
          <Text className={`font-mono text-xl font-bold tracking-widest ${isActive ? 'text-indigo-600' : 'text-neutral-400 line-through'}`}>{item.qr_token}</Text>
        </View>
      </View>
    );
  };

  const renderHistory = ({ item }: { item: any }) => (
    <View className="bg-white p-5 rounded-2xl border border-neutral-200 mb-4 shadow-sm">
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="text-lg font-bold text-neutral-900">{item.visitors?.name}</Text>
          <Text className="text-neutral-500 text-sm">{item.visitors?.phone}</Text>
        </View>
        <View className={`px-3 py-1 rounded-full ${item.status === 'approved' ? 'bg-emerald-100' : 'bg-red-100'}`}>
          <Text className={`text-xs font-bold uppercase tracking-wider ${item.status === 'approved' ? 'text-emerald-700' : 'text-red-700'}`}>
            {item.status}
          </Text>
        </View>
      </View>
      <View className="mt-2 flex-row justify-between items-center">
        <View className="bg-neutral-100 px-3 py-1 rounded-full">
          <Text className="text-neutral-600 text-xs font-bold uppercase tracking-wider">{item.visitors?.category}</Text>
        </View>
        <Text className="text-neutral-400 text-xs">{new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <View className="px-6 py-4 bg-white border-b border-neutral-200">
        <Text className="text-2xl font-bold text-neutral-900">Visitors</Text>
      </View>

      <View className="flex-row p-4 gap-2">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity onPress={() => setActiveTab('passes')} className={`px-4 py-2 rounded-full mr-2 ${activeTab === 'passes' ? 'bg-[#FF7A59]' : 'bg-neutral-200'}`}>
            <Text className={`font-semibold ${activeTab === 'passes' ? 'text-white' : 'text-neutral-600'}`}>My Passes</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('create')} className={`px-4 py-2 rounded-full mr-2 ${activeTab === 'create' ? 'bg-[#FF7A59]' : 'bg-neutral-200'}`}>
            <Text className={`font-semibold ${activeTab === 'create' ? 'text-white' : 'text-neutral-600'}`}>Create Pass</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('history')} className={`px-4 py-2 rounded-full ${activeTab === 'history' ? 'bg-[#FF7A59]' : 'bg-neutral-200'}`}>
            <Text className={`font-semibold ${activeTab === 'history' ? 'text-white' : 'text-neutral-600'}`}>History</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {activeTab === 'create' ? (
        <ScrollView className="flex-1 p-6">
          <View className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
            <View className="flex-row items-center gap-3 mb-6">
              <Ticket color="#FF7A59" size={24} />
              <Text className="text-xl font-bold">New Guest Pass</Text>
            </View>
            <Text className="text-neutral-600 mb-4">Generate a 6-digit entry code valid for the next 24 hours.</Text>
            <TextInput placeholder="Guest Full Name" value={guestName} onChangeText={setGuestName} className="bg-neutral-100 p-4 rounded-xl mb-6 text-lg" />
            <TouchableOpacity onPress={handleCreatePass} disabled={submitting} className={`p-4 rounded-xl flex-row justify-center items-center gap-2 ${submitting ? 'bg-coral-400' : 'bg-coral-500'}`} style={{ backgroundColor: submitting ? '#FFA38C' : '#FF7A59' }}>
              {submitting ? <ActivityIndicator color="white" /> : <><Plus color="white" size={20} /><Text className="text-white font-bold text-lg">Generate Pass</Text></>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <View className="flex-1 px-6 pt-4">
          {loading ? (
            <ActivityIndicator size="large" color="#FF7A59" />
          ) : activeTab === 'passes' ? (
            passes.length === 0 ? (
              <EmptyState icon={Ticket} title="No Passes" description="You haven't generated any guest passes." />
            ) : (
              <FlatList data={passes} keyExtractor={item => item.id} renderItem={renderPass} showsVerticalScrollIndicator={false} />
            )
          ) : (
            historyLogs.length === 0 ? (
              <EmptyState icon={History} title="No History" description="No visitors have arrived for your flat yet." />
            ) : (
              <FlatList data={historyLogs} keyExtractor={item => item.id} renderItem={renderHistory} showsVerticalScrollIndicator={false} />
            )
          )}
        </View>
      )}
    </SafeAreaView>
  );
}
