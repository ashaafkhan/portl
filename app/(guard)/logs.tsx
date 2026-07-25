import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, History, ShieldAlert } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../components/AuthProvider';

export default function GuardLogs() {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<'on_premises' | 'history'>('on_premises');
  
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [activeTab]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Fetch logs
      let query = supabase.from('entry_exit_logs').select('*').order('entry_time', { ascending: false });
      
      if (activeTab === 'on_premises') {
        query = query.is('exit_time', null);
      } else {
        query = query.not('exit_time', 'is', null);
      }

      const { data: logsData, error: logsError } = await query;
      if (logsError) throw logsError;

      if (!logsData || logsData.length === 0) {
        setLogs([]);
        return;
      }

      // Fetch related visitor requests for 'request' type logs
      const requestIds = logsData.filter(l => l.ref_type === 'request').map(l => l.ref_id);
      
      if (requestIds.length > 0) {
        const { data: requestsData, error: reqError } = await supabase
          .from('visitor_requests')
          .select(`
            id,
            visitors (name, category, phone),
            flats (number, towers(name))
          `)
          .in('id', requestIds);
          
        if (reqError) throw reqError;

        // Merge
        const mergedLogs = logsData.map(log => {
          if (log.ref_type === 'request') {
            const req = requestsData.find(r => r.id === log.ref_id);
            return { ...log, request: req };
          }
          return log;
        });

        setLogs(mergedLogs);
      } else {
        setLogs(logsData);
      }

    } catch (error: any) {
      console.error(error);
      Alert.alert("Error fetching logs", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkExit = async (logId: string) => {
    try {
      const { error } = await supabase
        .from('entry_exit_logs')
        .update({ exit_time: new Date().toISOString(), guard_id: session?.user.id })
        .eq('id', logId);

      if (error) throw error;
      
      Alert.alert("Success", "Visitor marked as exited.");
      fetchLogs(); // refresh
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  const renderLog = ({ item }: { item: any }) => {
    if (!item.request) return null; // Skip if request data not found
    
    const { name, category } = item.request.visitors || {};
    const flatStr = item.request.flats ? `${item.request.flats.towers?.name} - ${item.request.flats.number}` : 'Unknown Flat';

    return (
      <View className="bg-white p-5 rounded-2xl border border-neutral-200 mb-4 shadow-sm">
        <View className="flex-row justify-between items-start mb-2">
          <View className="flex-1">
            <Text className="text-xl font-bold text-neutral-900">{name}</Text>
            <Text className="text-neutral-500 font-semibold">{flatStr}</Text>
          </View>
          <View className="bg-neutral-100 px-3 py-1 rounded-full">
            <Text className="text-neutral-600 text-xs font-bold uppercase tracking-wider">{category}</Text>
          </View>
        </View>

        <View className="mt-2 mb-4">
          <Text className="text-neutral-400 text-sm">
            Entered: {new Date(item.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {item.exit_time && (
            <Text className="text-neutral-400 text-sm mt-1">
              Exited: {new Date(item.exit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>

        {!item.exit_time && (
          <TouchableOpacity 
            onPress={() => handleMarkExit(item.id)}
            className="bg-indigo-600 p-3 rounded-xl flex-row justify-center items-center gap-2"
          >
            <LogOut color="white" size={18} />
            <Text className="text-white font-bold">Mark Exit</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <View className="px-6 py-4 bg-white border-b border-neutral-200">
        <Text className="text-2xl font-bold text-neutral-900">Gate Logs</Text>
      </View>

      <View className="flex-row p-4 gap-2">
        <TouchableOpacity 
          onPress={() => setActiveTab('on_premises')}
          className={`px-4 py-2 rounded-full ${activeTab === 'on_premises' ? 'bg-indigo-600' : 'bg-neutral-200'}`}
        >
          <Text className={`font-semibold ${activeTab === 'on_premises' ? 'text-white' : 'text-neutral-600'}`}>On Premises</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-full ${activeTab === 'history' ? 'bg-indigo-600' : 'bg-neutral-200'}`}
        >
          <Text className={`font-semibold ${activeTab === 'history' ? 'text-white' : 'text-neutral-600'}`}>History</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-1 px-6 pt-4">
        {loading ? (
          <ActivityIndicator size="large" color="#4F46E5" />
        ) : logs.length === 0 ? (
          <EmptyState 
            icon={activeTab === 'on_premises' ? ShieldAlert : History}
            title={activeTab === 'on_premises' ? "Nobody Inside" : "No History"}
            description={activeTab === 'on_premises' ? "All visitors have exited the premises." : "No visitor logs found."}
          />
        ) : (
          <FlatList
            data={logs}
            keyExtractor={item => item.id}
            renderItem={renderLog}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
