import * as React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import BrandHeader from '@/components/ui/BrandHeader';
import TextField from '@/components/ui/TextField';
import Button from '@/components/ui/Button';
import HelpTooltip from '@/components/ui/HelpTooltip';
import { colors } from '@/constants/colors';

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');

  const submit = () => {
    // TODO: integrate sign up
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <BrandHeader title="DISCON Specialists" subtitle="Create Account" tagline="Fill in your details." />
      <View style={styles.card}>
        <TextField label="Full Name" value={name} onChangeText={setName} placeholder="John Doe" />
        <TextField label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" />
        <TextField label="Password" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />
        <TextField label="Confirm Password" value={confirm} onChangeText={setConfirm} placeholder="••••••••" secureTextEntry />
        <Button title="Sign up" onPress={submit} disabled={!email || !password || password !== confirm} />
        <Pressable onPress={() => router.replace('/(auth)/login')} style={styles.back}>
          <Text style={styles.link}>Already have an account? Sign in</Text>
        </Pressable>
      </View>
      <HelpTooltip text="Provide your details to create an account. You'll be redirected to login upon success." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  card: { width: '100%', maxWidth: 380, backgroundColor: colors.surface, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  back: { marginTop: 20, alignSelf: 'center' },
  link: { color: colors.primary, fontWeight: '600', textAlign: 'center' },
});
