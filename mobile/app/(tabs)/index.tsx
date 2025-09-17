import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { mockEvents, mockEventDefinitions } from '@/mock/data';

export default function DashboardScreen() {
	const total = mockEvents.length;
	const scheduled = mockEvents.filter(e => e.status === 'Scheduled').length;
	const completed = mockEvents.filter(e => e.status === 'Completed').length;

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Dashboard</Text>
			<View style={styles.card}><Text>Total Events: {total}</Text></View>
			<View style={styles.card}><Text>Scheduled: {scheduled}</Text></View>
			<View style={styles.card}><Text>Completed: {completed}</Text></View>
			<View style={styles.card}><Text>Definitions: {mockEventDefinitions.length}</Text></View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 16, paddingTop: 40 },
	title: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
	card: { padding: 12, borderRadius: 8, backgroundColor: '#f3f4f6', marginBottom: 12 }
});
