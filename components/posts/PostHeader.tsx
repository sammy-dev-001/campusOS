/**
 * Post Header Component
 * The header of the feed showing title and user avatar
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getInitials } from './postUtils';

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
    backgroundColor = '#121212',
    onNotificationPress,
    onAvatarPress,
}: PostHeaderProps) {
    const insets = useSafeAreaInsets();
    const initials = getInitials(user?.display_name || user?.username || '');

    return (
        <View style={{ backgroundColor, paddingTop: insets.top }}>
            <View style={styles.feedHeader}>
                <Text style={styles.feedHeaderTitle}>EduFi Feed</Text>
                <View style={styles.feedHeaderRight}>
                    <TouchableOpacity style={{ marginRight: 12 }} onPress={onNotificationPress}>
                        <Ionicons name="notifications-outline" size={24} color="#fff" />
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
        backgroundColor: '#121212',
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 4,
    },
    feedHeaderTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center',
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
