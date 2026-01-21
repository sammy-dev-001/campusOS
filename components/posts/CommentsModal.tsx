/**
 * Comments Modal Component
 * Displays comments for a post with reply functionality
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
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
    cardColor = '#1E1E1E',
    textColor = '#FFFFFF',
    textSecondaryColor = '#A0A0A0',
    primaryColor = '#FFD600',
}: CommentsModalProps) {
    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <View style={[styles.modalContent, { backgroundColor: cardColor }]}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <ThemedText style={styles.modalTitle} type="subtitle">
                            Comments
                        </ThemedText>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={textColor} />
                        </TouchableOpacity>
                    </View>

                    {/* Comments List */}
                    <ScrollView style={styles.commentsList}>
                        {comments.length === 0 ? (
                            <ThemedText style={styles.emptyText} type="default">
                                No comments yet. Be the first to comment!
                            </ThemedText>
                        ) : (
                            comments.map((comment) => (
                                <React.Fragment key={comment.id}>
                                    {renderComment(comment)}
                                </React.Fragment>
                            ))
                        )}
                    </ScrollView>

                    {/* Input */}
                    <View style={styles.commentInputContainer}>
                        <TextInput
                            style={[
                                styles.commentInput,
                                { color: textColor, borderColor: primaryColor },
                            ]}
                            placeholder="Add a comment..."
                            placeholderTextColor={textSecondaryColor}
                            value={commentText}
                            onChangeText={onChangeText}
                            multiline
                        />
                        <TouchableOpacity
                            style={[styles.commentButton, { backgroundColor: primaryColor }]}
                            onPress={onSubmit}
                        >
                            <Ionicons name="send" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
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
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 16,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    commentsList: {
        flex: 1,
    },
    emptyText: {
        color: '#A0A0A0',
        textAlign: 'center',
        marginTop: 40,
        fontSize: 14,
    },
    commentInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
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
    },
    commentButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
