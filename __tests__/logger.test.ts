/**
 * Logger Utility Tests
 */

import { logger, configureLogger } from '../src/utils/logger';

describe('Logger Utility', () => {
    const originalConsoleLog = console.log;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;

    beforeEach(() => {
        // Mock console methods
        console.log = jest.fn();
        console.warn = jest.fn();
        console.error = jest.fn();
        console.info = jest.fn();

        // Enable logging for tests
        configureLogger({ enabled: true, minLevel: 'debug' });
    });

    afterEach(() => {
        // Restore original console methods
        console.log = originalConsoleLog;
        console.warn = originalConsoleWarn;
        console.error = originalConsoleError;
    });

    it('should log debug messages when enabled', () => {
        logger.debug('TestContext', 'Debug message');
        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining('Debug message'),
        );
    });

    it('should log warning messages', () => {
        logger.warn('TestContext', 'Warning message');
        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining('Warning message'),
        );
    });

    it('should log error messages', () => {
        logger.error('TestContext', 'Error message');
        expect(console.error).toHaveBeenCalledWith(
            expect.stringContaining('Error message'),
        );
    });

    it('should include context in log messages', () => {
        logger.debug('MyComponent', 'Test message');
        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining('[MyComponent]'),
            // Additional args may follow
        );
    });

    it('should not log when disabled', () => {
        configureLogger({ enabled: false });

        logger.debug('TestContext', 'Should not appear');
        logger.warn('TestContext', 'Should not appear');
        logger.error('TestContext', 'Should not appear');

        expect(console.log).not.toHaveBeenCalled();
        expect(console.warn).not.toHaveBeenCalled();
        expect(console.error).not.toHaveBeenCalled();
    });

    it('should respect minimum log level', () => {
        configureLogger({ enabled: true, minLevel: 'warn' });

        logger.debug('TestContext', 'Debug should not appear');
        logger.info('TestContext', 'Info should not appear');
        logger.warn('TestContext', 'Warn should appear');
        logger.error('TestContext', 'Error should appear');

        expect(console.log).not.toHaveBeenCalled();
        expect(console.warn).toHaveBeenCalled();
        expect(console.error).toHaveBeenCalled();
    });

    it('should create scoped loggers', () => {
        const componentLogger = logger.scope('MyComponent');

        componentLogger.debug('Scoped debug');
        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining('[MyComponent]'),
        );
    });
});
