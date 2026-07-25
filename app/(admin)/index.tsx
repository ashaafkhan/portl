import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LayoutDashboard, Users, ShieldAlert, PieChart, CalendarCheck, ArrowRight, Activity } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../components/AuthProvider';
import { router } from 'expo-router';

export default function AdminIndex() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Dashboard Metrics
  const [metrics, setMetrics] = useState({
    visitorsToday: 0,
    pendingComplaints: 0,
    activePolls: 0,
    upcomingBookings: 0,
  });

  // Recent Activity Feed
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    try {
      const { data: profile } = await supabase.from('profiles').select('society_id').eq('id', session?.user.id).single();
      if (!profile?.society_id) return;

      const todayStr = new Date().toISOString().split('T')[0];

      // 1. Visitors Today (from visitor_requests for simplicity, tracking today's requests)
      // Since entry_exit_logs doesn't have society_id directly, we count requests created today.
      const { count: visitorsCount } = await supabase
        .from('visitor_requests')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${todayStr}T00:00:00.000Z`)
        .lte('created_at', `${todayStr}T23:59:59.999Z`);
        
      // 2. Pending Complaints
      const { count: complaintsCount } = await supabase
        .from('complaints')
        .select('*', { count: 'exact', head: true })
        .eq('society_id', profile.society_id)
        .in('status', ['open', 'in_progress']);

      // 3. Active Polls
      const { count: pollsCount } = await supabase
        .from('polls')
        .select('*', { count: 'exact', head: true })
        .eq('society_id', profile.society_id);
        // Note: Realistically we'd filter by closes_at, but we'll show all active for MVP

      // 4. Upcoming Bookings
      // We need to query bookings via amenities
      const { data: amenities } = await supabase.from('amenities').select('id').eq('society_id', profile.society_id);
      let bookingsCount = 0;
      if (amenities && amenities.length > 0) {
        const amenityIds = amenities.map(a => a.id);
        const { count } = await supabase
          .from('amenity_bookings')
          .select('*', { count: 'exact', head: true })
          .in('amenity_id', amenityIds)
          .gte('date', todayStr);
        bookingsCount = count || 0;
      }

      setMetrics({
        visitorsToday: visitorsCount || 0,
        pendingComplaints: complaintsCount || 0,
        activePolls: pollsCount || 0,
        upcomingBookings: bookingsCount || 0,
      });

      // Fetch Recent Complaints for Activity Feed
      const { data: recentC } = await supabase
        .from('complaints')
        .select('id, title, status, created_at, profiles:resident_id(full_name)')
        .eq('society_id', profile.society_id)
        .order('created_at', { ascending: false })
        .limit(3);
        
      setRecentActivities(recentC || []);

    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const StatCard = ({ icon: Icon, title, value, color, bgColor, route }: any) => (
    <TouchableOpacity 
      onPress={() => router.push(route)}
      className="w-[48%] p-4 rounded-2xl mb-4 border border-neutral-100 shadow-sm bg-white"
    >
      <View className={`w-10 h-10 rounded-full items-center justify-center mb-3`} style={{ backgroundColor: bgColor }}>
        <Icon color={color} size={20} />
      </View>
      <Text className="text-3xl font-bold text-neutral-900 mb-1">{value}</Text>
      <Text className="text-neutral-500 font-semibold text-sm">{title}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <View className="px-6 py-4 bg-white border-b border-neutral-200">
        <Text className="text-2xl font-bold text-neutral-900">Dashboard</Text>
      </View>

      {loading && !refreshing ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <ScrollView 
          className="flex-1 p-6"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
        >
          {/* Welcome Section */}
          <View className="mb-6">
            <Text className="text-neutral-500 text-lg">Welcome back,</Text>
            <Text className="text-3xl font-bold text-neutral-900">Admin Team</Text>
          </View>

          {/* Metrics Grid */}
          <View className="flex-row flex-wrap justify-between">
            <StatCard 
              icon={Users} 
              title="Visitors Today" 
              value={metrics.visitorsToday} 
              color="#4F46E5" 
              bgColor="#EEF2FF"
              route="/(admin)/operations"
            />
            <StatCard 
              icon={ShieldAlert} 
              title="Pending Issues" 
              value={metrics.pendingComplaints} 
              color="#E11D48" 
              bgColor="#FFF1F2"
              route="/(admin)/operations"
            />
            <StatCard 
              icon={PieChart} 
              title="Active Polls" 
              value={metrics.activePolls} 
              color="#059669" 
              bgColor="#ECFDF5"
              route="/(admin)/society"
            />
            <StatCard 
              icon={CalendarCheck} 
              title="Upcoming Bookings" 
              value={metrics.upcomingBookings} 
              color="#D97706" 
              bgColor="#FFFBEB"
              route="/(admin)/society"
            />
          </View>

          {/* Recent Activity Section */}
          <View className="mt-6 mb-8">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-neutral-900">Recent Activity</Text>
              <TouchableOpacity onPress={() => router.push('/(admin)/operations')} className="flex-row items-center">
                <Text className="text-indigo-600 font-semibold mr-1">View All</Text>
                <ArrowRight color="#4F46E5" size={16} />
              </TouchableOpacity>
            </View>

            {recentActivities.length === 0 ? (
              <View className="bg-white p-6 rounded-2xl border border-neutral-200 items-center">
                <Activity color="#9CA3AF" size={32} className="mb-3" />
                <Text className="text-neutral-500 font-semibold">No recent activity</Text>
              </View>
            ) : (
              <View className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                {recentActivities.map((activity, index) => (
                  <View 
                    key={activity.id} 
                    className={`p-4 flex-row justify-between items-center ${index !== recentActivities.length - 1 ? 'border-b border-neutral-100' : ''}`}
                  >
                    <View className="flex-1 pr-4">
                      <Text className="font-bold text-neutral-900" numberOfLines={1}>{activity.title}</Text>
                      <Text className="text-neutral-500 text-xs mt-1">By {activity.profiles?.full_name}</Text>
                    </View>
                    <View className={`px-2 py-1 rounded-md ${activity.status === 'open' ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                      <Text className={`text-[10px] font-bold uppercase ${activity.status === 'open' ? 'text-amber-700' : 'text-emerald-700'}`}>
                        {activity.status}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
