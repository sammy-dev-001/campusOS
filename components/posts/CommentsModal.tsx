/**
 * Comments Modal Component
 * Displays comments for a post with reply functionality
 * Themed to match EduFi brand and handles keyboard avoidance
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '../ThemedText';
import { Comment } from './types';

interface CommentsModalProps {
    visible: boolean;
    comments: Comment[];
    commentText: string;
    onClose: () => void;
    onChangeText: (text: string) => void;
    onSubmit: () => void;
    renderComment: (comment: Comment) => React.ReactNode;
    cardColor?: string;
    textColor?: string;
    textSecondaryColor?: string;
    primaryColor?: string;
}

export default function CommentsModal({
    visible,
    comments,
    commentText,
    onClose,
    onChangeText,
    onSubmit,
    renderComment,
    cardColor = '#FFFFFF',
    textColor = '#333333',
    textSecondaryColor = '#666666',
    primaryColor = '#002E5D',
}: CommentsModalProps) {
    const insets = useSafeAreaInsets();

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                    <View style={[styles.modalContent, { backgroundColor: cardColor, paddingBottom: insets.bottom || 16 }]}>
                        {/* Header */}
                        <View style={[styles.modalHeader, { borderBottomColor: textSecondaryColor + '20' }]}>
                            <ThemedText style={[styles.modalTitle, { color: primaryColor }]} type="subtitle">
                                Comments
                            </ThemedText>
                            <TouchableOpacity
                                onPress={onClose}
                                style={[styles.closeBtn, { backgroundColor: textSecondaryColor + '15' }]}
                            >
                                <Ionicons name="close" size={20} color={textColor} />
                            </TouchableOpacity>
                        </View>

                        {/* Comments List */}
                        <ScrollView
                            style={styles.commentsList}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            {comments.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="chatbubble-outline" size={48} color={textSecondaryColor + '40'} />
                                    <ThemedText style={[styles.emptyText, { color: textSecondaryColor }]} type="default">
                                        No comments yet. Be the first to comment!
                                    </ThemedText>
                                </View>
                            ) : (
                                comments.map((comment) => (
                                    <React.Fragment key={comment.id}>
                                        {renderComment(comment)}
                                    </React.Fragment>
                                ))
                            )}
                        </ScrollView>

                        {/* Input */}
                        <View style={[styles.commentInputContainer, { borderTopColor: textSecondaryColor + '20' }]}>
                            <TextInput
                                style={[
                                    styles.commentInput,
                                    {
                                        color: textColor,
                                        borderColor: textSecondaryColor + '30',
                                        backgroundColor: textSecondaryColor + '10',
                                    },
                                ]}
                                placeholder="Add a comment..."
                                placeholderTextColor={textSecondaryColor}
                                value={commentText}
                                onChangeText={onChangeText}
                                multiline
                            />
                            <TouchableOpacity
                                style={[
                                    styles.commentButton,
                                    {
                                        backgroundColor: commentText.trim()
                                            ? '#30B37E'
                                            : textSecondaryColor + '30',
                                    },
                                ]}
                                onPress={onSubmit}
                                disabled={!commentText.trim()}
                            >
                                <Ionicons
                                    name="send"
                                    size={20}
                                    color={commentText.trim() ? '#FFFFFF' : textSecondaryColor}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        height: '80%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 16,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    commentsList: {
        flex: 1,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
        gap: 12,
    },
    emptyText: {
        textAlign: 'center',
        fontSize: 14,
    },
    commentInputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
    },
    commentInput: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginRight: 8,
        fontSize: 14,
        maxHeight: 100,
        minHeight: 40,
    },
    commentButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
