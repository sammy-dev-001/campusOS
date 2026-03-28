/**
 * SwipeableMessage – WhatsApp-style swipe-to-reply gesture wrapper.
 *
 * Wrap each chat bubble with this component. When the user swipes right
 * (for incoming messages) or left (for own messages), it triggers onReply.
 *
 * Uses react-native-gesture-handler Gesture API +
 * react-native-reanimated for 60 fps animations.
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

const SWIPE_THRESHOLD = 60; // px needed to trigger reply
const MAX_TRANSLATE = 80;   // max visual drag distance

interface SwipeableMessageProps {
    children: React.ReactNode;
    isOwn: boolean;
    onReply: () => void;
}

export default function SwipeableMessage({ children, isOwn, onReply }: SwipeableMessageProps) {
    const translateX = useSharedValue(0);
    const hasTriggered = useSharedValue(false);

    const panGesture = Gesture.Pan()
        .activeOffsetX(isOwn ? [-15, 0] : [0, 15])
        .failOffsetY([-10, 10])
        .onStart(() => {
            hasTriggered.value = false;
        })
        .onUpdate((event) => {
            if (isOwn) {
                // Only allow swiping left for own messages
                const clampedX = Math.max(-MAX_TRANSLATE, Math.min(0, event.translationX));
                translateX.value = clampedX;
                if (clampedX <= -SWIPE_THRESHOLD && !hasTriggered.value) {
                    hasTriggered.value = true;
                    runOnJS(onReply)();
                }
            } else {
                // Only allow swiping right for other messages
                const clampedX = Math.min(MAX_TRANSLATE, Math.max(0, event.translationX));
                translateX.value = clampedX;
                if (clampedX >= SWIPE_THRESHOLD && !hasTriggered.value) {
                    hasTriggered.value = true;
                    runOnJS(onReply)();
                }
            }
        })
        .onEnd(() => {
            translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    // Reply icon appears behind the message as you swipe
    const replyIconStyle = useAnimatedStyle(() => {
        const progress = isOwn
            ? Math.min(Math.abs(translateX.value) / SWIPE_THRESHOLD, 1)
            : Math.min(translateX.value / SWIPE_THRESHOLD, 1);
        return {
            opacity: Math.max(0, progress),
            transform: [{ scale: 0.5 + progress * 0.5 }],
        };
    });

    return (
        <View style={styles.container}>
            {/* Reply icon behind (left side for incoming, right side for own) */}
            <Animated.View
                style={[
                    styles.replyIcon,
                    isOwn ? styles.replyIconRight : styles.replyIconLeft,
                    replyIconStyle,
                ]}
            >
                <View style={styles.replyIconCircle}>
                    <Ionicons name="arrow-undo" size={18} color="#fff" />
                </View>
            </Animated.View>

            {/* The actual message bubble */}
            <GestureDetector gesture={panGesture}>
                <Animated.View style={animatedStyle}>
                    {children}
                </Animated.View>
            </GestureDetector>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },
    replyIcon: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        width: 40,
    },
    replyIconLeft: {
        left: -8,
    },
    replyIconRight: {
        right: -8,
    },
    replyIconCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(48, 179, 126, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
