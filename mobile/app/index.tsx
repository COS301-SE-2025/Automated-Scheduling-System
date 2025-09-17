import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function RootIndexRedirect() {
  const { token } = useAuth();
  return token ? <Redirect href="/(tabs)" /> : <Redirect href="/(auth)/login" />;
}
