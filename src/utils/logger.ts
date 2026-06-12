interface LogData {
  userId: string;
  functionName: string;
  message: string;
}

class Logger {
  private formatLog(level: string, data: LogData): string {
    const dateTime = new Date().toISOString();
    return `[${level}] [${dateTime}] [User: ${data.userId}] [Fn: ${data.functionName}] - ${data.message}`;
  }

  success(userId: string, functionName: string, message: string): void {
    console.log(this.formatLog('SUCCESS', { userId, functionName, message }));
  }

  warn(userId: string, functionName: string, message: string): void {
    console.warn(this.formatLog('WARN', { userId, functionName, message }));
  }

  error(userId: string, functionName: string, message: string): void {
    console.error(this.formatLog('ERROR', { userId, functionName, message }));
  }
}

export const logger = new Logger();
