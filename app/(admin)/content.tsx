import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileText, Send, Megaphone, PieChart, Plus, Trash2 } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../components/AuthProvider';

export default function ContentScreen() {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<'notices' | 'polls' | 'history'>('notices');
  
  // Notice Form
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  
  // Poll Form
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  
  const [submitting, setSubmitting] = useState(false);
  
  // History
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyType, setHistoryType] = useState<'notices' | 'polls'>('notices');

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, historyType]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data: profile } = await supabase.from('profiles').select('society_id').eq('id', session?.user.id).single();
      if (profile?.society_id) {
        if (historyType === 'notices') {
          const { data, error } = await supabase.from('notices').select('*').eq('society_id', profile.society_id).order('created_at', { ascending: false });
          if (error) throw error;
          setHistoryItems(data || []);
        } else {
          const { data, error } = await supabase.from('polls').select('*').eq('society_id', profile.society_id).order('created_at', { ascending: false });
          if (error) throw error;
          setHistoryItems(data || []);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNotice = async () => {
    if (!title || !content) return Alert.alert('Error', 'Title and content are required');
    setSubmitting(true);
    try {
      const { data: profile } = await supabase.from('profiles').select('society_id').eq('id', session?.user.id).single();
      const { error } = await supabase.from('notices').insert({ society_id: profile?.society_id, title, content, created_by: session?.user.id });
      if (error) throw error;
      Alert.alert('Success', 'Notice published!');
      setTitle('');
      setContent('');
      setActiveTab('history');
      setHistoryType('notices');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePoll = async () => {
    const validOptions = pollOptions.filter(opt => opt.trim() !== '');
    if (!pollQuestion || validOptions.length < 2) return Alert.alert('Error', 'Question and at least 2 options required');
    setSubmitting(true);
    try {
      const { data: profile } = await supabase.from('profiles').select('society_id').eq('id', session?.user.id).single();
      const { error } = await supabase.from('polls').insert({ society_id: profile?.society_id, question: pollQuestion, options: validOptions, created_by: session?.user.id });
      if (error) throw error;
      Alert.alert('Success', 'Poll published!');
      setPollQuestion('');
      setPollOptions(['', '']);
      setActiveTab('history');
      setHistoryType('polls');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const addPollOption = () => setPollOptions([...pollOptions, '']);
  const removePollOption = (index: number) => {
    if (pollOptions.length <= 2) return;
    const newOptions = [...pollOptions];
    newOptions.splice(index, 1);
    setPollOptions(newOptions);
  };
  const updatePollOption = (text: string, index: number) => {
    const newOptions = [...pollOptions];
    newOptions[index] = text;
    setPollOptions(newOptions);
  };

  const renderHistoryItem = ({ item }: { item: any }) => (
    <View className="bg-white p-5 rounded-2xl border border-neutral-200 mb-4 shadow-sm">
      <Text className="text-xl font-bold text-neutral-900 mb-2">{historyType === 'notices' ? item.title : item.question}</Text>
      {historyType === 'notices' && <Text className="text-neutral-600 mb-3">{item.content}</Text>}
      {historyType === 'polls' && (
        <View className="mb-3">
          {item.options.map((opt: string, i: number) => (
            <View key={i} className="bg-neutral-50 p-2 rounded-lg mb-1 border border-neutral-200"><Text className="text-neutral-700">{opt}</Text></View>
          ))}
        </View>
      )}
      <Text className="text-neutral-400 text-xs text-right">
        {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <View className="px-6 py-4 bg-white border-b border-neutral-200">
        <Text className="text-2xl font-bold text-neutral-900">Content</Text>
      </View>

      <View className="flex-row p-4 gap-2">
        <TouchableOpacity onPress={() => setActiveTab('notices')} className={`px-4 py-2 rounded-full ${activeTab === 'notices' ? 'bg-indigo-600' : 'bg-neutral-200'}`}>
          <Text className={`font-semibold ${activeTab === 'notices' ? 'text-white' : 'text-neutral-600'}`}>Notice</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('polls')} className={`px-4 py-2 rounded-full ${activeTab === 'polls' ? 'bg-indigo-600' : 'bg-neutral-200'}`}>
          <Text className={`font-semibold ${activeTab === 'polls' ? 'text-white' : 'text-neutral-600'}`}>Poll</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('history')} className={`px-4 py-2 rounded-full ${activeTab === 'history' ? 'bg-indigo-600' : 'bg-neutral-200'}`}>
          <Text className={`font-semibold ${activeTab === 'history' ? 'text-white' : 'text-neutral-600'}`}>History</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'notices' && (
        <ScrollView className="flex-1 p-6">
          <View className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
            <View className="flex-row items-center gap-3 mb-6">
              <Megaphone color="#4F46E5" size={24} />
              <Text className="text-xl font-bold">Broadcast Notice</Text>
            </View>
            <TextInput placeholder="Notice Title" value={title} onChangeText={setTitle} className="bg-neutral-100 p-4 rounded-xl mb-4 text-lg font-semibold" />
            <TextInput placeholder="What do you want to tell the residents?" value={content} onChangeText={setContent} multiline numberOfLines={5} textAlignVertical="top" className="bg-neutral-100 p-4 rounded-xl mb-6 text-lg min-h-[120px]" />
            <TouchableOpacity onPress={handleCreateNotice} disabled={submitting} className={`p-4 rounded-xl flex-row justify-center items-center gap-2 ${submitting ? 'bg-indigo-400' : 'bg-indigo-600'}`}>
              {submitting ? <ActivityIndicator color="white" /> : <><Send color="white" size={20} /><Text className="text-white font-bold text-lg">Publish Notice</Text></>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {activeTab === 'polls' && (
        <ScrollView className="flex-1 p-6">
          <View className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
            <View className="flex-row items-center gap-3 mb-6">
              <PieChart color="#4F46E5" size={24} />
              <Text className="text-xl font-bold">Create Poll</Text>
            </View>
            <TextInput placeholder="Ask a question..." value={pollQuestion} onChangeText={setPollQuestion} className="bg-neutral-100 p-4 rounded-xl mb-6 text-lg font-semibold" />
            
            <Text className="font-bold text-neutral-700 mb-2">Options</Text>
            {pollOptions.map((opt, idx) => (
              <View key={idx} className="flex-row items-center mb-3 gap-2">
                <TextInput placeholder={`Option ${idx + 1}`} value={opt} onChangeText={(text) => updatePollOption(text, idx)} className="flex-1 bg-neutral-100 p-4 rounded-xl text-lg" />
                {pollOptions.length > 2 && (
                  <TouchableOpacity onPress={() => removePollOption(idx)} className="p-4 bg-red-50 rounded-xl">
                    <Trash2 color="#EF4444" size={20} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            
            {pollOptions.length < 5 && (
              <TouchableOpacity onPress={addPollOption} className="p-4 rounded-xl flex-row items-center justify-center gap-2 mb-6 border border-dashed border-indigo-300 bg-indigo-50">
                <Plus color="#4F46E5" size={20} />
                <Text className="text-indigo-600 font-bold">Add Option</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={handleCreatePoll} disabled={submitting} className={`p-4 rounded-xl flex-row justify-center items-center gap-2 ${submitting ? 'bg-indigo-400' : 'bg-indigo-600'}`}>
              {submitting ? <ActivityIndicator color="white" /> : <><Send color="white" size={20} /><Text className="text-white font-bold text-lg">Publish Poll</Text></>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {activeTab === 'history' && (
        <View className="flex-1 px-6 pt-4">
          <View className="flex-row mb-4 bg-neutral-200 rounded-lg p-1">
            <TouchableOpacity onPress={() => setHistoryType('notices')} className={`flex-1 p-2 rounded-md items-center ${historyType === 'notices' ? 'bg-white shadow-sm' : ''}`}>
              <Text className={`font-semibold ${historyType === 'notices' ? 'text-neutral-900' : 'text-neutral-500'}`}>Notices</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setHistoryType('polls')} className={`flex-1 p-2 rounded-md items-center ${historyType === 'polls' ? 'bg-white shadow-sm' : ''}`}>
              <Text className={`font-semibold ${historyType === 'polls' ? 'text-neutral-900' : 'text-neutral-500'}`}>Polls</Text>
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <ActivityIndicator size="large" color="#4F46E5" />
          ) : historyItems.length === 0 ? (
            <EmptyState icon={FileText} title="Empty History" description="Nothing published yet." />
          ) : (
            <FlatList data={historyItems} keyExtractor={item => item.id} renderItem={renderHistoryItem} showsVerticalScrollIndicator={false} />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}
