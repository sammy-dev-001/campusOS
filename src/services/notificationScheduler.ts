/**
 * Notification Scheduler Service
 * Schedules smart, context-aware notifications for classes, assignments, and events
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const SCHEDULED_NOTIFICATIONS_KEY = '@scheduled_notifications';

interface ScheduledNotification {
    id: string;
    identifier: string;
    type: 'class' | 'assignment' | 'event' | 'custom';
    title: string;
    referenceId: string; // ID of the class, assignment, or event
    scheduledTime: string;
    minutesBefore: number;
}

interface ClassItem {
    id: string;
    subjectName: string;
    courseCode?: string;
    time: string;
    venue?: string;
    day: number; // 0 = Sunday, 1 = Monday, etc.
}

interface Assignment {
    id: string;
    title: string;
    courseName?: string;
    deadline: string;
}

interface Event {
    id: string;
    title: string;
    startTime: string;
    location?: string;
}

class NotificationScheduler {
    private scheduledNotifications: Map<string, ScheduledNotification> = new Map();

    constructor() {
        this.loadScheduledNotifications();
    }

    /**
     * Load scheduled notifications from storage
     */
    private async loadScheduledNotifications(): Promise<void> {
        try {
            const stored = await AsyncStorage.getItem(SCHEDULED_NOTIFICATIONS_KEY);
            if (stored) {
                const notifications: ScheduledNotification[] = JSON.parse(stored);
                notifications.forEach((n) => this.scheduledNotifications.set(n.id, n));
            }
        } catch (error) {
            console.error('Error loading scheduled notifications:', error);
        }
    }

    /**
     * Save scheduled notifications to storage
     */
    private async saveScheduledNotifications(): Promise<void> {
        try {
            const notifications = Array.from(this.scheduledNotifications.values());
            await AsyncStorage.setItem(SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify(notifications));
        } catch (error) {
            console.error('Error saving scheduled notifications:', error);
        }
    }

    /**
     * Schedule a class reminder notification
     * @param classItem - The class to schedule a reminder for
     * @param minutesBefore - Minutes before class to send reminder (default: 15)
     */
    async scheduleClassReminder(classItem: ClassItem, minutesBefore: number = 15): Promise<string | null> {
        try {
            const notificationId = `class_${classItem.id}_${minutesBefore}`;

            // Cancel existing notification for this class
            await this.cancelNotificationById(notificationId);

            // Parse class time
            const [hours, minutes] = classItem.time.split(':').map(Number);

            // Calculate trigger time
            const now = new Date();
            const classDate = new Date();
            const daysUntilClass = (classItem.day - classDate.getDay() + 7) % 7;
            classDate.setDate(classDate.getDate() + (daysUntilClass === 0 && classDate.getHours() > hours ? 7 : daysUntilClass));
            classDate.setHours(hours, minutes - minutesBefore, 0, 0);

            // Don't schedule if the time has already passed
            if (classDate <= now) {
                classDate.setDate(classDate.getDate() + 7);
            }

            const identifier = await Notifications.scheduleNotificationAsync({
                content: {
                    title: '📚 Class Starting Soon',
                    body: `${classItem.subjectName}${classItem.courseCode ? ` (${classItem.courseCode})` : ''} starts in ${minutesBefore} minutes${classItem.venue ? ` at ${classItem.venue}` : ''}`,
                    data: {
                        type: 'class_reminder',
                        classId: classItem.id,
                        className: classItem.subjectName,
                        venue: classItem.venue,
                    },
                    sound: 'default',
                    ...(Platform.OS === 'android' && { channelId: 'class-reminders' }),
                },
                trigger: {
                    type: 'date',
                    date: classDate,
                } as Notifications.NotificationTriggerInput,
            });

            const scheduledNotification: ScheduledNotification = {
                id: notificationId,
                identifier,
                type: 'class',
                title: classItem.subjectName,
                referenceId: classItem.id,
                scheduledTime: classDate.toISOString(),
                minutesBefore,
            };

            this.scheduledNotifications.set(notificationId, scheduledNotification);
            await this.saveScheduledNotifications();

            return identifier;
        } catch (error) {
            console.error('Error scheduling class reminder:', error);
            return null;
        }
    }

    /**
     * Schedule an assignment deadline reminder
     * @param assignment - The assignment to schedule a reminder for
     * @param hoursBefore - Hours before deadline to send reminder
     */
    async scheduleAssignmentReminder(
        assignment: Assignment,
        hoursBefore: number[] = [24, 6, 1]
    ): Promise<string[]> {
        const identifiers: string[] = [];

        try {
            const deadline = new Date(assignment.deadline);
            const now = new Date();

            for (const hours of hoursBefore) {
                const notificationId = `assignment_${assignment.id}_${hours}h`;

                // Cancel existing notification
                await this.cancelNotificationById(notificationId);

                const reminderTime = new Date(deadline.getTime() - hours * 60 * 60 * 1000);

                // Don't schedule if already passed
                if (reminderTime <= now) continue;

                const timeLeft = hours >= 24 ? `${Math.floor(hours / 24)} day(s)` : `${hours} hour(s)`;

                const identifier = await Notifications.scheduleNotificationAsync({
                    content: {
                        title: '📝 Assignment Due Soon',
                        body: `${assignment.title}${assignment.courseName ? ` (${assignment.courseName})` : ''} is due in ${timeLeft}`,
                        data: {
                            type: 'assignment_reminder',
                            assignmentId: assignment.id,
                            title: assignment.title,
                        },
                        sound: 'default',
                        ...(Platform.OS === 'android' && { channelId: 'assignments' }),
                    },
                    trigger: {
                        type: 'date',
                        date: reminderTime,
                    } as Notifications.NotificationTriggerInput,
                });

                const scheduledNotification: ScheduledNotification = {
                    id: notificationId,
                    identifier,
                    type: 'assignment',
                    title: assignment.title,
                    referenceId: assignment.id,
                    scheduledTime: reminderTime.toISOString(),
                    minutesBefore: hours * 60,
                };

                this.scheduledNotifications.set(notificationId, scheduledNotification);
                identifiers.push(identifier);
            }

            await this.saveScheduledNotifications();
            return identifiers;
        } catch (error) {
            console.error('Error scheduling assignment reminder:', error);
            return identifiers;
        }
    }

    /**
     * Schedule an event reminder
     * @param event - The event to schedule a reminder for
     * @param minutesBefore - Minutes before event to send reminder
     */
    async scheduleEventReminder(event: Event, minutesBefore: number = 30): Promise<string | null> {
        try {
            const notificationId = `event_${event.id}_${minutesBefore}`;

            // Cancel existing notification
            await this.cancelNotificationById(notificationId);

            const eventTime = new Date(event.startTime);
            const reminderTime = new Date(eventTime.getTime() - minutesBefore * 60 * 1000);
            const now = new Date();

            // Don't schedule if already passed
            if (reminderTime <= now) return null;

            const timeText = minutesBefore >= 60
                ? `${Math.floor(minutesBefore / 60)} hour(s)`
                : `${minutesBefore} minutes`;

            const identifier = await Notifications.scheduleNotificationAsync({
                content: {
                    title: '🎉 Event Reminder',
                    body: `${event.title} starts in ${timeText}${event.location ? ` at ${event.location}` : ''}`,
                    data: {
                        type: 'event_reminder',
                        eventId: event.id,
                        title: event.title,
                    },
                    sound: 'default',
                    ...(Platform.OS === 'android' && { channelId: 'events' }),
                },
                trigger: {
                    type: 'date',
                    date: reminderTime,
                } as Notifications.NotificationTriggerInput,
            });

            const scheduledNotification: ScheduledNotification = {
                id: notificationId,
                identifier,
                type: 'event',
                title: event.title,
                referenceId: event.id,
                scheduledTime: reminderTime.toISOString(),
                minutesBefore,
            };

            this.scheduledNotifications.set(notificationId, scheduledNotification);
            await this.saveScheduledNotifications();

            return identifier;
        } catch (error) {
            console.error('Error scheduling event reminder:', error);
            return null;
        }
    }

    /**
     * Schedule all class reminders for the week
     * @param classes - Array of classes
     * @param minutesBefore - Minutes before each class to remind
     */
    async scheduleWeeklyClassReminders(classes: ClassItem[], minutesBefore: number = 15): Promise<void> {
        for (const classItem of classes) {
            await this.scheduleClassReminder(classItem, minutesBefore);
        }
    }

    /**
     * Cancel a notification by its custom ID
     */
    async cancelNotificationById(id: string): Promise<void> {
        try {
            const notification = this.scheduledNotifications.get(id);
            if (notification) {
                await Notifications.cancelScheduledNotificationAsync(notification.identifier);
                this.scheduledNotifications.delete(id);
                await this.saveScheduledNotifications();
            }
        } catch (error) {
            console.error('Error canceling notification:', error);
        }
    }

    /**
     * Cancel all notifications for a specific class
     */
    async cancelClassNotifications(classId: string): Promise<void> {
        const toCancel = Array.from(this.scheduledNotifications.entries())
            .filter(([id]) => id.startsWith(`class_${classId}_`));

        for (const [id] of toCancel) {
            await this.cancelNotificationById(id);
        }
    }

    /**
     * Cancel all notifications for a specific assignment
     */
    async cancelAssignmentNotifications(assignmentId: string): Promise<void> {
        const toCancel = Array.from(this.scheduledNotifications.entries())
            .filter(([id]) => id.startsWith(`assignment_${assignmentId}_`));

        for (const [id] of toCancel) {
            await this.cancelNotificationById(id);
        }
    }

    /**
     * Cancel all notifications for a specific event
     */
    async cancelEventNotifications(eventId: string): Promise<void> {
        const toCancel = Array.from(this.scheduledNotifications.entries())
            .filter(([id]) => id.startsWith(`event_${eventId}_`));

        for (const [id] of toCancel) {
            await this.cancelNotificationById(id);
        }
    }

    /**
     * Cancel all scheduled notifications
     */
    async cancelAllNotifications(): Promise<void> {
        try {
            await Notifications.cancelAllScheduledNotificationsAsync();
            this.scheduledNotifications.clear();
            await this.saveScheduledNotifications();
        } catch (error) {
            console.error('Error canceling all notifications:', error);
        }
    }

    /**
     * Get all scheduled notifications
     */
    getScheduledNotifications(): ScheduledNotification[] {
        return Array.from(this.scheduledNotifications.values());
    }

    /**
     * Get scheduled notifications by type
     */
    getScheduledNotificationsByType(type: 'class' | 'assignment' | 'event'): ScheduledNotification[] {
        return Array.from(this.scheduledNotifications.values()).filter((n) => n.type === type);
    }
}

// Export singleton instance
export const notificationScheduler = new NotificationScheduler();

export default notificationScheduler;
