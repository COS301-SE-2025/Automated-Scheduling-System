import * as React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getScheduledEvents, type MobileEvent } from '@/services/events';
import { colors } from '@/constants/colors';
import { useRouter } from 'expo-router';

export default function DashboardScreen() {
	const { user } = useAuth();
	const router = useRouter();
	const [upcoming, setUpcoming] = React.useState<MobileEvent[]>([]);
	const [loading, setLoading] = React.useState(true);
	const [error, setError] = React.useState<string | null>(null);

	React.useEffect(() => {
		let cancelled = false;
		(async () => {
			if (!user) { setUpcoming([]); setLoading(false); return; }
			try {
				setLoading(true);
				const events = await getScheduledEvents();
				const now = new Date();
				const next3 = events
					.filter(e => e.start && new Date(e.start) > now)
					.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
					.slice(0, 3);
				if (!cancelled) { setUpcoming(next3); setError(null); }
			} catch (e: any) {
				if (!cancelled) setError('Could not load your upcoming events.');
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => { cancelled = true; };
	}, [user]);

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<Text style={styles.h1}>Welcome, {user?.name || 'User'}!</Text>
			<Text style={styles.subtitle}>Here's a quick overview of your workspace.</Text>

			<View style={styles.grid}>
		<Tile title="Your Upcoming Events" onPress={() => router.push('/(tabs)/events')} variant="primary">
					{loading ? (
						<Text style={styles.muted}>Loading your events...</Text>
					) : error ? (
						<Text style={[styles.muted, { color: colors.danger }]}>{error}</Text>
					) : upcoming.length === 0 ? (
						<Text style={styles.muted}>No upcoming events on your schedule.</Text>
					) : (
						<View style={{ gap: 8 }}>
							{upcoming.map(ev => (
								<View key={ev.id} style={styles.eventRow}>
									<Text style={styles.eventTitle}>{ev.title}</Text>
									<Text style={styles.eventWhen}>
										{new Date(ev.start).toLocaleDateString(undefined, {
											weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
											hour: 'numeric', minute: '2-digit'
										})}
									</Text>
								</View>
							))}
						</View>
					)}
				</Tile>

	<Tile title="View Full Calendar" onPress={() => router.push('/(tabs)/calendar')} variant="primary">
					<Text>Access the interactive company calendar to view all events and manage schedules.</Text>
				</Tile>

	<Tile title="Event Definitions" onPress={() => router.push('/(tabs)/event-definitions')} variant="primary">
					<Text>Define reusable event templates, facilitators, and durations used for scheduling.</Text>
				</Tile>

										<Tile title="Profile" onPress={() => router.push('/(tabs)/profile')} variant="primary">
					<Text>Review your details and sign out of the application.</Text>
				</Tile>
			</View>
		</ScrollView>
	);
}

		function Tile({ title, children, onPress, variant = 'neutral' }: { title: string; children?: React.ReactNode; onPress?: () => void; variant?: 'neutral' | 'primary' | 'secondary' | 'third' }) {
			const tint = variant === 'primary' ? { bg: colors.surface, border: colors.primary, title: colors.primary }
				: variant === 'secondary' ? { bg: colors.surface, border: colors.secondary, title: colors.secondary }
				: variant === 'third' ? { bg: colors.surface, border: colors.third, title: colors.third }
				: { bg: colors.surface, border: colors.border, title: colors.text };
	return (
				<TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.tile, { backgroundColor: tint.bg, borderColor: tint.border }] }>
					<Text style={[styles.tileTitle, { color: tint.title }]}>{title}</Text>
					<View style={{ marginTop: 8 }}>{children}</View>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	container: { padding: 16, paddingTop: 24 },
	h1: { fontSize: 24, fontWeight: '700', color: colors.text },
	subtitle: { marginTop: 4, color: colors.muted },
		grid: { marginTop: 16, rowGap: 12 },
			tile: { padding: 16, borderRadius: 12, borderWidth: 1 },
	tileTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
	muted: { color: colors.muted },
			eventRow: { borderLeftWidth: 4, borderLeftColor: colors.primary, paddingLeft: 8 },
	eventTitle: { fontWeight: '700', color: colors.text },
	eventWhen: { color: colors.text },
});
