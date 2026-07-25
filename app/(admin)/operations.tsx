import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, FlatList, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Briefcase, UserPlus, ShieldAlert, CheckCircle, ClipboardList, X, Users, BadgeCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/supabase';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../components/AuthProvider';

export default function OperationsScreen() {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<'complaints' | 'guards' | 'logs' | 'service_staff'>('complaints');
  
  // Guard Invite States
  const [guardName, setGuardName] = useState('');
  const [guardPhone, setGuardPhone] = useState('+91');

  // Service Staff States
  const [staffName, setStaffName] = useState('');
  const [staffCategory, setStaffCategory] = useState('Maid');
  const [staffPhone, setStaffPhone] = useState('+91');
  const [serviceStaffList, setServiceStaffList] = useState<any[]>([]);

  // Data States
  const [complaints, setComplaints] = useState<any[]>([]);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Resolution Modal State
  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [resolvingComplaintId, setResolvingComplaintId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolving, setResolving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (activeTab === 'complaints') {
      fetchComplaints();
    } else if (activeTab === 'logs') {
      fetchLogs();
    } else if (activeTab === 'service_staff') {
      fetchServiceStaff();
    }
  }, [activeTab]);

  const fetchServiceStaff = async () => {
    setLoading(true);
    try {
      const { data: profile } = await supabase.from('profiles').select('society_id').eq('id', session?.user.id).single();
      if (profile?.society_id) {
        const { data, error } = await supabase
          .from('staff_directory')
          .select('*')
          .eq('society_id', profile.society_id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setServiceStaffList(data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async () => {
    if (!staffName || staffPhone.length < 10) return Alert.alert('Error', 'Valid name and phone required');
    setSubmitting(true);
    try {
      const { data: profile } = await supabase.from('profiles').select('society_id').eq('id', session?.user.id).single();
      const { error } = await supabase.from('staff_directory').insert({ 
        society_id: profile?.society_id, 
        name: staffName, 
        category: staffCategory,
        phone: staffPhone,
        verified: true 
      });
      if (error) throw error;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Service staff added to directory!');
      setStaffName(''); setStaffPhone('+91');
      fetchServiceStaff();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyStaff = async (staffId: string, currentStatus: boolean) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const { error } = await supabase.from('staff_directory').update({ verified: !currentStatus }).eq('id', staffId);
      if (error) throw error;
      setServiceStaffList(serviceStaffList.map(s => s.id === staffId ? { ...s, verified: !currentStatus } : s));
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const { data: profile } = await supabase.from('profiles').select('society_id').eq('id', session?.user.id).single();
      
      if (profile?.society_id) {
        const { data, error } = await supabase
          .from('complaints')
          .select(`id, title, description, status, created_at, category, admin_note, profiles:resident_id (full_name, flats(number, towers(name)))`)
          .eq('society_id', profile.society_id)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        setComplaints(data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data: logsData, error: logsError } = await supabase
        .from('entry_exit_logs')
        .select('*')
        .order('entry_time', { ascending: false })
        .limit(100);

      if (logsError) throw logsError;

      if (!logsData || logsData.length === 0) {
        setHistoryLogs([]);
        return;
      }

      const requestIds = logsData.filter(l => l.ref_type === 'request').map(l => l.ref_id);
      if (requestIds.length > 0) {
        const { data: requestsData, error: reqError } = await supabase
          .from('visitor_requests')
          .select(`id, visitors(name, category, phone), flats(number, towers(name))`)
          .in('id', requestIds);
        
        if (reqError) throw reqError;

        const merged = logsData.map(log => {
          if (log.ref_type === 'request') {
             return { ...log, request: requestsData.find(r => r.id === log.ref_id) };
          }
          return log;
        });
        setHistoryLogs(merged);
      } else {
        setHistoryLogs(logsData);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openResolveModal = (id: string) => {
    setResolvingComplaintId(id);
    setResolutionNote('');
    setResolveModalVisible(true);
  };

  const handleResolveComplaint = async () => {
    if (!resolvingComplaintId) return;
    setResolving(true);
    try {
      const { error } = await supabase
        .from('complaints')
        .update({ status: 'resolved', admin_note: resolutionNote || null })
        .eq('id', resolvingComplaintId);
        
      if (error) {
        if (error.code === 'PGRST204') {
          Alert.alert('Database Update Required', 'Please run the SQL command to add admin_note column first!');
          setResolveModalVisible(false);
          return;
        }
        throw error;
      }
      
      setComplaints(complaints.map(c => 
        c.id === resolvingComplaintId 
          ? { ...c, status: 'resolved', admin_note: resolutionNote || null } 
          : c
      ));
      setResolveModalVisible(false);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setResolving(false);
    }
  };

  const handleInviteGuard = async () => {
    if (!guardName || guardPhone.length < 10) return Alert.alert('Error', 'Valid name and phone required');
    try {
      const { data: profile } = await supabase.from('profiles').select('society_id').eq('id', session?.user.id).single();
      const { error } = await supabase.from('invites').insert({ society_id: profile?.society_id, role: 'guard', full_name: guardName, phone: guardPhone });
      if (error) throw error;
      Alert.alert('Success', 'Guard invited!');
      setGuardName(''); setGuardPhone('+91');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const renderComplaint = ({ item }: { item: any }) => (
    <View className="bg-white p-5 rounded-2xl border border-neutral-200 mb-4 shadow-sm">
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="text-lg font-bold text-neutral-900">{item.title}</Text>
          <Text className="text-neutral-500 font-semibold text-sm">
            {item.profiles?.full_name} • {item.profiles?.flats?.towers?.name}-{item.profiles?.flats?.number}
          </Text>
        </View>
        <View className={`px-3 py-1 rounded-full ${item.status === 'resolved' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
          <Text className={`text-xs font-bold uppercase tracking-wider ${item.status === 'resolved' ? 'text-emerald-700' : 'text-amber-700'}`}>{item.status}</Text>
        </View>
      </View>
      <Text className="text-neutral-600 my-3">{item.description}</Text>
      
      {item.admin_note && (
        <View className="mb-3 bg-neutral-50 p-3 rounded-lg border border-neutral-100">
          <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Resolution Note</Text>
          <Text className="text-neutral-700">{item.admin_note}</Text>
        </View>
      )}

      <View className="flex-row justify-between items-center mt-2 pt-4 border-t border-neutral-100">
        <Text className="text-neutral-400 text-xs">{new Date(item.created_at).toLocaleDateString()}</Text>
        {item.status === 'open' && (
          <TouchableOpacity onPress={() => openResolveModal(item.id)} className="bg-emerald-50 px-4 py-2 rounded-lg flex-row items-center gap-1">
            <CheckCircle color="#10B981" size={16} />
            <Text className="text-emerald-600 font-bold">Mark Resolved</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderLog = ({ item }: { item: any }) => {
    if (!item.request) return null;
    const { name, category } = item.request.visitors || {};
    const flatStr = item.request.flats ? `${item.request.flats.towers?.name} - ${item.request.flats.number}` : 'Unknown Flat';

    return (
      <View className="bg-white p-5 rounded-2xl border border-neutral-200 mb-4 shadow-sm">
        <View className="flex-row justify-between items-start mb-2">
          <View className="flex-1">
            <Text className="text-lg font-bold text-neutral-900">{name}</Text>
            <Text className="text-neutral-500 font-semibold">{flatStr}</Text>
          </View>
          <View className="bg-neutral-100 px-3 py-1 rounded-full">
            <Text className="text-neutral-600 text-xs font-bold uppercase tracking-wider">{category}</Text>
          </View>
        </View>
        <View className="mt-2 flex-row gap-4">
          <View>
            <Text className="text-neutral-400 text-xs uppercase tracking-wider font-bold mb-1">Entry</Text>
            <Text className="text-neutral-700 font-medium">{new Date(item.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
          <View>
            <Text className="text-neutral-400 text-xs uppercase tracking-wider font-bold mb-1">Exit</Text>
            <Text className="text-neutral-700 font-medium">{item.exit_time ? new Date(item.exit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Inside'}</Text>
          </View>
          <View>
            <Text className="text-neutral-400 text-xs uppercase tracking-wider font-bold mb-1">Date</Text>
            <Text className="text-neutral-700 font-medium">{new Date(item.entry_time).toLocaleDateString()}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderStaff = ({ item }: { item: any }) => (
    <View className="bg-white p-4 rounded-2xl border border-neutral-200 mb-3 shadow-sm flex-row items-center justify-between">
      <View className="flex-1">
        <Text className="text-lg font-bold text-neutral-900 flex-row items-center gap-1">
          {item.name} {item.verified && <CheckCircle color="#10B981" size={16} />}
        </Text>
        <Text className="text-neutral-500">{item.category} • {item.phone}</Text>
      </View>
      <TouchableOpacity 
        onPress={() => handleVerifyStaff(item.id, item.verified)}
        className={`px-3 py-1 rounded-full border ${item.verified ? 'border-emerald-200 bg-emerald-50' : 'border-neutral-200 bg-neutral-100'}`}
      >
        <Text className={`text-xs font-bold uppercase ${item.verified ? 'text-emerald-700' : 'text-neutral-600'}`}>
          {item.verified ? 'Verified' : 'Verify'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <View className="px-6 py-4 bg-white border-b border-neutral-200">
        <Text className="text-2xl font-bold text-neutral-900">Operations</Text>
      </View>

      <View className="flex-row p-4 gap-2">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity onPress={() => setActiveTab('complaints')} className={`px-4 py-2 rounded-full mr-2 ${activeTab === 'complaints' ? 'bg-indigo-600' : 'bg-neutral-200'}`}>
            <Text className={`font-semibold ${activeTab === 'complaints' ? 'text-white' : 'text-neutral-600'}`}>Complaints</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('service_staff')} className={`px-4 py-2 rounded-full mr-2 ${activeTab === 'service_staff' ? 'bg-indigo-600' : 'bg-neutral-200'}`}>
            <Text className={`font-semibold ${activeTab === 'service_staff' ? 'text-white' : 'text-neutral-600'}`}>Service Staff</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('guards')} className={`px-4 py-2 rounded-full mr-2 ${activeTab === 'guards' ? 'bg-indigo-600' : 'bg-neutral-200'}`}>
            <Text className={`font-semibold ${activeTab === 'guards' ? 'text-white' : 'text-neutral-600'}`}>Security Staff</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('logs')} className={`px-4 py-2 rounded-full mr-2 ${activeTab === 'logs' ? 'bg-indigo-600' : 'bg-neutral-200'}`}>
            <Text className={`font-semibold ${activeTab === 'logs' ? 'text-white' : 'text-neutral-600'}`}>Logs</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {activeTab === 'guards' ? (
        <ScrollView className="flex-1 p-6">
          <View className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
            <View className="flex-row items-center gap-3 mb-6">
              <UserPlus color="#4F46E5" size={24} />
              <Text className="text-xl font-bold">Invite Security Guard</Text>
            </View>
            <TextInput placeholder="Guard Full Name" value={guardName} onChangeText={setGuardName} className="bg-neutral-100 p-4 rounded-xl mb-4 text-lg" />
            <TextInput placeholder="Phone Number (+91...)" value={guardPhone} onChangeText={setGuardPhone} keyboardType="phone-pad" className="bg-neutral-100 p-4 rounded-xl mb-6 text-lg" />
            <TouchableOpacity onPress={handleInviteGuard} className="bg-indigo-600 p-4 rounded-xl flex-row justify-center items-center gap-2">
              <UserPlus color="white" size={20} />
              <Text className="text-white font-bold text-lg">Send Guard Invite</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : activeTab === 'service_staff' ? (
        <View className="flex-1 p-6 pt-0">
          <View className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm mb-6">
            <View className="flex-row items-center gap-2 mb-4">
              <BadgeCheck color="#4F46E5" size={20} />
              <Text className="font-bold text-lg text-neutral-900">Add Service Provider</Text>
            </View>
            <TextInput placeholder="Full Name (e.g. Raju)" value={staffName} onChangeText={setStaffName} className="bg-neutral-100 p-3 rounded-xl mb-3" />
            
            <View className="flex-row gap-2 mb-3">
              {['Maid', 'Plumber', 'Electrician'].map(cat => (
                <TouchableOpacity key={cat} onPress={() => setStaffCategory(cat)} className={`px-3 py-2 rounded-lg border ${staffCategory === cat ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-neutral-200'}`}>
                  <Text className={`font-semibold ${staffCategory === cat ? 'text-indigo-700' : 'text-neutral-500'}`}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TextInput placeholder="Phone Number" value={staffPhone} onChangeText={setStaffPhone} keyboardType="phone-pad" className="bg-neutral-100 p-3 rounded-xl mb-4" />
            <TouchableOpacity onPress={handleAddStaff} disabled={submitting} className={`p-3 rounded-xl flex-row justify-center items-center ${submitting ? 'bg-indigo-400' : 'bg-indigo-600'}`}>
              {submitting ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold">Add to Directory</Text>}
            </TouchableOpacity>
          </View>

          <Text className="font-bold text-neutral-800 mb-3 ml-1 text-lg">Directory</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#4F46E5" />
          ) : serviceStaffList.length === 0 ? (
            <EmptyState icon={Users} title="Empty Directory" description="No service staff added yet." />
          ) : (
            <FlatList data={serviceStaffList} keyExtractor={item => item.id} renderItem={renderStaff} showsVerticalScrollIndicator={false} />
          )}
        </View>
      ) : (
        <View className="flex-1 px-6 pt-4">
          {loading ? (
            <ActivityIndicator size="large" color="#4F46E5" />
          ) : activeTab === 'complaints' ? (
            complaints.length === 0 ? (
              <EmptyState icon={ShieldAlert} title="No Complaints" description="No resident complaints have been logged." />
            ) : (
              <FlatList data={complaints} keyExtractor={item => item.id} renderItem={renderComplaint} showsVerticalScrollIndicator={false} />
            )
          ) : (
            historyLogs.length === 0 ? (
              <EmptyState icon={ClipboardList} title="No Logs" description="No visitors have entered the society." />
            ) : (
              <FlatList data={historyLogs} keyExtractor={item => item.id} renderItem={renderLog} showsVerticalScrollIndicator={false} />
            )
          )}
        </View>
      )}

      {/* Resolution Note Modal */}
      <Modal visible={resolveModalVisible} animationType="slide" transparent={true}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 pb-12">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-neutral-900">Resolve Complaint</Text>
              <TouchableOpacity onPress={() => setResolveModalVisible(false)} className="bg-neutral-100 p-2 rounded-full">
                <X color="#6B7280" size={20} />
              </TouchableOpacity>
            </View>
            
            <Text className="text-neutral-600 mb-2">Add a note so the resident knows what action was taken (optional):</Text>
            <TextInput
              placeholder="e.g. Plumber visited and fixed the leak."
              value={resolutionNote}
              onChangeText={setResolutionNote}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="bg-neutral-100 p-4 rounded-xl mb-6 text-lg min-h-[100px]"
            />
            
            <TouchableOpacity 
              onPress={handleResolveComplaint}
              disabled={resolving}
              className={`p-4 rounded-xl flex-row justify-center items-center gap-2 ${resolving ? 'bg-emerald-400' : 'bg-emerald-600'}`}
            >
              {resolving ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <CheckCircle color="white" size={20} />
                  <Text className="text-white font-bold text-lg">Mark as Resolved</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
