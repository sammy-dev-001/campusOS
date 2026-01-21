/**
 * Logger Utility
 * Provides environment-aware logging that only outputs in development
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
    enabled: boolean;
    minLevel: LogLevel;
    prefix: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

// Default config - only log in development
const defaultConfig: LoggerConfig = {
    enabled: __DEV__ ?? process.env.NODE_ENV !== 'production',
    minLevel: 'debug',
    prefix: '[CampusOS]',
};

let config: LoggerConfig = { ...defaultConfig };

/**
 * Configure the logger
 */
export function configureLogger(newConfig: Partial<LoggerConfig>) {
    config = { ...config, ...newConfig };
}

/**
 * Check if we should log at the given level
 */
function shouldLog(level: LogLevel): boolean {
    if (!config.enabled) return false;
    return LOG_LEVELS[level] >= LOG_LEVELS[config.minLevel];
}

/**
 * Format the log message with prefix and context
 */
function formatMessage(context: string, message: string): string {
    return `${config.prefix} [${context}] ${message}`;
}

/**
 * Logger object with methods for each log level
 */
export const logger = {
    debug: (context: string, message: string, ...args: any[]) => {
        if (shouldLog('debug')) {
            console.log(formatMessage(context, message), ...args);
        }
    },

    info: (context: string, message: string, ...args: any[]) => {
        if (shouldLog('info')) {
            console.info(formatMessage(context, message), ...args);
        }
    },

    warn: (context: string, message: string, ...args: any[]) => {
        if (shouldLog('warn')) {
            console.warn(formatMessage(context, message), ...args);
        }
    },

    error: (context: string, message: string, ...args: any[]) => {
        if (shouldLog('error')) {
            console.error(formatMessage(context, message), ...args);
        }
    },

    /**
     * Create a scoped logger for a specific context
     */
    scope: (context: string) => ({
        debug: (message: string, ...args: any[]) => logger.debug(context, message, ...args),
        info: (message: string, ...args: any[]) => logger.info(context, message, ...args),
        warn: (message: string, ...args: any[]) => logger.warn(context, message, ...args),
        error: (message: string, ...args: any[]) => logger.error(context, message, ...args),
    }),
};

export default logger;
