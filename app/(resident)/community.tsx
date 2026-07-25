import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Building2, MessageSquareWarning, Megaphone, Send, ShieldAlert, CheckCircle, PieChart, Dumbbell, CalendarPlus } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../components/AuthProvider';

export default function CommunityScreen() {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<'notices' | 'complaints' | 'polls' | 'amenities'>('notices');
  
  // Data States
  const [notices, setNotices] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [amenities, setAmenities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Complaint Form
  const [isCreatingComplaint, setIsCreatingComplaint] = useState(false);
  const [complaintTitle, setComplaintTitle] = useState('');
  const [complaintDescription, setComplaintDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: profile } = await supabase.from('profiles').select('society_id').eq('id', session?.user.id).single();
      if (!profile?.society_id) return;

      if (activeTab === 'notices') {
        const { data } = await supabase.from('notices').select('*').eq('society_id', profile.society_id).order('created_at', { ascending: false });
        setNotices(data || []);
      } else if (activeTab === 'complaints') {
        const { data } = await supabase.from('complaints').select('*').eq('resident_id', session?.user.id).order('created_at', { ascending: false });
        setComplaints(data || []);
      } else if (activeTab === 'polls') {
        // Fetch polls AND user's existing votes
        const { data: pollsData } = await supabase.from('polls').select('*').eq('society_id', profile.society_id).order('created_at', { ascending: false });
        const { data: votesData } = await supabase.from('poll_responses').select('*').eq('resident_id', session?.user.id);
        
        const enhancedPolls = (pollsData || []).map(poll => ({
          ...poll,
          userVote: votesData?.find(v => v.poll_id === poll.id)?.selected_option,
          results: poll.results || {} // Default empty results
        }));
        setPolls(enhancedPolls);
      } else if (activeTab === 'amenities') {
        const { data } = await supabase.from('amenities').select('*').eq('society_id', profile.society_id);
        setAmenities(data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComplaint = async () => {
    if (!complaintTitle || !complaintDescription) return Alert.alert('Error', 'Title and description required');
    setSubmitting(true);
    try {
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
      // Optimistic update
      const updatedPolls = polls.map(p => {
        if (p.id === pollId) {
          const newResults = { ...p.results, [option]: (p.results[option] || 0) + 1 };
          return { ...p, userVote: option, results: newResults };
        }
        return p;
      });
      setPolls(updatedPolls);

      // Save vote
      const { error: voteError } = await supabase.from('poll_responses').insert({
        poll_id: pollId, resident_id: session?.user.id, selected_option: option
      });
      if (voteError) throw voteError;

      // Update total tally (ideally done via DB trigger or Edge Function in prod, doing here for MVP)
      const newResults = { ...currentResults, [option]: (currentResults[option] || 0) + 1 };
      await supabase.from('polls').update({ results: newResults }).eq('id', pollId);
    } catch (error: any) {
      Alert.alert('Error', error.message);
      fetchData(); // revert on fail
    }
  };

  const handleBookAmenity = async (amenityId: string) => {
    Alert.alert("Coming Soon", "Booking slots will be connected to the payment gateway in the next update!");
  };

  const renderNotice = ({ item }: { item: any }) => (
    <View className="bg-white p-5 rounded-2xl border border-neutral-200 mb-4 shadow-sm">
      <View className="flex-row items-center gap-2 mb-3">
        <Megaphone color="#4F46E5" size={20} />
        <Text className="text-xl font-bold text-neutral-900 flex-1">{item.title}</Text>
      </View>
      <Text className="text-neutral-600 mb-3 leading-6">{item.content}</Text>
      <Text className="text-neutral-400 text-xs text-right">
        {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </View>
  );

  const renderComplaint = ({ item }: { item: any }) => (
    <View className="bg-white p-5 rounded-2xl border border-neutral-200 mb-4 shadow-sm">
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-lg font-bold text-neutral-900 flex-1 mr-4">{item.title}</Text>
        <View className={`px-3 py-1 rounded-full flex-row items-center gap-1 ${item.status === 'resolved' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
          {item.status === 'resolved' ? <CheckCircle size={12} color="#059669" /> : <ShieldAlert size={12} color="#D97706" />}
          <Text className={`text-xs font-bold uppercase tracking-wider ${item.status === 'resolved' ? 'text-emerald-700' : 'text-amber-700'}`}>
            {item.status}
          </Text>
        </View>
      </View>
      <Text className="text-neutral-600 my-2">{item.description}</Text>
      <Text className="text-neutral-400 text-xs mt-2">
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
            <TouchableOpacity 
              key={idx} 
              disabled={!!item.userVote}
              onPress={() => handleVote(item.id, opt, item.results)}
              className={`mb-3 rounded-xl overflow-hidden border ${isSelected ? 'border-indigo-500' : 'border-neutral-200 bg-neutral-50'}`}
            >
              {item.userVote && (
                <View 
                  className="absolute left-0 top-0 bottom-0 bg-indigo-100" 
                  style={{ width: `${percentage}%` }} 
                />
              )}
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
        <Text className="text-neutral-500 font-medium">
          {item.open_time.substring(0,5)} - {item.close_time.substring(0,5)}
        </Text>
        <TouchableOpacity 
          onPress={() => handleBookAmenity(item.id)}
          className="bg-[#FF7A59] px-4 py-2 rounded-lg flex-row items-center gap-2"
        >
          <CalendarPlus color="white" size={16} />
          <Text className="text-white font-bold">Book Slot</Text>
        </TouchableOpacity>
      </View>
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
          {(['notices', 'complaints', 'polls', 'amenities'] as const).map((tab) => (
            <TouchableOpacity 
              key={tab}
              onPress={() => { setActiveTab(tab); setIsCreatingComplaint(false); }}
              className={`px-4 py-2 rounded-full mr-2 ${activeTab === tab ? 'bg-[#FF7A59]' : 'bg-neutral-200'}`}
            >
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
        ) : (
          <FlatList
            data={
              activeTab === 'notices' ? notices : 
              activeTab === 'complaints' ? complaints : 
              activeTab === 'polls' ? polls : amenities
            }
            keyExtractor={item => item.id}
            renderItem={
              activeTab === 'notices' ? renderNotice : 
              activeTab === 'complaints' ? renderComplaint : 
              activeTab === 'polls' ? renderPoll : renderAmenity
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
