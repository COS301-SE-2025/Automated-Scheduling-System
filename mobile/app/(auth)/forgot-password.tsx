import * as React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import BrandHeader from '@/components/ui/BrandHeader';
import HelpTooltip from '@/components/ui/HelpTooltip';
import TextField from '@/components/ui/TextField';
import Button from '@/components/ui/Button';
import { colors } from '@/constants/colors';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);

  const submit = () => {
    // TODO: integrate backend forgot-password
    setSubmitted(true);
  };

  return (
    <View style={styles.container}>
      <BrandHeader title="DISCON Specialists" subtitle="Password Recovery" tagline="We'll email you reset instructions." />
      <View style={styles.card}>
        {submitted ? (
          <Text style={styles.info}>If an account exists, a reset link was sent to {email}.</Text>
        ) : (
          <>
            <TextField label="Email address" placeholder="you@example.com" value={email} onChangeText={setEmail} autoCapitalize="none" />
            <Button title="Send reset link" onPress={submit} disabled={!email} />
          </>
        )}
        <Pressable onPress={() => router.replace('/(auth)/login')} style={styles.back}>
          <Text style={styles.link}>Back to login</Text>
        </Pressable>
      </View>
      <HelpTooltip text="Enter your email address and we'll send you a link to reset your password." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  card: { width: '100%', maxWidth: 380, backgroundColor: colors.surface, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  info: { color: colors.secondary, marginBottom: 16 },
  back: { marginTop: 20, alignSelf: 'center' },
  link: { color: colors.primary, fontWeight: '600' },
});
