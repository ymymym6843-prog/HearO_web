/**
 * 로깅 유틸리티
 * 환경에 따라 로깅을 제어하고 구조화된 로그 출력 제공
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

// 환경 설정
const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

// 로그 레벨 우선순위
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// 현재 환경의 최소 로그 레벨
const MIN_LOG_LEVEL: LogLevel = isDevelopment ? 'debug' : 'warn';

/**
 * 로그 출력 여부 확인
 */
function shouldLog(level: LogLevel): boolean {
  if (isTest) return false;
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LOG_LEVEL];
}

/**
 * 로그 메시지 포맷팅
 */
function formatMessage(module: string, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${module}] ${message}${contextStr}`;
}

/**
 * 로거 클래스
 */
class Logger {
  private module: string;

  constructor(module: string) {
    this.module = module;
  }

  debug(message: string, context?: LogContext): void {
    if (shouldLog('debug')) {
      console.log(formatMessage(this.module, message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (shouldLog('info')) {
      console.info(formatMessage(this.module, message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (shouldLog('warn')) {
      console.warn(formatMessage(this.module, message, context));
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (shouldLog('error')) {
      const errorContext = error instanceof Error
        ? { ...context, errorMessage: error.message, stack: error.stack }
        : { ...context, error };
      console.error(formatMessage(this.module, message, errorContext));
    }
  }
}

/**
 * 모듈별 로거 생성
 */
export function createLogger(module: string): Logger {
  return new Logger(module);
}

/**
 * 기본 로거 (모듈명 없이 사용)
 */
export const logger = new Logger('app');

export default logger;
