/**
 * SMS Permission Screen
 * Explains SMS auto-detection and requests permission
 * Only shown on Android - iOS users see manual entry option
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Platform,
    Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { EduFiColors, EduFiSpacing, EduFiFonts } from '../../src/theme/edufi';
import { useTheme } from '../../src/contexts/NewThemeContext';
import { SmsTransactionService } from '../../src/services/smsTransactionService';

export default function SmsPermissionScreen() {
    const router = useRouter();
    const { theme } = useTheme();
    const [isLoading, setIsLoading] = useState(false);

    const backgroundColor = theme?.background || EduFiColors.background;
    const cardBackground = theme?.card || EduFiColors.card;
    const textColor = theme?.text || EduFiColors.text.primary;
    const textSecondary = theme?.textSecondary || EduFiColors.text.secondary;

    const isAndroid = Platform.OS === 'android';

    const handleEnableSms = async () => {
        if (!isAndroid) return;

        setIsLoading(true);
        try {
            const granted = await SmsTransactionService.requestSmsPermission();
            if (granted) {
                router.back();
            }
        } catch (error) {
            console.error('Error requesting SMS permission:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSkip = () => {
        router.back();
    };

    return (
        <View style={[styles.container, { backgroundColor }]}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Back button */}
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={textColor} />
                </TouchableOpacity>

                {/* Hero Icon */}
                <View style={styles.iconContainer}>
                    <Ionicons name="mail-unread" size={80} color={EduFiColors.primary} />
                </View>

                {/* Title */}
                <Text style={[styles.title, { color: textColor }]}>
                    Auto-Detect Transactions
                </Text>
                <Text style={[styles.subtitle, { color: textSecondary }]}>
                    {isAndroid
                        ? 'Let EduFi automatically track your spending from bank SMS'
                        : 'This feature is not available on iOS'
                    }
                </Text>

                {isAndroid ? (
                    <>
                        {/* Benefits */}
                        <View style={[styles.benefitsCard, { backgroundColor: cardBackground }]}>
                            <Text style={[styles.sectionTitle, { color: textColor }]}>
                                How it works
                            </Text>

                            <View style={styles.benefitItem}>
                                <View style={[styles.benefitIcon, { backgroundColor: EduFiColors.income + '20' }]}>
                                    <Ionicons name="flash" size={20} color={EduFiColors.income} />
                                </View>
                                <View style={styles.benefitText}>
                                    <Text style={[styles.benefitTitle, { color: textColor }]}>
                                        Automatic Detection
                                    </Text>
                                    <Text style={[styles.benefitDesc, { color: textSecondary }]}>
                                        Instantly logs transactions from bank alerts
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.benefitItem}>
                                <View style={[styles.benefitIcon, { backgroundColor: EduFiColors.primary + '20' }]}>
                                    <Ionicons name="shield-checkmark" size={20} color={EduFiColors.primary} />
                                </View>
                                <View style={styles.benefitText}>
                                    <Text style={[styles.benefitTitle, { color: textColor }]}>
                                        100% Private
                                    </Text>
                                    <Text style={[styles.benefitDesc, { color: textSecondary }]}>
                                        All data stays on your device - never sent anywhere
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.benefitItem}>
                                <View style={[styles.benefitIcon, { backgroundColor: '#FFA500' + '20' }]}>
                                    <Ionicons name="build" size={20} color="#FFA500" />
                                </View>
                                <View style={styles.benefitText}>
                                    <Text style={[styles.benefitTitle, { color: textColor }]}>
                                        Smart Categorization
                                    </Text>
                                    <Text style={[styles.benefitDesc, { color: textSecondary }]}>
                                        AI suggests categories for each transaction
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Supported Banks */}
                        <View style={[styles.banksCard, { backgroundColor: cardBackground }]}>
                            <Text style={[styles.sectionTitle, { color: textColor }]}>
                                Supported Banks
                            </Text>
                            <View style={styles.banksList}>
                                {['GTBank', 'Access Bank', 'First Bank', 'UBA', 'Zenith', 'Opay', 'Kuda', 'Palmpay'].map((bank) => (
                                    <View key={bank} style={styles.bankChip}>
                                        <Text style={styles.bankText}>{bank}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Privacy Notice */}
                        <View style={[styles.privacyNotice, { backgroundColor: EduFiColors.primary + '10' }]}>
                            <Ionicons name="lock-closed" size={20} color={EduFiColors.primary} />
                            <Text style={[styles.privacyText, { color: textSecondary }]}>
                                Your privacy matters. SMS messages are processed locally and only
                                bank transaction alerts are parsed. You can disable this anytime.
                            </Text>
                        </View>

                        {/* Action Buttons */}
                        <TouchableOpacity
                            style={[styles.enableButton, isLoading && styles.buttonDisabled]}
                            onPress={handleEnableSms}
                            disabled={isLoading}
                        >
                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                            <Text style={styles.enableButtonText}>
                                {isLoading ? 'Requesting...' : 'Enable Auto-Detection'}
                            </Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    /* iOS Message */
                    <View style={[styles.iosCard, { backgroundColor: cardBackground }]}>
                        <Ionicons name="information-circle" size={48} color={EduFiColors.primary} />
                        <Text style={[styles.iosText, { color: textColor }]}>
                            Due to iOS restrictions, automatic SMS detection is not available.
                        </Text>
                        <Text style={[styles.iosSubtext, { color: textSecondary }]}>
                            You can still manually add transactions or use the receipt scanner.
                        </Text>
                    </View>
                )}

                <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                    <Text style={[styles.skipText, { color: textSecondary }]}>
                        {isAndroid ? 'Skip for now' : 'Go back'}
                    </Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: EduFiSpacing.lg,
        paddingTop: Platform.OS === 'ios' ? 60 : EduFiSpacing.xl,
    },
    backButton: {
        padding: 8,
        marginBottom: EduFiSpacing.md,
        alignSelf: 'flex-start',
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: EduFiSpacing.lg,
    },
    title: {
        fontSize: EduFiFonts.sizes.xxl,
        fontWeight: EduFiFonts.weights.bold,
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: EduFiFonts.sizes.md,
        textAlign: 'center',
        marginBottom: EduFiSpacing.xl,
        lineHeight: 22,
    },
    benefitsCard: {
        borderRadius: 16,
        padding: EduFiSpacing.lg,
        marginBottom: EduFiSpacing.md,
    },
    sectionTitle: {
        fontSize: EduFiFonts.sizes.lg,
        fontWeight: EduFiFonts.weights.semibold,
        marginBottom: EduFiSpacing.md,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: EduFiSpacing.md,
    },
    benefitIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    benefitText: {
        flex: 1,
    },
    benefitTitle: {
        fontSize: EduFiFonts.sizes.md,
        fontWeight: EduFiFonts.weights.semibold,
        marginBottom: 2,
    },
    benefitDesc: {
        fontSize: EduFiFonts.sizes.sm,
        lineHeight: 18,
    },
    banksCard: {
        borderRadius: 16,
        padding: EduFiSpacing.lg,
        marginBottom: EduFiSpacing.md,
    },
    banksList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    bankChip: {
        backgroundColor: EduFiColors.primary + '15',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    bankText: {
        color: EduFiColors.primary,
        fontSize: EduFiFonts.sizes.sm,
        fontWeight: EduFiFonts.weights.medium,
    },
    privacyNotice: {
        flexDirection: 'row',
        padding: EduFiSpacing.md,
        borderRadius: 12,
        marginBottom: EduFiSpacing.lg,
        gap: 10,
    },
    privacyText: {
        flex: 1,
        fontSize: EduFiFonts.sizes.sm,
        lineHeight: 18,
    },
    enableButton: {
        backgroundColor: EduFiColors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: EduFiSpacing.md,
        borderRadius: 12,
        gap: 8,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    enableButtonText: {
        color: '#fff',
        fontSize: EduFiFonts.sizes.lg,
        fontWeight: EduFiFonts.weights.semibold,
    },
    skipButton: {
        alignItems: 'center',
        paddingVertical: EduFiSpacing.md,
        marginTop: EduFiSpacing.sm,
    },
    skipText: {
        fontSize: EduFiFonts.sizes.md,
    },
    iosCard: {
        borderRadius: 16,
        padding: EduFiSpacing.xl,
        alignItems: 'center',
        marginBottom: EduFiSpacing.lg,
    },
    iosText: {
        fontSize: EduFiFonts.sizes.md,
        textAlign: 'center',
        marginTop: EduFiSpacing.md,
        fontWeight: EduFiFonts.weights.medium,
    },
    iosSubtext: {
        fontSize: EduFiFonts.sizes.sm,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 18,
    },
});
