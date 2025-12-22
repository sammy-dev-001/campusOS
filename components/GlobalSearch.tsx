/**
 * Global Search Component
 * Unified search across all content types: users, events, posts, groups, etc.
 */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Keyboard,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { api } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/NewThemeContext';

interface SearchResult {
    id: string;
    type: 'user' | 'event' | 'post' | 'group' | 'document' | 'announcement';
    title: string;
    subtitle?: string;
    image?: string;
    route?: string;
    data?: any;
}

interface SearchCategory {
    key: string;
    label: string;
    icon: string;
}

const SEARCH_CATEGORIES: SearchCategory[] = [
    { key: 'all', label: 'All', icon: 'search' },
    { key: 'users', label: 'Users', icon: 'people-outline' },
    { key: 'events', label: 'Events', icon: 'calendar-outline' },
    { key: 'posts', label: 'Posts', icon: 'document-text-outline' },
    { key: 'groups', label: 'Groups', icon: 'people-circle-outline' },
    { key: 'documents', label: 'Notes', icon: 'book-outline' },
];

const RECENT_SEARCHES_KEY = '@recent_searches';
const MAX_RECENT_SEARCHES = 10;

interface GlobalSearchProps {
    visible: boolean;
    onClose: () => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ visible, onClose }) => {
    const { theme } = useTheme();
    const router = useRouter();
    const inputRef = useRef<TextInput>(null);

    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('all');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [showRecent, setShowRecent] = useState(true);

    const styles = getStyles(theme);

    // Load recent searches
    useEffect(() => {
        if (visible) {
            loadRecentSearches();
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            setQuery('');
            setResults([]);
            setShowRecent(true);
        }
    }, [visible]);

    const loadRecentSearches = async () => {
        try {
            const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
            if (stored) {
                setRecentSearches(JSON.parse(stored));
            }
        } catch (error) {
            console.error('Error loading recent searches:', error);
        }
    };

    const saveRecentSearch = async (searchQuery: string) => {
        try {
            const updated = [searchQuery, ...recentSearches.filter((s) => s !== searchQuery)].slice(
                0,
                MAX_RECENT_SEARCHES
            );
            setRecentSearches(updated);
            await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
        } catch (error) {
            console.error('Error saving recent search:', error);
        }
    };

    const clearRecentSearches = async () => {
        try {
            await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
            setRecentSearches([]);
        } catch (error) {
            console.error('Error clearing recent searches:', error);
        }
    };

    // Debounced search
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);

    const handleSearch = useCallback(
        (text: string) => {
            setQuery(text);
            setShowRecent(text.length === 0);

            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }

            if (text.length < 2) {
                setResults([]);
                return;
            }

            searchTimeout.current = setTimeout(() => {
                performSearch(text, category);
            }, 300);
        },
        [category]
    );

    const performSearch = async (searchQuery: string, searchCategory: string) => {
        setLoading(true);
        try {
            const response = await api.get('/search', {
                params: {
                    q: searchQuery,
                    category: searchCategory === 'all' ? undefined : searchCategory,
                },
            });

            const formattedResults: SearchResult[] = (response.data?.data?.results || []).map(
                (item: any) => ({
                    id: item._id || item.id,
                    type: item.type,
                    title: item.title || item.name || item.displayName || item.username,
                    subtitle: item.subtitle || item.description || item.email,
                    image: item.image || item.profilePic || item.coverImage,
                    route: getRouteForResult(item),
                    data: item,
                })
            );

            setResults(formattedResults);

            if (formattedResults.length > 0) {
                saveRecentSearch(searchQuery);
            }
        } catch (error) {
            console.error('Search error:', error);
            // Fallback: Try searching locally or show mock results
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const getRouteForResult = (item: any): string => {
        switch (item.type) {
            case 'user':
                return `/profile/${item._id || item.id}`;
            case 'event':
                return `/events/${item._id || item.id}`;
            case 'post':
                return `/post/${item._id || item.id}`;
            case 'group':
                return `/group-details/${item._id || item.id}`;
            case 'document':
                return `/notes-past-questions`;
            case 'announcement':
                return `/announcements`;
            default:
                return '/';
        }
    };

    const handleResultPress = (result: SearchResult) => {
        Keyboard.dismiss();
        onClose();
        if (result.route) {
            router.push(result.route as any);
        }
    };

    const handleRecentSearchPress = (searchQuery: string) => {
        setQuery(searchQuery);
        setShowRecent(false);
        performSearch(searchQuery, category);
    };

    const getIconForType = (type: string) => {
        switch (type) {
            case 'user':
                return 'person-outline';
            case 'event':
                return 'calendar-outline';
            case 'post':
                return 'document-text-outline';
            case 'group':
                return 'people-outline';
            case 'document':
                return 'book-outline';
            case 'announcement':
                return 'megaphone-outline';
            default:
                return 'search-outline';
        }
    };

    const renderResult = ({ item }: { item: SearchResult }) => (
        <TouchableOpacity style={styles.resultItem} onPress={() => handleResultPress(item)}>
            {item.image ? (
                <Image source={{ uri: item.image }} style={styles.resultImage} />
            ) : (
                <View style={[styles.resultIcon, { backgroundColor: `${theme.primary}20` }]}>
                    <Ionicons name={getIconForType(item.type) as any} size={24} color={theme.primary} />
                </View>
            )}
            <View style={styles.resultContent}>
                <Text style={[styles.resultTitle, { color: theme.text }]} numberOfLines={1}>
                    {item.title}
                </Text>
                {item.subtitle && (
                    <Text style={[styles.resultSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                        {item.subtitle}
                    </Text>
                )}
            </View>
            <View style={styles.resultType}>
                <Text style={[styles.resultTypeText, { color: theme.textSecondary }]}>
                    {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="arrow-back" size={24} color={theme.text} />
                    </TouchableOpacity>
                    <View style={[styles.searchBar, { backgroundColor: theme.card }]}>
                        <Ionicons name="search" size={20} color={theme.textSecondary} />
                        <TextInput
                            ref={inputRef}
                            style={[styles.searchInput, { color: theme.text }]}
                            placeholder="Search everything..."
                            placeholderTextColor={theme.textSecondary}
                            value={query}
                            onChangeText={handleSearch}
                            returnKeyType="search"
                            autoFocus
                        />
                        {query.length > 0 && (
                            <TouchableOpacity onPress={() => handleSearch('')}>
                                <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Categories */}
                <View style={styles.categories}>
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={SEARCH_CATEGORIES}
                        keyExtractor={(item) => item.key}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[
                                    styles.categoryPill,
                                    {
                                        backgroundColor: category === item.key ? theme.primary : theme.card,
                                    },
                                ]}
                                onPress={() => {
                                    setCategory(item.key);
                                    if (query.length >= 2) {
                                        performSearch(query, item.key);
                                    }
                                }}
                            >
                                <Ionicons
                                    name={item.icon as any}
                                    size={16}
                                    color={category === item.key ? '#fff' : theme.textSecondary}
                                />
                                <Text
                                    style={[
                                        styles.categoryText,
                                        { color: category === item.key ? '#fff' : theme.textSecondary },
                                    ]}
                                >
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        )}
                        contentContainerStyle={styles.categoriesContent}
                    />
                </View>

                {/* Content */}
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.primary} />
                    </View>
                ) : showRecent && recentSearches.length > 0 ? (
                    <View style={styles.recentContainer}>
                        <View style={styles.recentHeader}>
                            <Text style={[styles.recentTitle, { color: theme.text }]}>Recent Searches</Text>
                            <TouchableOpacity onPress={clearRecentSearches}>
                                <Text style={[styles.clearText, { color: theme.primary }]}>Clear</Text>
                            </TouchableOpacity>
                        </View>
                        {recentSearches.map((search, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.recentItem}
                                onPress={() => handleRecentSearchPress(search)}
                            >
                                <Ionicons name="time-outline" size={20} color={theme.textSecondary} />
                                <Text style={[styles.recentText, { color: theme.text }]}>{search}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                ) : results.length > 0 ? (
                    <FlatList
                        data={results}
                        keyExtractor={(item) => item.id}
                        renderItem={renderResult}
                        contentContainerStyle={styles.resultsContainer}
                        keyboardShouldPersistTaps="handled"
                    />
                ) : query.length >= 2 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="search-outline" size={64} color={theme.textSecondary} />
                        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                            No results found for "{query}"
                        </Text>
                    </View>
                ) : (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="search-outline" size={64} color={theme.textSecondary} />
                        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                            Start typing to search
                        </Text>
                    </View>
                )}
            </View>
        </Modal>
    );
};

