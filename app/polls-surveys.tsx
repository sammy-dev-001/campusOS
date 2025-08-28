import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Text } from 'react-native';
import { FAB } from 'react-native-paper';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../components/ThemedText';
import { useTheme } from '../contexts/ThemeContext';

// Mock data for polls
const mockPolls = [
	{
		id: '1',
		question: 'What time works best for the next study session?',
		options: [
			{ id: '1-1', text: 'Monday 6 PM', votes: 12 },
			{ id: '1-2', text: 'Wednesday 7 PM', votes: 8 },
			{ id: '1-3', text: 'Friday 5 PM', votes: 15 },
		],
		totalVotes: 35,
		createdBy: 'CS101 Study Group',
		endDate: '2025-09-10',
	},
	{
      id: '2',
      question: 'Which topic should we cover next?',
      options: [
        { id: '2-1', text: 'React Native Navigation', votes: 20 },
        { id: '2-2', text: 'State Management', votes: 15 },
        { id: '2-3', text: 'API Integration', votes: 10 },
		],
		totalVotes: 45,
		createdBy: 'Mobile Dev Club',
		endDate: '2025-09-15',
	},
];

// Helper function to calculate percentage
const calculatePercentage = (votes: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((votes / total) * 100);
};

const PollScreen = () => {
	const theme = useTheme();
	const [votedPolls, setVotedPolls] = useState<Record<string, string>>({});
	const [activeTab, setActiveTab] = useState<'recent' | 'trending' | 'my'>('recent');
	const router = useRouter();
	const [polls, setPolls] = useState(mockPolls);
	const [filteredPolls, setFilteredPolls] = useState(mockPolls);
	const [searchQuery, setSearchQuery] = useState('');

	const styles = StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: '#121212',
		},
		headerBar: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			padding: 16,
			backgroundColor: '#121212',
		},
		headerTitle: {
			fontSize: 20,
			fontWeight: 'bold',
			color: '#fff',
		},
		headerIcon: {
			padding: 4,
		},
		searchContainer: {
			padding: 16,
			paddingTop: 0,
		},
		searchInputContainer: {
			flexDirection: 'row',
			alignItems: 'center',
			backgroundColor: '#1E1E1E',
			borderRadius: 8,
			paddingHorizontal: 12,
			height: 40,
		},
		searchIcon: {
			marginRight: 8,
		},
		searchInput: {
			flex: 1,
			color: '#fff',
			fontSize: 14,
		},
		tabBar: {
			flexDirection: 'row',
			borderBottomWidth: 1,
			borderBottomColor: '#333',
			marginBottom: 8,
		},
		tabItem: {
			flex: 1,
			alignItems: 'center',
			paddingVertical: 12,
			borderBottomWidth: 2,
			borderBottomColor: 'transparent',
		},
		tabItemActive: {
			borderBottomColor: '#3B82F6',
		},
		tabText: {
			color: '#9CA3AF',
			fontSize: 14,
			fontWeight: '500',
		},
		tabTextActive: {
			color: '#3B82F6',
		},
		contentContainer: {
			flex: 1,
			padding: 16,
		},
		scrollView: {
			flex: 1,
		},
		pollCard: {
			backgroundColor: '#1E1E1E',
			borderRadius: 12,
			padding: 16,
			marginBottom: 16,
		},
		pollHeader: {
			marginBottom: 16,
		},
		pollMeta: {
			marginTop: 8,
		},
		metaText: {
			color: '#9CA3AF',
			fontSize: 12,
		},
		pollQuestion: {
			fontSize: 16,
			fontWeight: '600',
			color: '#fff',
			marginBottom: 8,
		},
		optionsContainer: {
			marginBottom: 16,
		},
		optionButton: {
			backgroundColor: '#2D2D2D',
			borderRadius: 8,
			padding: 12,
			marginBottom: 8,
		},
		optionSelected: {
			borderColor: '#3B82F6',
			borderWidth: 1,
		},
		optionTopRow: {
			flexDirection: 'row',
			alignItems: 'center',
		},
		optionText: {
			color: '#fff',
			fontSize: 14,
			flex: 1,
		},
		optionContent: {
			flexDirection: 'row',
			alignItems: 'center',
		},
		optionTextContainer: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			marginBottom: 4,
		},
		percentageText: {
			color: '#9CA3AF',
			fontSize: 12,
		},
		voteCount: {
			color: '#9CA3AF',
			fontSize: 12,
			marginTop: 8,
		},
		noResults: {
			flex: 1,
			justifyContent: 'center',
			alignItems: 'center',
			padding: 20,
		},
		noResultsText: {
			color: '#9CA3AF',
			fontSize: 16,
			textAlign: 'center',
		},
		progressBarContainer: {
			height: 4,
			backgroundColor: '#333',
			borderRadius: 2,
			marginTop: 8,
			overflow: 'hidden',
		},
		progressBar: {
			height: '100%',
			borderRadius: 2,
		},
		voteButton: {
			backgroundColor: '#3B82F6',
			borderRadius: 8,
			padding: 12,
			alignItems: 'center',
			marginTop: 8,
		},
		voteButtonText: {
			color: '#fff',
			fontWeight: '600',
			fontSize: 14,
		},
		pollFooterRow: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			marginTop: 12,
			paddingTop: 12,
			borderTopWidth: 1,
			borderTopColor: '#333',
		},
		creatorRow: {
			flexDirection: 'row',
			alignItems: 'center',
			flex: 1,
		},
		creatorName: {
			color: '#fff',
			fontSize: 12,
			marginRight: 8,
		},
		creatorBadge: {
			backgroundColor: 'rgba(59, 130, 246, 0.2)',
			paddingHorizontal: 6,
			paddingVertical: 2,
			borderRadius: 4,
			marginRight: 8,
		},
		creatorBadgeText: {
			color: '#60A5FA',
			fontSize: 10,
			fontWeight: '500',
		},
		timeLeft: {
			color: '#9CA3AF',
			fontSize: 12,
		},
		statsRow: {
			flexDirection: 'row',
			alignItems: 'center',
		},
		statsText: {
			color: '#9CA3AF',
			fontSize: 12,
			marginLeft: 4,
		},
		fab: {
			position: 'absolute',
			right: 24,
			bottom: 24,
			width: 56,
			height: 56,
			borderRadius: 28,
			backgroundColor: '#3B82F6',
			justifyContent: 'center',
			alignItems: 'center',
			elevation: 4,
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.25,
			shadowRadius: 4,
		},
	});

	const handleVote = (pollId: string, optionId: string) => {
		setVotedPolls({ ...votedPolls, [pollId]: optionId });
	};

	useEffect(() => {
		if (!searchQuery.trim()) {
			setFilteredPolls(polls);
			return;
		}
		const lowercasedQuery = searchQuery.toLowerCase();
		const filtered = polls.filter((poll) =>
			poll.question.toLowerCase().includes(lowercasedQuery)
		);
		setFilteredPolls(filtered);
	}, [searchQuery, polls]);

	const PollItem = React.memo(
		({ poll }: { poll: typeof mockPolls[0] }) => {
			const currentVote = votedPolls[poll.id];
			const hasVoted = !!currentVote;
			const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);

			return (
				<View style={styles.pollCard}>
					<View style={styles.pollHeader}>
						<ThemedText style={styles.pollQuestion}>{poll.question}</ThemedText>
						<View style={styles.pollMeta}>
							<ThemedText style={styles.metaText}>By {poll.createdBy}</ThemedText>
						</View>
					</View>

					<View style={styles.optionsContainer}>
						{poll.options.map((option) => {
							const isSelected = currentVote === option.id;
							const percentage = calculatePercentage(option.votes, totalVotes || 1);

							return (
								<TouchableOpacity
									key={option.id}
									style={[
										styles.optionButton,
										isSelected && styles.optionSelected,
									]}
									onPress={() => handleVote(poll.id, option.id)}
									activeOpacity={0.7}
								>
									<View style={styles.optionTextContainer}>
										<ThemedText style={styles.optionText}>
											{option.text}
										</ThemedText>
										{(hasVoted || option.votes > 0) && (
											<ThemedText style={styles.percentageText}>
												{percentage}%
											</ThemedText>
										)}
									</View>
									{(hasVoted || option.votes > 0) && (
										<View style={styles.progressBarContainer}>
											<View
												style={[
													styles.progressBar,
													{
														width: `${percentage}%`,
														backgroundColor: theme.theme.primary,
													},
												]}
											/>
										</View>
									)}
								</TouchableOpacity>
							);
						})}
					</View>

					<ThemedText style={styles.voteCount}>
						{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'} • Ends{' '}
						{poll.endDate}
					</ThemedText>
				</View>
			);
		},
	(prevProps, nextProps) => prevProps.poll.id === nextProps.poll.id
	);

	// Reset votes for a poll
	const resetVotes = (pollId: string) => {
		setPolls((prevPolls) =>
			prevPolls.map((poll) => {
				if (poll.id === pollId) {
					return {
						...poll,
						options: poll.options.map((option) => ({
							...option,
							votes: 0,
						})),
						totalVotes: 0,
					};
				}
				return poll;
			})
		);

		setVotedPolls((prev) => {
			const newVotes = { ...prev };
			delete newVotes[pollId];
			return newVotes;
		});
	};

	// Filter polls based on search query
	const handleSearch = (query: string) => {
		setSearchQuery(query);
		if (!query.trim()) {
			setFilteredPolls(polls);
			return;
		}
		const lowercasedQuery = query.toLowerCase();
		const filtered = polls.filter((poll) =>
			poll.question.toLowerCase().includes(lowercasedQuery)
		);
		setFilteredPolls(filtered);
	};

	// Check if any poll has been voted on
	const hasVoted = Object.keys(votedPolls).length > 0;

	return (
		<View style={styles.container}>
			{/* Top Bar Title */}
			<View style={styles.headerBar}>
				<ThemedText style={styles.headerTitle}>Polls & Surveys</ThemedText>
				<TouchableOpacity style={styles.headerIcon}>
					<Ionicons name="notifications-outline" size={22} color="#fff" />
				</TouchableOpacity>
			</View>
			{/* Search Bar */}
			<View style={styles.searchContainer}>
				<View style={styles.searchInputContainer}>
					<Ionicons
						name="search"
						size={20}
						color="#9CA3AF"
						style={styles.searchIcon}
					/>
					<TextInput
						style={styles.searchInput}
						placeholder="Search polls or surveys..."
						placeholderTextColor="#9CA3AF"
						value={searchQuery}
						onChangeText={handleSearch}
					/>
				</View>
			</View>
			{/* Tab Bar */}
			<View style={styles.tabBar}>
				{['recent', 'trending', 'my'].map((tab) => (
					<TouchableOpacity
						key={tab}
						style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
						onPress={() => setActiveTab(tab as any)}
					>
						<Text
							style={[
								styles.tabText,
								activeTab === tab && styles.tabTextActive,
							]}
						>
							{tab === 'recent'
								? 'Recent'
								: tab === 'trending'
								? 'Trending'
								: 'My Polls'}
						</Text>
					</TouchableOpacity>
				))}
			</View>
			<Stack.Screen
				options={{
					title: 'Polls',
					headerShown: false,
					headerTitleStyle: {
						color: '#FFFFFF',
						fontSize: 18,
						fontWeight: '600',
					},
					headerTintColor: '#FFFFFF',
					headerTitleAlign: 'center',
					headerRight: () => (
						<TouchableOpacity
							onPress={() => router.push('/create-poll')}
							style={{ marginRight: 16 }}
						>
							<Text
								style={{
									color: '#3B82F6',
									fontSize: 16,
									fontWeight: '500',
								}}
							>
								Create
							</Text>
						</TouchableOpacity>
					),
				}}
			/>
			{/* Search Bar */}
			<View style={styles.searchContainer}>
				<View style={styles.searchInputContainer}>
					<Ionicons
						name="search"
						size={20}
						color="#9CA3AF"
						style={styles.searchIcon}
					/>
					<TextInput
						style={styles.searchInput}
						placeholder="Search polls..."
						placeholderTextColor="#9CA3AF"
						value={searchQuery}
						onChangeText={handleSearch}
					/>
				</View>
			</View>

			{/* Add New Poll FAB */}
			{/* Polls List */}
			<View style={styles.contentContainer}>
				<ScrollView style={styles.scrollView}>
					{filteredPolls.length > 0 ? (
						filteredPolls.map((poll) => (
							<View key={poll.id} style={styles.pollCard}>
								{/* Poll Question */}
								<View style={styles.pollHeader}>
									<ThemedText style={styles.pollQuestion}>{poll.question}</ThemedText>
								</View>
								{/* Poll Options */}
								<View style={styles.optionsContainer}>
									{poll.options.map((option) => {
										const isSelected = votedPolls[poll.id] === option.id;
										const totalVotes = poll.options.reduce(
											(sum, o) => sum + o.votes,
											0
										);
										const percentage =
											totalVotes > 0
												? Math.round((option.votes / totalVotes) * 100)
												: 0;
										const hasVoted = !!votedPolls[poll.id];
										return (
											<TouchableOpacity
												key={option.id}
												style={[
													styles.optionButton,
													isSelected && styles.optionSelected,
												]}
												onPress={() => handleVote(poll.id, option.id)}
												activeOpacity={0.8}
											>
												<View style={styles.optionContent}>
													<View style={styles.optionTopRow}>
														<Ionicons
															name={
																isSelected
																	? 'radio-button-on'
																	: 'radio-button-off'
															}
															size={18}
															color={
																isSelected
																	? theme.theme.primary
																	: '#888'
															}
															style={{ marginRight: 8 }}
														/>
														<ThemedText style={styles.optionText}>
															{option.text}
														</ThemedText>
													</View>
													{hasVoted && (
														<View style={styles.progressBarContainer}>
															<View
																style={[
																	styles.progressBar,
																	{
																		width: `${percentage}%`,
																		backgroundColor: theme.theme.primary,
																	},
																]}
															/>
														</View>
													)}
												</View>
											</TouchableOpacity>
										);
									})}
									<TouchableOpacity style={styles.voteButton}>
										<Text style={styles.voteButtonText}>Vote</Text>
									</TouchableOpacity>
								</View>
								{/* Poll Footer: Creator, Time, Comments, Participants */}
								<View style={styles.pollFooterRow}>
									<View style={styles.creatorRow}>
										<Ionicons
											name="person-circle"
											size={22}
											color="#fff"
											style={{ marginRight: 4 }}
										/>
										<Text style={styles.creatorName}>Dr. Emily Chen</Text>
										<View style={styles.creatorBadge}>
											<Text style={styles.creatorBadgeText}>Creator</Text>
										</View>
										<Text style={styles.timeLeft}>2 days left</Text>
									</View>
									<View style={styles.statsRow}>
										<Ionicons
											name="chatbubble-ellipses-outline"
											size={16}
											color="#fff"
											style={{ marginRight: 2 }}
										/>
										<Text style={styles.statsText}>12 Comments</Text>
										<Ionicons
											name="people-outline"
											size={16}
											color="#fff"
											style={{ marginLeft: 12, marginRight: 2 }}
										/>
										<Text style={styles.statsText}>340 Participants</Text>
									</View>
								</View>
							</View>
						))
					) : (
						<View style={styles.noResults}>
							<ThemedText style={styles.noResultsText}>
								{searchQuery ? 'No matching polls found' : 'No polls available'}
							</ThemedText>
						</View>
					)}
				</ScrollView>
			</View>
			{/* Floating Action Button */}
			<TouchableOpacity
				style={styles.fab}
				onPress={() => router.push('/create-poll')}
			>
				<Ionicons name="add" size={32} color="#fff" />
			</TouchableOpacity>
		</View>
	);
};

// ...existing code...

export default PollScreen;
