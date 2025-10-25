/**
 * Logging utility for structured logging
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export interface LogContext {
  [key: string]: any;
}

class Logger {
  private serviceName: string;

  constructor(serviceName: string = 'group-buying-service') {
    this.serviceName = serviceName;
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      service: this.serviceName,
      message,
      ...context
    };

    // In production, this would send to a logging service (e.g., Winston, Datadog)
    if (level === LogLevel.ERROR || level === LogLevel.CRITICAL) {
      console.error(JSON.stringify(logEntry));
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }

  debug(message: string, context?: LogContext) {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext) {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: LogContext) {
    this.log(LogLevel.ERROR, message, context);
  }

  critical(message: string, context?: LogContext) {
    this.log(LogLevel.CRITICAL, message, context);

    // In production, trigger alerts (PagerDuty, Slack, etc.)
    this.sendAlert(message, context);
  }

  private sendAlert(message: string, context?: LogContext) {
    // TODO: Integrate with alerting service
    // For now, just log with ALERT prefix
    console.error('[ALERT]', message, context);
  }
}

export const logger = new Logger();