const getStyles = (theme: any) =>
    StyleSheet.create({
        container: {
            flex: 1,
            paddingTop: Platform.OS === 'android' ? 25 : 0,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: Platform.OS === 'ios' ? 50 : 16,
            paddingBottom: 12,
        },
        closeButton: {
            padding: 8,
            marginRight: 8,
        },
        searchBar: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 12,
            gap: 8,
        },
        searchInput: {
            flex: 1,
            fontSize: 16,
            padding: 0,
        },
        categories: {
            paddingVertical: 8,
        },
        categoriesContent: {
            paddingHorizontal: 16,
            gap: 8,
        },
        categoryPill: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 20,
            marginRight: 8,
            gap: 6,
        },
        categoryText: {
            fontSize: 14,
            fontWeight: '500',
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        resultsContainer: {
            paddingHorizontal: 16,
        },
        resultItem: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.border || '#333',
        },
        resultImage: {
            width: 48,
            height: 48,
            borderRadius: 24,
        },
        resultIcon: {
            width: 48,
            height: 48,
            borderRadius: 24,
            justifyContent: 'center',
            alignItems: 'center',
        },
        resultContent: {
            flex: 1,
            marginLeft: 12,
        },
        resultTitle: {
            fontSize: 16,
            fontWeight: '500',
        },
        resultSubtitle: {
            fontSize: 14,
            marginTop: 2,
        },
        resultType: {
            marginLeft: 8,
        },
        resultTypeText: {
            fontSize: 12,
        },
        recentContainer: {
            paddingHorizontal: 16,
            paddingTop: 16,
        },
        recentHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
        },
        recentTitle: {
            fontSize: 16,
            fontWeight: '600',
        },
        clearText: {
            fontSize: 14,
        },
        recentItem: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 12,
            gap: 12,
        },
        recentText: {
            fontSize: 16,
        },
        emptyContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 32,
        },
        emptyText: {
            fontSize: 16,
            textAlign: 'center',
            marginTop: 16,
        },
    });

export default GlobalSearch;
