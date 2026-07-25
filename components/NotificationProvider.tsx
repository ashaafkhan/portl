import React, { useEffect, createContext, useContext } from 'react';
import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthProvider';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const NotificationContext = createContext({});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();

  useEffect(() => {
    if (!session?.user) return;

    let noticesSub: any;
    let complaintsSub: any;
    let pollsSub: any;
    let requestsSub: any;

    const setupSubscriptions = async () => {
      // Fetch profile to get role and society_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, society_id, flat_id')
        .eq('id', session.user.id)
        .single();

      if (!profile || !profile.society_id) return;

      const triggerNotification = (title: string, body: string) => {
        Notifications.scheduleNotificationAsync({
          content: { title, body },
          trigger: null,
        });
      };

      if (profile.role === 'resident') {
        // Listen to New Notices
        noticesSub = supabase
          .channel('public:notices')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notices', filter: `society_id=eq.${profile.society_id}` }, (payload: any) => {
            triggerNotification('New Notice', payload.new.title);
          })
          .subscribe();

        // Listen to New Polls
        pollsSub = supabase
          .channel('public:polls')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'polls', filter: `society_id=eq.${profile.society_id}` }, (payload: any) => {
            triggerNotification('New Community Poll', payload.new.question);
          })
          .subscribe();

        // Listen to Complaint Status Changes
        complaintsSub = supabase
          .channel('public:complaints')
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'complaints', filter: `resident_id=eq.${session.user.id}` }, (payload: any) => {
            triggerNotification('Complaint Updated', `Your complaint "${payload.new.title}" is now ${payload.new.status}`);
          })
          .subscribe();

        // Listen to Visitor Requests (if they have a flat_id)
        if (profile.flat_id) {
          requestsSub = supabase
            .channel('public:visitor_requests')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'visitor_requests', filter: `flat_id=eq.${profile.flat_id}` }, (payload: any) => {
              triggerNotification('New Visitor', 'You have a new visitor waiting at the gate!');
            })
            .subscribe();
        }

      } else if (profile.role === 'admin') {
        // Admins listen to new complaints
        complaintsSub = supabase
          .channel('admin:complaints')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'complaints', filter: `society_id=eq.${profile.society_id}` }, (payload: any) => {
            triggerNotification('New Complaint', `A resident submitted a new complaint: ${payload.new.title}`);
          })
          .subscribe();
          
      } else if (profile.role === 'guard') {
        // Guards could listen to approvals, but since they have the request screen open, it's usually live there.
        // For now, we can notify if a request they created was updated.
        requestsSub = supabase
          .channel('guard:visitor_requests')
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'visitor_requests', filter: `created_by=eq.${session.user.id}` }, (payload: any) => {
            if (payload.new.status !== 'pending') {
              triggerNotification('Visitor Request Update', `Resident has ${payload.new.status} the visitor.`);
            }
          })
          .subscribe();
      }
    };

    setupSubscriptions();

    return () => {
      if (noticesSub) supabase.removeChannel(noticesSub);
      if (complaintsSub) supabase.removeChannel(complaintsSub);
      if (pollsSub) supabase.removeChannel(pollsSub);
      if (requestsSub) supabase.removeChannel(requestsSub);
    };
  }, [session]);

  return (
    <NotificationContext.Provider value={{}}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
