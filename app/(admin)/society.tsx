import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Building, Plus, UserPlus, Grid } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../components/AuthProvider';

export default function SocietyScreen() {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<'towers' | 'flats' | 'residents'>('towers');

  // Data states
  const [towers, setTowers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [towerName, setTowerName] = useState('');
  const [flatNumber, setFlatNumber] = useState('');
  const [selectedTowerId, setSelectedTowerId] = useState('');
  const [residentName, setResidentName] = useState('');
  const [residentPhone, setResidentPhone] = useState('+91');

  useEffect(() => {
    fetchTowers();
  }, []);

  const fetchTowers = async () => {
    setLoading(true);
    const { data: profile } = await supabase.from('profiles').select('society_id').eq('id', session?.user.id).single();
    if (profile?.society_id) {
      const { data } = await supabase.from('towers').select('*').eq('society_id', profile.society_id);
      setTowers(data || []);
      if (data && data.length > 0 && !selectedTowerId) {
        setSelectedTowerId(data[0].id);
      }
    }
    setLoading(false);
  };

  const handleCreateTower = async () => {
    if (!towerName) return Alert.alert('Error', 'Tower name is required');
    try {
      const { data: profile } = await supabase.from('profiles').select('society_id').eq('id', session?.user.id).single();
      const { error } = await supabase.from('towers').insert({ name: towerName, society_id: profile?.society_id });
      if (error) throw error;
      Alert.alert('Success', 'Tower created!');
      setTowerName('');
      fetchTowers();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleCreateFlat = async () => {
    if (!flatNumber || !selectedTowerId) return Alert.alert('Error', 'Tower and Flat number required');
    try {
      const { error } = await supabase.from('flats').insert({ number: flatNumber, tower_id: selectedTowerId });
      if (error) throw error;
      Alert.alert('Success', 'Flat created!');
      setFlatNumber('');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleInviteResident = async () => {
    if (!residentName || residentPhone.length < 10) return Alert.alert('Error', 'Valid name and phone required');
    try {
      const { data: profile } = await supabase.from('profiles').select('society_id').eq('id', session?.user.id).single();
      const { error } = await supabase.from('invites').insert({
        society_id: profile?.society_id,
        role: 'resident',
        full_name: residentName,
        phone: residentPhone,
        flat_id: null // MVP: We can skip assigning flat ID directly in the first iteration
      });
      if (error) throw error;
      Alert.alert('Success', 'Resident invited! They can now log in.');
      setResidentName('');
      setResidentPhone('+91');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <View className="px-6 py-4 bg-white border-b border-neutral-200">
        <Text className="text-2xl font-bold text-neutral-900">Society Setup</Text>
      </View>

      <View className="flex-row p-4 gap-2">
        {(['towers', 'flats', 'residents'] as const).map((tab) => (
          <TouchableOpacity 
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full ${activeTab === tab ? 'bg-indigo-600' : 'bg-neutral-200'}`}
          >
            <Text className={`font-semibold capitalize ${activeTab === tab ? 'text-white' : 'text-neutral-600'}`}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView className="flex-1 p-6">
        {activeTab === 'towers' && (
          <View className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
            <View className="flex-row items-center gap-3 mb-6">
              <Building color="#4F46E5" size={24} />
              <Text className="text-xl font-bold">Add New Tower</Text>
            </View>
            <TextInput
              placeholder="e.g. Tower A, Block 1"
              value={towerName}
              onChangeText={setTowerName}
              className="bg-neutral-100 p-4 rounded-xl mb-6 text-lg"
            />
            <TouchableOpacity onPress={handleCreateTower} className="bg-indigo-600 p-4 rounded-xl flex-row justify-center items-center gap-2">
              <Plus color="white" size={20} />
              <Text className="text-white font-bold text-lg">Create Tower</Text>
            </TouchableOpacity>
            
            <View className="mt-8">
              <Text className="text-lg font-bold mb-4 text-neutral-800">Existing Towers</Text>
              {loading ? <ActivityIndicator /> : towers.map(t => (
                <View key={t.id} className="p-4 bg-neutral-50 rounded-xl mb-2 border border-neutral-200">
                  <Text className="font-semibold text-neutral-800">{t.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeTab === 'flats' && (
          <View className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
            <View className="flex-row items-center gap-3 mb-6">
              <Grid color="#4F46E5" size={24} />
              <Text className="text-xl font-bold">Add New Flat</Text>
            </View>
            
            <Text className="text-neutral-600 mb-2 font-semibold">Select Tower</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
              {towers.map(t => (
                <TouchableOpacity 
                  key={t.id} 
                  onPress={() => setSelectedTowerId(t.id)}
                  className={`px-4 py-3 rounded-xl mr-2 ${selectedTowerId === t.id ? 'bg-indigo-600' : 'bg-neutral-100'}`}
                >
                  <Text className={`font-bold ${selectedTowerId === t.id ? 'text-white' : 'text-neutral-700'}`}>{t.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              placeholder="Flat Number (e.g. 401)"
              value={flatNumber}
              onChangeText={setFlatNumber}
              className="bg-neutral-100 p-4 rounded-xl mb-6 text-lg"
            />
            <TouchableOpacity onPress={handleCreateFlat} className="bg-indigo-600 p-4 rounded-xl flex-row justify-center items-center gap-2">
              <Plus color="white" size={20} />
              <Text className="text-white font-bold text-lg">Create Flat</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'residents' && (
          <View className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
            <View className="flex-row items-center gap-3 mb-6">
              <UserPlus color="#4F46E5" size={24} />
              <Text className="text-xl font-bold">Invite Resident</Text>
            </View>
            <TextInput
              placeholder="Full Name"
              value={residentName}
              onChangeText={setResidentName}
              className="bg-neutral-100 p-4 rounded-xl mb-4 text-lg"
            />
            <TextInput
              placeholder="Phone Number (+91...)"
              value={residentPhone}
              onChangeText={setResidentPhone}
              keyboardType="phone-pad"
              className="bg-neutral-100 p-4 rounded-xl mb-6 text-lg"
            />
            <TouchableOpacity onPress={handleInviteResident} className="bg-indigo-600 p-4 rounded-xl flex-row justify-center items-center gap-2">
              <UserPlus color="white" size={20} />
              <Text className="text-white font-bold text-lg">Send Invite</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
