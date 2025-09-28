import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { ActivityIndicator, View } from 'react-native';

export default function TabsLayout() {
  const { token, busy, user, permissions, isElevated } = useAuth();
  
  if (busy) {
    return (
      <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  
  if (!token) return <Redirect href="/(auth)/login" />;

  // Determine which tabs to show based on role
  const canViewEventDefinitions = permissions?.includes('event-definitions') || user?.role === 'Admin' || user?.role === 'HR' || true; // Allow all users for mobile

  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="speedometer" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />
      {canViewEventDefinitions && (
        <Tabs.Screen
          name="event-definitions"
          options={{
            title: isElevated ? 'All Types' : 'My Types',
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Ionicons name="book" size={size} color={color} />
            ),
          }}
        />
      )}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
