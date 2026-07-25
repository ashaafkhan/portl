import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, FlatList, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Building2, MessageSquareWarning, Megaphone, Send, ShieldAlert, CheckCircle, PieChart, Dumbbell, CalendarPlus, X, Clock, Users, Shield, ShieldCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/supabase';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../components/AuthProvider';

export default function CommunityScreen() {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<'notices' | 'complaints' | 'polls' | 'amenities' | 'directory'>('notices');
  
  // Data States
  const [notices, setNotices] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [amenities, setAmenities] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [directory, setDirectory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Complaint Form
  const [isCreatingComplaint, setIsCreatingComplaint] = useState(false);
  const [complaintTitle, setComplaintTitle] = useState('');
  const [complaintDescription, setComplaintDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Booking Modal
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedAmenity, setSelectedAmenity] = useState<any>(null);
  const [bookingDate, setBookingDate] = useState<'today' | 'tomorrow'>('today');
  const [bookingSlot, setBookingSlot] = useState<'morning' | 'evening'>('morning');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: profile } = await supabase.from('profiles').select('society_id, flat_id').eq('id', session?.user.id).single();
      if (!profile?.society_id) return;

      if (activeTab === 'notices') {
        const { data } = await supabase.from('notices').select('*').eq('society_id', profile.society_id).order('created_at', { ascending: false });
        setNotices(data || []);
      } else if (activeTab === 'complaints') {
        const { data } = await supabase.from('complaints').select('*').eq('resident_id', session?.user.id).order('created_at', { ascending: false });
        setComplaints(data || []);
      } else if (activeTab === 'polls') {
        const { data: pollsData } = await supabase.from('polls').select('*').eq('society_id', profile.society_id).order('created_at', { ascending: false });
        const { data: votesData } = await supabase.from('poll_responses').select('*').eq('resident_id', session?.user.id);
        const enhancedPolls = (pollsData || []).map(poll => ({
          ...poll, userVote: votesData?.find(v => v.poll_id === poll.id)?.selected_option, results: poll.results || {}
        }));
        setPolls(enhancedPolls);
      } else if (activeTab === 'amenities') {
        const { data } = await supabase.from('amenities').select('*').eq('society_id', profile.society_id);
        setAmenities(data || []);
        
        const { data: bookings } = await supabase.from('amenity_bookings')
          .select('*, amenities(name)')
          .eq('resident_id', session?.user.id)
          .gte('date', new Date().toISOString().split('T')[0])
          .order('date', { ascending: true });
        setMyBookings(bookings || []);
      } else if (activeTab === 'directory') {
        const { data: staffData } = await supabase.from('staff_directory').select('*').eq('society_id', profile.society_id).order('category', { ascending: true });
        const { data: trustedData } = await supabase.from('trusted_staff').select('staff_id').eq('resident_id', session?.user.id);
        
        const trustedIds = new Set((trustedData || []).map(t => t.staff_id));
        const enhancedStaff = (staffData || []).map(staff => ({
          ...staff,
          isTrusted: trustedIds.has(staff.id)
        }));
        
        setDirectory(enhancedStaff);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTrust = async (staffId: string, currentlyTrusted: boolean) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const { data: profile } = await supabase.from('profiles').select('flat_id').eq('id', session?.user.id).single();
      
      if (currentlyTrusted) {
        await supabase.from('trusted_staff').delete().match({ resident_id: session?.user.id, staff_id: staffId });
      } else {
        await supabase.from('trusted_staff').insert({
          flat_id: profile?.flat_id,
          resident_id: session?.user.id,
          staff_id: staffId
        });
      }
      
      setDirectory(directory.map(s => s.id === staffId ? { ...s, isTrusted: !currentlyTrusted } : s));
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleSubmitComplaint = async () => {
    if (!complaintTitle || !complaintDescription) return Alert.alert('Error', 'Title and description required');
    setSubmitting(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const { data: profile } = await supabase.from('profiles').select('society_id').eq('id', session?.user.id).single();
      const { error } = await supabase.from('complaints').insert({
        society_id: profile?.society_id, resident_id: session?.user.id, title: complaintTitle, description: complaintDescription, category: 'general'
      });
      if (error) throw error;
      Alert.alert('Success', 'Complaint submitted!');
      setComplaintTitle(''); setComplaintDescription(''); setIsCreatingComplaint(false);
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (pollId: string, option: string, currentResults: any) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const updatedPolls = polls.map(p => {
        if (p.id === pollId) {
          const newResults = { ...p.results, [option]: (p.results[option] || 0) + 1 };
          return { ...p, userVote: option, results: newResults };
        }
        return p;
      });
      setPolls(updatedPolls);

      const { error: voteError } = await supabase.from('poll_responses').insert({
        poll_id: pollId, resident_id: session?.user.id, selected_option: option
      });
      if (voteError) throw voteError;

      const newResults = { ...currentResults, [option]: (currentResults[option] || 0) + 1 };
      await supabase.from('polls').update({ results: newResults }).eq('id', pollId);
    } catch (error: any) {
      Alert.alert('Error', error.message);
      fetchData();
    }
  };

  const handleBookAmenity = async () => {
    setSubmitting(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const { data: profile } = await supabase.from('profiles').select('flat_id').eq('id', session?.user.id).single();
      
      const dateObj = new Date();
      if (bookingDate === 'tomorrow') dateObj.setDate(dateObj.getDate() + 1);
      const dateStr = dateObj.toISOString().split('T')[0];
      
      const startTime = bookingSlot === 'morning' ? '08:00:00' : '17:00:00';
      const endTime = bookingSlot === 'morning' ? '12:00:00' : '21:00:00';

      const { error } = await supabase.from('amenity_bookings').insert({
        amenity_id: selectedAmenity.id,
        flat_id: profile?.flat_id,
        resident_id: session?.user.id,
        date: dateStr,
        start_time: startTime,
        end_time: endTime,
        status: 'confirmed'
      });

      if (error) {
        if (error.code === '23505') throw new Error("You already have a booking for this slot!");
        throw error;
      }
      
      Alert.alert("Confirmed!", `${selectedAmenity.name} booked for ${bookingDate} ${bookingSlot}.`);
      setBookingModalVisible(false);
      fetchData();
    } catch (error: any) {
      Alert.alert('Booking Failed', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderNotice = ({ item }: { item: any }) => (
    <View className="bg-white p-5 rounded-2xl border border-neutral-200 mb-4 shadow-sm">
      <View className="flex-row items-center gap-2 mb-3">
        <Megaphone color="#4F46E5" size={20} />
        <Text className="text-xl font-bold text-neutral-900 flex-1">{item.title}</Text>
      </View>
      <Text className="text-neutral-600 mb-3 leading-6">{item.content}</Text>
      <Text className="text-neutral-400 text-xs text-right">{new Date(item.created_at).toLocaleDateString()}</Text>
    </View>
  );

  const renderComplaint = ({ item }: { item: any }) => (
    <View className="bg-white p-5 rounded-2xl border border-neutral-200 mb-4 shadow-sm">
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-lg font-bold text-neutral-900 flex-1 mr-4">{item.title}</Text>
        <View className={`px-3 py-1 rounded-full flex-row items-center gap-1 ${item.status === 'resolved' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
          {item.status === 'resolved' ? <CheckCircle size={12} color="#059669" /> : <ShieldAlert size={12} color="#D97706" />}
          <Text className={`text-xs font-bold uppercase tracking-wider ${item.status === 'resolved' ? 'text-emerald-700' : 'text-amber-700'}`}>{item.status}</Text>
        </View>
      </View>
      <Text className="text-neutral-600 my-2">{item.description}</Text>
      
      {item.admin_note && (
        <View className="mt-3 bg-neutral-50 p-3 rounded-lg border border-neutral-100">
          <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Resolution Note</Text>
          <Text className="text-neutral-700">{item.admin_note}</Text>
        </View>
      )}

      <Text className="text-neutral-400 text-xs mt-3 border-t border-neutral-100 pt-3">
        Submitted on {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </View>
  );

  const renderPoll = ({ item }: { item: any }) => {
    const totalVotes = Object.values(item.results || {}).reduce((a: any, b: any) => a + b, 0) as number;
    return (
      <View className="bg-white p-5 rounded-2xl border border-neutral-200 mb-4 shadow-sm">
        <View className="flex-row items-start gap-2 mb-4">
          <PieChart color="#4F46E5" size={20} className="mt-1" />
          <Text className="text-xl font-bold text-neutral-900 flex-1">{item.question}</Text>
        </View>
        {item.options.map((opt: string, idx: number) => {
          const votes = item.results?.[opt] || 0;
          const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const isSelected = item.userVote === opt;
          return (
            <TouchableOpacity key={idx} disabled={!!item.userVote} onPress={() => handleVote(item.id, opt, item.results)} className={`mb-3 rounded-xl overflow-hidden border ${isSelected ? 'border-indigo-500' : 'border-neutral-200 bg-neutral-50'}`}>
              {item.userVote && <View className="absolute left-0 top-0 bottom-0 bg-indigo-100" style={{ width: `${percentage}%` }} />}
              <View className="p-4 flex-row justify-between items-center z-10">
                <Text className={`font-semibold ${isSelected ? 'text-indigo-900' : 'text-neutral-700'}`}>{opt}</Text>
                {item.userVote && <Text className="font-bold text-indigo-600">{percentage}%</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
        <Text className="text-neutral-400 text-xs text-right mt-2">{totalVotes} votes</Text>
      </View>
    );
  };

  const renderAmenity = ({ item }: { item: any }) => (
    <View className="bg-white p-5 rounded-2xl border border-neutral-200 mb-4 shadow-sm">
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="text-xl font-bold text-neutral-900">{item.name}</Text>
          {item.description && <Text className="text-neutral-600 mt-1">{item.description}</Text>}
        </View>
        <View className="bg-indigo-50 p-2 rounded-xl border border-indigo-100 items-center">
          <Text className="text-indigo-800 font-bold text-lg">{item.capacity}</Text>
          <Text className="text-indigo-600 text-xs font-semibold">Max</Text>
        </View>
      </View>
      <View className="flex-row items-center justify-between mt-4">
        <Text className="text-neutral-500 font-medium">{item.open_time.substring(0,5)} - {item.close_time.substring(0,5)}</Text>
        <TouchableOpacity 
          onPress={() => { setSelectedAmenity(item); setBookingModalVisible(true); }}
          className="bg-[#FF7A59] px-4 py-2 rounded-lg flex-row items-center gap-2"
        >
          <CalendarPlus color="white" size={16} />
          <Text className="text-white font-bold">Book Slot</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDirectory = ({ item }: { item: any }) => (
    <View className="bg-white p-5 rounded-2xl border border-neutral-200 mb-4 shadow-sm">
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1">
          <Text className="text-xl font-bold text-neutral-900 flex-row items-center gap-1">
            {item.name} {item.verified && <CheckCircle color="#10B981" size={16} />}
          </Text>
          <Text className="text-neutral-500 font-semibold">{item.category}</Text>
        </View>
        <View className="bg-neutral-100 px-3 py-1 rounded-full">
          <Text className="text-neutral-700 font-medium">{item.phone}</Text>
        </View>
      </View>
      
      <TouchableOpacity 
        onPress={() => handleToggleTrust(item.id, item.isTrusted)}
        className={`mt-2 py-3 rounded-xl flex-row justify-center items-center gap-2 border ${item.isTrusted ? 'border-emerald-200 bg-emerald-50' : 'border-neutral-200 bg-white'}`}
      >
        {item.isTrusted ? (
          <>
            <ShieldCheck color="#10B981" size={20} />
            <Text className="text-emerald-700 font-bold text-base">Personally Trusted</Text>
          </>
        ) : (
          <>
            <Shield color="#6B7280" size={20} />
            <Text className="text-neutral-600 font-bold text-base">Mark as Trusted</Text>
          </>
        )}
      </TouchableOpacity>
      {item.isTrusted && (
        <Text className="text-center text-xs text-emerald-600 mt-2">
          This person will be auto-approved when they visit your flat.
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <View className="px-6 py-4 bg-white border-b border-neutral-200 flex-row justify-between items-center">
        <Text className="text-2xl font-bold text-neutral-900">Community</Text>
        {activeTab === 'complaints' && !isCreatingComplaint && (
          <TouchableOpacity onPress={() => setIsCreatingComplaint(true)} className="bg-indigo-50 p-2 rounded-full">
            <MessageSquareWarning color="#4F46E5" size={24} />
          </TouchableOpacity>
        )}
      </View>

      <View className="flex-row p-4 gap-2">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['notices', 'complaints', 'polls', 'amenities', 'directory'] as const).map((tab) => (
            <TouchableOpacity key={tab} onPress={() => { setActiveTab(tab); setIsCreatingComplaint(false); }} className={`px-4 py-2 rounded-full mr-2 ${activeTab === tab ? 'bg-[#FF7A59]' : 'bg-neutral-200'}`}>
              <Text className={`font-semibold capitalize ${activeTab === tab ? 'text-white' : 'text-neutral-600'}`}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View className="flex-1 px-6 pt-4">
        {loading ? (
          <ActivityIndicator size="large" color="#FF7A59" />
        ) : isCreatingComplaint ? (
          <ScrollView className="flex-1">
            <View className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
              <View className="flex-row justify-between items-center mb-6">
                <View className="flex-row items-center gap-3">
                  <MessageSquareWarning color="#FF7A59" size={24} />
                  <Text className="text-xl font-bold">New Complaint</Text>
                </View>
                <TouchableOpacity onPress={() => setIsCreatingComplaint(false)}>
                  <Text className="text-neutral-500 font-bold">Cancel</Text>
                </TouchableOpacity>
              </View>
              <TextInput placeholder="What is the issue?" value={complaintTitle} onChangeText={setComplaintTitle} className="bg-neutral-100 p-4 rounded-xl mb-4 text-lg font-semibold" />
              <TextInput placeholder="Provide more details..." value={complaintDescription} onChangeText={setComplaintDescription} multiline numberOfLines={5} textAlignVertical="top" className="bg-neutral-100 p-4 rounded-xl mb-6 text-lg min-h-[120px]" />
              <TouchableOpacity onPress={handleSubmitComplaint} disabled={submitting} className="bg-[#FF7A59] p-4 rounded-xl flex-row justify-center items-center gap-2">
                {submitting ? <ActivityIndicator color="white" /> : <><Send color="white" size={20} /><Text className="text-white font-bold text-lg">Submit Complaint</Text></>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : activeTab === 'notices' && notices.length === 0 ? (
          <EmptyState icon={Megaphone} title="No Notices" description="There are no announcements." />
        ) : activeTab === 'complaints' && complaints.length === 0 ? (
          <EmptyState icon={ShieldAlert} title="No Complaints" description="You haven't submitted any complaints." />
        ) : activeTab === 'polls' && polls.length === 0 ? (
          <EmptyState icon={PieChart} title="No Polls" description="No active polls right now." />
        ) : activeTab === 'amenities' && amenities.length === 0 ? (
          <EmptyState icon={Dumbbell} title="No Amenities" description="No amenities added yet." />
        ) : activeTab === 'directory' && directory.length === 0 ? (
          <EmptyState icon={Users} title="Empty Directory" description="No service staff added by admin." />
        ) : (
          <FlatList
            data={activeTab === 'notices' ? notices : activeTab === 'complaints' ? complaints : activeTab === 'polls' ? polls : activeTab === 'amenities' ? amenities : directory}
            keyExtractor={item => item.id}
            renderItem={activeTab === 'notices' ? renderNotice : activeTab === 'complaints' ? renderComplaint : activeTab === 'polls' ? renderPoll : activeTab === 'amenities' ? renderAmenity : renderDirectory}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={activeTab === 'amenities' && myBookings.length > 0 ? (
              <View className="mb-6">
                <Text className="font-bold text-neutral-800 mb-3">My Bookings</Text>
                {myBookings.map(b => (
                  <View key={b.id} className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 mb-2 flex-row justify-between items-center">
                    <View>
                      <Text className="font-bold text-emerald-900">{b.amenities?.name}</Text>
                      <Text className="text-emerald-700 text-xs">{b.date} • {b.start_time.substring(0,5)}-{b.end_time.substring(0,5)}</Text>
                    </View>
                    <CheckCircle color="#059669" size={20} />
                  </View>
                ))}
              </View>
            ) : null}
          />
        )}
      </View>

      {/* Booking Modal */}
      <Modal visible={bookingModalVisible} animationType="slide" transparent={true}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 h-2/3">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-neutral-900">Book {selectedAmenity?.name}</Text>
              <TouchableOpacity onPress={() => setBookingModalVisible(false)} className="bg-neutral-100 p-2 rounded-full">
                <X color="#6B7280" size={20} />
              </TouchableOpacity>
            </View>

            <Text className="font-bold text-neutral-700 mb-3">Select Date</Text>
            <View className="flex-row gap-3 mb-6">
              <TouchableOpacity onPress={() => setBookingDate('today')} className={`flex-1 p-4 rounded-xl items-center border ${bookingDate === 'today' ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-neutral-200'}`}>
                <Text className={`font-bold ${bookingDate === 'today' ? 'text-indigo-600' : 'text-neutral-600'}`}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setBookingDate('tomorrow')} className={`flex-1 p-4 rounded-xl items-center border ${bookingDate === 'tomorrow' ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-neutral-200'}`}>
                <Text className={`font-bold ${bookingDate === 'tomorrow' ? 'text-indigo-600' : 'text-neutral-600'}`}>Tomorrow</Text>
              </TouchableOpacity>
            </View>

            <Text className="font-bold text-neutral-700 mb-3">Select Slot</Text>
            <View className="flex-row gap-3 mb-8">
              <TouchableOpacity onPress={() => setBookingSlot('morning')} className={`flex-1 p-4 rounded-xl items-center border ${bookingSlot === 'morning' ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-neutral-200'}`}>
                <Clock color={bookingSlot === 'morning' ? '#4F46E5' : '#9CA3AF'} size={24} className="mb-2" />
                <Text className={`font-bold ${bookingSlot === 'morning' ? 'text-indigo-600' : 'text-neutral-600'}`}>Morning</Text>
                <Text className="text-xs text-neutral-400 mt-1">08:00 - 12:00</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setBookingSlot('evening')} className={`flex-1 p-4 rounded-xl items-center border ${bookingSlot === 'evening' ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-neutral-200'}`}>
                <Clock color={bookingSlot === 'evening' ? '#4F46E5' : '#9CA3AF'} size={24} className="mb-2" />
                <Text className={`font-bold ${bookingSlot === 'evening' ? 'text-indigo-600' : 'text-neutral-600'}`}>Evening</Text>
                <Text className="text-xs text-neutral-400 mt-1">17:00 - 21:00</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              onPress={handleBookAmenity}
              disabled={submitting}
              className={`p-4 rounded-xl flex-row justify-center items-center gap-2 mt-auto ${submitting ? 'bg-coral-400' : 'bg-[#FF7A59]'}`}
            >
              {submitting ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Confirm Booking</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
