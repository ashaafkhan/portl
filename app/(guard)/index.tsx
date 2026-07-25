import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Phone, Package, Car, Wrench, Shield, Send } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../components/AuthProvider';

type Category = 'delivery' | 'guest' | 'cab' | 'service';

export default function GuardIndex() {
  const { session } = useAuth();
  const [category, setCategory] = useState<Category>('guest');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+91');
  
  // Flat selection
  const [flats, setFlats] = useState<any[]>([]);
  const [loadingFlats, setLoadingFlats] = useState(true);
  const [selectedFlatId, setSelectedFlatId] = useState('');
  
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchFlats();
  }, []);

  const fetchFlats = async () => {
    setLoadingFlats(true);
    const { data: profile } = await supabase.from('profiles').select('society_id').eq('id', session?.user.id).single();
    if (profile?.society_id) {
      // Fetch towers for this society, then flats for those towers
      const { data: towers } = await supabase.from('towers').select('id, name').eq('society_id', profile.society_id);
      if (towers && towers.length > 0) {
        const towerIds = towers.map(t => t.id);
        const { data: flatsData } = await supabase.from('flats').select('*, towers(name)').in('tower_id', towerIds);
        setFlats(flatsData || []);
      }
    }
    setLoadingFlats(false);
  };

  const handleSubmit = async () => {
    if (!name || !selectedFlatId) {
      return Alert.alert('Error', 'Name and Flat selection are required');
    }
    
    setSubmitting(true);
    try {
      // 1. Create or find visitor record
      let visitorId;
      if (phone.length > 3) {
        // Try to find existing visitor by phone
        const { data: existingVisitor } = await supabase
          .from('visitors')
          .select('id')
          .eq('phone', phone)
          .single();
          
        if (existingVisitor) {
          visitorId = existingVisitor.id;
        }
      }
      
      // Create new visitor if not found
      if (!visitorId) {
        const { data: newVisitor, error: visitorError } = await supabase
          .from('visitors')
          .insert({ name, phone: phone.length > 3 ? phone : null, category })
          .select('id')
          .single();
          
        if (visitorError) throw visitorError;
        visitorId = newVisitor.id;
      }

      // 2. Create visitor request
      const { error: requestError } = await supabase
        .from('visitor_requests')
        .insert({
          visitor_id: visitorId,
          flat_id: selectedFlatId,
          created_by: session?.user.id,
          status: 'pending'
        });

      if (requestError) throw requestError;

      Alert.alert('Success', 'Request sent to resident!');
      setName('');
      setPhone('+91');
      setSelectedFlatId('');
      
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [
    { id: 'guest', label: 'Guest', icon: User },
    { id: 'delivery', label: 'Delivery', icon: Package },
    { id: 'cab', label: 'Cab', icon: Car },
    { id: 'service', label: 'Service', icon: Wrench },
  ];

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <View className="px-6 py-4 bg-white border-b border-neutral-200">
        <Text className="text-2xl font-bold text-neutral-900">Gate Registry</Text>
      </View>

      <ScrollView className="flex-1 p-6">
        {/* Category Selection */}
        <Text className="text-lg font-bold text-neutral-800 mb-3">Visitor Type</Text>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = category === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setCategory(cat.id as Category)}
                className={`flex-1 min-w-[45%] p-4 rounded-xl items-center flex-row justify-center gap-2 border ${
                  isSelected ? 'bg-indigo-50 border-indigo-600' : 'bg-white border-neutral-200'
                }`}
              >
                <Icon size={20} color={isSelected ? '#4F46E5' : '#737373'} />
                <Text className={`font-semibold ${isSelected ? 'text-indigo-600' : 'text-neutral-600'}`}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Visitor Details */}
        <View className="bg-white p-6 rounded-2xl border border-neutral-200 mb-6">
          <Text className="text-lg font-bold text-neutral-800 mb-4">Visitor Details</Text>
          <View className="flex-row items-center bg-neutral-100 rounded-xl px-4 mb-4">
            <User size={20} color="#A3A3A3" />
            <TextInput
              placeholder="Full Name"
              value={name}
              onChangeText={setName}
              className="flex-1 p-4 text-lg"
            />
          </View>
          <View className="flex-row items-center bg-neutral-100 rounded-xl px-4">
            <Phone size={20} color="#A3A3A3" />
            <TextInput
              placeholder="Phone Number (Optional)"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              className="flex-1 p-4 text-lg"
            />
          </View>
        </View>

        {/* Flat Selection */}
        <View className="bg-white p-6 rounded-2xl border border-neutral-200 mb-8">
          <Text className="text-lg font-bold text-neutral-800 mb-4">Select Flat</Text>
          {loadingFlats ? (
            <ActivityIndicator />
          ) : (
            <ScrollView className="max-h-64" nestedScrollEnabled>
              <View className="flex-row flex-wrap gap-2">
                {flats.map((flat) => (
                  <TouchableOpacity
                    key={flat.id}
                    onPress={() => setSelectedFlatId(flat.id)}
                    className={`p-3 rounded-xl min-w-[30%] items-center border ${
                      selectedFlatId === flat.id ? 'bg-indigo-600 border-indigo-600' : 'bg-neutral-50 border-neutral-200'
                    }`}
                  >
                    <Text className={`font-bold ${selectedFlatId === flat.id ? 'text-white' : 'text-neutral-700'}`}>
                      {flat.towers?.name}-{flat.number}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        <TouchableOpacity 
          onPress={handleSubmit}
          disabled={submitting || loadingFlats}
          className={`p-4 rounded-xl flex-row justify-center items-center gap-2 mb-10 ${submitting ? 'bg-indigo-400' : 'bg-indigo-600'}`}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Send color="white" size={20} />
              <Text className="text-white font-bold text-lg">Send Request</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
