import { Slot } from 'expo-router';
import { AuthProvider } from '@/contexts/AuthContext';

export default function Root() {
  return (
    <AuthProvider>
      <Slot />
    </AuthProvider>
  );
}
