import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      {user ? (
        <View style={styles.block}>
          {user.name && <Text style={styles.row}><Text style={styles.label}>Name: </Text>{user.name}</Text>}
          {user.email && <Text style={styles.row}><Text style={styles.label}>Email: </Text>{user.email}</Text>}
          {user.username && <Text style={styles.row}><Text style={styles.label}>Username: </Text>{user.username}</Text>}
          {user.role && <Text style={styles.row}><Text style={styles.label}>Role: </Text>{user.role}</Text>}
          {user.employeeStatus && <Text style={styles.row}><Text style={styles.label}>Status: </Text>{user.employeeStatus}</Text>}
        </View>
      ) : (
        <Text style={styles.row}>No user loaded.</Text>
      )}
      <Button title="Sign Out" onPress={signOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  block: { marginBottom: 24, alignSelf: 'stretch' },
  row: { fontSize: 16, marginBottom: 4 },
  label: { fontWeight: '600' },
});
