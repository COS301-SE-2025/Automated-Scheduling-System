import * as React from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, Redirect } from 'expo-router';
import TextField from '@/components/ui/TextField';
import Button from '@/components/ui/Button';
import MessageBox from '@/components/ui/MessageBox';
import BrandHeader from '@/components/ui/BrandHeader';
import HelpTooltip from '@/components/ui/HelpTooltip';
import { colors } from '@/constants/colors';

export default function LoginScreen() {
  const { signIn, busy, error, token } = useAuth();
  if (token) {
    return <Redirect href="/(tabs)" />;
  }
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const onSubmit = async () => {
    try {
      await signIn(email, password);
      router.replace('/(tabs)');
    } catch {}
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <BrandHeader
          title="DISCON Specialists"
          subtitle="Automated Scheduling System"
          tagline="Sign in to continue."
        />
        <View style={styles.card}>
          {error && <MessageBox type="error" title="Login Failed">{error}</MessageBox>}
          <TextField
            label="Email address"
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextField
            label="Password"
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Pressable onPress={() => router.push('/(auth)/forgot-password')} style={styles.linkWrap}>
            <Text style={styles.link}>Forgot your password?</Text>
          </Pressable>
          <Button title={busy ? 'Signing in...' : 'Sign in'} onPress={onSubmit} disabled={busy} loading={busy} />
          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <Pressable onPress={() => router.push('/(auth)/signup')}><Text style={styles.link}>Sign up</Text></Pressable>
          </View>
        </View>
        <HelpTooltip text="Enter your credentials to access your account. If you've forgotten your password, use the 'Forgot Password' link. If you do not have an account, use the 'Sign up' link." />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  card: { width: '100%', maxWidth: 380, backgroundColor: colors.surface, padding: 20, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, borderWidth: 1, borderColor: colors.border },
  linkWrap: { alignSelf: 'flex-end', marginBottom: 16 },
  link: { color: colors.primary, fontWeight: '600' },
  signupRow: { flexDirection: 'row', marginTop: 20, justifyContent: 'center' },
  signupText: { color: colors.third },
});
