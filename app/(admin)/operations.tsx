import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Briefcase, UserPlus } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../components/AuthProvider';

export default function OperationsScreen() {
  const { session } = useAuth();
  const [guardName, setGuardName] = useState('');
  const [guardPhone, setGuardPhone] = useState('+91');

  const handleInviteGuard = async () => {
    if (!guardName || guardPhone.length < 10) return Alert.alert('Error', 'Valid name and phone required');
    try {
      const { data: profile } = await supabase.from('profiles').select('society_id').eq('id', session?.user.id).single();
      
      const { error } = await supabase.from('invites').insert({
        society_id: profile?.society_id,
        role: 'guard',
        full_name: guardName,
        phone: guardPhone,
      });
      if (error) throw error;
      
      Alert.alert('Success', 'Guard invited! They can now log in.');
      setGuardName('');
      setGuardPhone('+91');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <View className="px-6 py-4 bg-white border-b border-neutral-200">
        <Text className="text-2xl font-bold text-neutral-900">Operations</Text>
      </View>

      <ScrollView className="flex-1 p-6">
        <View className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
          <View className="flex-row items-center gap-3 mb-6">
            <UserPlus color="#4F46E5" size={24} />
            <Text className="text-xl font-bold">Invite Security Guard</Text>
          </View>
          <TextInput
            placeholder="Guard Full Name"
            value={guardName}
            onChangeText={setGuardName}
            className="bg-neutral-100 p-4 rounded-xl mb-4 text-lg"
          />
          <TextInput
            placeholder="Phone Number (+91...)"
            value={guardPhone}
            onChangeText={setGuardPhone}
            keyboardType="phone-pad"
            className="bg-neutral-100 p-4 rounded-xl mb-6 text-lg"
          />
          <TouchableOpacity onPress={handleInviteGuard} className="bg-indigo-600 p-4 rounded-xl flex-row justify-center items-center gap-2">
            <UserPlus color="white" size={20} />
            <Text className="text-white font-bold text-lg">Send Guard Invite</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
