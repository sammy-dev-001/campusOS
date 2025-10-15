import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { fetchPolls } from '../services/pollService';
import { useTheme } from '../src/contexts/NewThemeContext';
import { eventBus } from '../src/utils/eventBus';
import type { Poll } from '../types/poll';

// Helper function to calculate percentage
const calculatePercentage = (votes: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((votes / total) * 100);
};

const formatDate = (iso?: string) => {
	if (!iso) return 'N/A';
	const d = new Date(iso);
	if (isNaN(d.getTime())) return 'N/A';
	return d.toLocaleDateString();
};

const PollScreen = () => {
	const theme = useTheme();
	const [votedPolls, setVotedPolls] = useState<Record<string, string>>({});
	const [activeTab, setActiveTab] = useState<'recent' | 'trending' | 'my'>('recent');
	const router = useRouter();
	const [polls, setPolls] = useState<Poll[]>([]);
	const [filteredPolls, setFilteredPolls] = useState<Poll[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const isFocused = useIsFocused();
	const params = useLocalSearchParams();
    const refreshRequested = params?.refresh
    	? (Array.isArray(params.refresh) ? params.refresh.includes('1') : params.refresh === '1')
    	: false;
	const [searchQuery, setSearchQuery] = useState('');
	const [fabAnim] = useState(new Animated.Value(0));
  const [fabOpen, setFabOpen] = useState(false);
  const [fabOptionsAnim] = useState([new Animated.Value(0), new Animated.Value(0)]);

	const styles = StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: '#121212',
		},
		headerBar: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			padding: 12,
			paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 12,
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
			flexWrap: 'wrap',
		},
		creatorRow: {
			flexDirection: 'row',
			alignItems: 'center',
			flex: 1,
			minWidth: '50%',
			marginBottom: 4,
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
			marginLeft: 'auto',
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
		fabContainer: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    zIndex: 100,
    alignItems: 'flex-end',
  },
  fabOption: {
    position: 'relative',
    right: 0,
    zIndex: 101,
    marginBottom: 4,
    marginRight: 0,
  },
  fabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  fabButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 8,
  },
  fabIcon: {
    width: 20,
    textAlign: 'center',
  },
  mainFab: {
    backgroundColor: '#3B82F6',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
	});

	const handleVote = (pollId: string, optionId: string) => {
		setVotedPolls({ ...votedPolls, [pollId]: optionId });
	};

  const handleFabPress = () => {
    if (!fabOpen) {
      setFabOpen(true);
      // Opening: animate main FAB first, then stagger the option buttons
      Animated.parallel([
        Animated.spring(fabAnim, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.stagger(70, fabOptionsAnim.map((_, index) => 
          Animated.spring(fabOptionsAnim[index], {
            toValue: 1,
            friction: 6,
            useNativeDriver: true,
          })
        ))
      ]).start();
    } else {
      // Closing: animate option buttons out first, then main FAB
      Animated.parallel([
        ...fabOptionsAnim.map(anim => 
          Animated.timing(anim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          })
        ),
        Animated.timing(fabAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start(() => {
        setFabOpen(false);
      });
    }
  };

  const handleFabOptionPress = (type: 'poll' | 'survey') => {
    // Close the menu first
    Animated.parallel(
      fabOptionsAnim.map(anim =>
        Animated.timing(anim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        })
      )
    ).start(() => {
      Animated.timing(fabAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setFabOpen(false);
        // Navigate after animation completes
        router.push(`/create-poll?type=${type}`);
      });
    });
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

	// Fetch polls when screen mounts or when it becomes focused (so newly created polls show up)
	useEffect(() => {
		const load = async () => {
			try {
				setIsLoading(true);
				const data = await fetchPolls({ sortBy: 'newest', limit: 50 });
				setPolls(data);
				setFilteredPolls(data);
			} catch (err) {
				console.error('Failed to load polls:', err);
			} finally {
				setIsLoading(false);
			}
		};

		if (isFocused || refreshRequested) {
			load();
		}

		// Subscribe to optimistic created poll events
		const off = eventBus.on('poll:created', (created: Poll) => {
			if (!created || !created.id) return;
			setPolls(prev => [created, ...prev]);
			setFilteredPolls(prev => [created, ...prev]);
		});

		return () => off();
	}, [isFocused, refreshRequested]);
	

	const PollItem = React.memo(
		({ poll }: { poll: Poll }) => {
			const currentVote = votedPolls[poll.id];
			const hasVoted = !!currentVote;
			// Compute votes per option from poll.votes array returned by the server
			const totalVotes = poll.votes ? poll.votes.length : 0;

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
							const optionVotes = poll.votes ? poll.votes.filter(v => v.optionId === option.id).length : 0;
							const percentage = calculatePercentage(optionVotes, totalVotes || 1);

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
										{(hasVoted || optionVotes > 0) && (
											<ThemedText style={styles.percentageText}>
												{percentage}%
											</ThemedText>
										)}
									</View>
									{(hasVoted || optionVotes > 0) && (
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
						{formatDate(poll.expiresAt)}
					</ThemedText>
				</View>
			);
		},
	(prevProps, nextProps) => prevProps.poll.id === nextProps.poll.id
	);

	// Reset votes for a poll (client-side only placeholder)
	const resetVotes = (pollId: string) => {
		setPolls((prevPolls) =>
			prevPolls.map((poll) => {
				if (poll.id === pollId) {
					return {
						...poll,
						votes: [],
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
			{/* Add New Poll FAB */}
			{/* Polls List */}
			<View style={styles.contentContainer}>
				{isLoading ? (
					<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
						<ActivityIndicator size="large" color="#3B82F6" />
					</View>
				) : (
					<ScrollView style={styles.scrollView}>
						{filteredPolls.length > 0 ? (
							filteredPolls.map((poll) => (
								<PollItem key={poll.id} poll={poll} />
							))
						) : (
							<View style={styles.noResults}>
								<ThemedText style={styles.noResultsText}>
									{searchQuery ? 'No matching polls found' : 'No polls available'}
								</ThemedText>
							</View>
						)}
					</ScrollView>
				)}
			</View>
			{/* Create Poll/Survey FAB */}
      <Animated.View
        style={[styles.fabContainer, {
          transform: [{ scale: fabAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) }],
        }]}
      >
        {fabOpen && (
          <>
            <Animated.View
              style={[styles.fabOption, {
                opacity: fabOptionsAnim[0],
                transform: [
                  {
                    translateY: fabOptionsAnim[0].interpolate({
                      inputRange: [0, 1],
                      outputRange: [8, -48],
                    }),
                  },
                  { scale: fabOptionsAnim[0] },
                ],
              }]}
            >
              <TouchableOpacity
                onPress={() => handleFabOptionPress('poll')}
                style={[styles.fabButton, { backgroundColor: '#007AFF' }]}
              >
                <Ionicons name="checkbox-outline" size={20} color="#fff" style={styles.fabIcon} />
                <Text style={styles.fabButtonText}>Create Poll</Text>
              </TouchableOpacity>
            </Animated.View>
            <Animated.View
              style={[styles.fabOption, {
                opacity: fabOptionsAnim[1],
                transform: [
                  {
                    translateY: fabOptionsAnim[1].interpolate({
                      inputRange: [0, 1],
                      outputRange: [8, -16],
                    }),
                  },
                  { scale: fabOptionsAnim[1] },
                ],
              }]}
            >
              <TouchableOpacity
                onPress={() => handleFabOptionPress('survey')}
                style={[styles.fabButton, { backgroundColor: '#5856D6' }]}
              >
                <Ionicons name="document-text-outline" size={20} color="#fff" style={styles.fabIcon} />
                <Text style={styles.fabButtonText}>Create Survey</Text>
              </TouchableOpacity>
            </Animated.View>
          </>
        )}
        <TouchableOpacity
          onPress={handleFabPress}
          style={styles.mainFab}
        >
          <Ionicons 
            name={fabOpen ? 'close' : 'add'} 
            size={32} 
            color="#fff" 
          />
        </TouchableOpacity>
      </Animated.View>
		</View>
	);
};

// ...existing code...

export default PollScreen;
