/**
 * Post Header Component
 * The header of the feed showing title and user avatar
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getInitials } from './postUtils';
import { useTheme } from '../../src/contexts/NewThemeContext';

interface User {
    profile_picture?: string;
    display_name?: string;
    username?: string;
}

interface PostHeaderProps {
    user?: User | null;
    backgroundColor?: string;
    onNotificationPress?: () => void;
    onAvatarPress?: () => void;
}

export default function PostHeader({
    user,
    backgroundColor,
    onNotificationPress,
    onAvatarPress,
}: PostHeaderProps) {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const initials = getInitials(user?.display_name || user?.username || '');

    // Use prop background if provided, otherwise theme background
    const finalBackgroundColor = backgroundColor || theme.background;

    return (
        <View style={{ backgroundColor: finalBackgroundColor, paddingTop: insets.top }}>
            <View style={[styles.feedHeader, { backgroundColor: finalBackgroundColor }]}>
                <Text style={[styles.feedHeaderTitle, { color: theme.text }]}>EduFeed</Text>
                <View style={styles.feedHeaderRight}>
                    <TouchableOpacity style={{ marginRight: 12 }} onPress={onNotificationPress}>
                        <Ionicons name="notifications-outline" size={24} color={theme.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onAvatarPress}>
                        <View style={styles.feedHeaderAvatar}>
                            {user?.profile_picture ? (
                                <Image
                                    source={{ uri: user.profile_picture }}
                                    style={styles.avatarImage}
                                />
                            ) : (
                                <Text style={styles.feedHeaderAvatarText}>{initials}</Text>
                            )}
                        </View>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    feedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        // Background color handled dynamically
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 4,
    },
    feedHeaderTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'left',
        marginLeft: 8,
    },
    feedHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 10,
    },
    feedHeaderAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#8A2BE2',
        justifyContent: 'center',
        alignItems: 'center',
    },
    feedHeaderAvatarText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    avatarImage: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
});
