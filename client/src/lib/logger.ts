/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LogType = "request" | "response" | "error" | "info" | "warn";

export interface LogEntry {
  id: string;
  timestamp: number;
  type: LogType;
  title: string;
  data: any;
}

type Listener = (logs: LogEntry[]) => void;

class Logger {
  private logs: LogEntry[] = [];
  private listeners: Listener[] = [];

  log(type: LogType, title: string, data?: any) {
    let safeData = data;
    try {
      // Handle Error objects explicitly because JSON.stringify(error) returns {}
      if (data instanceof Error) {
        const extraErrorProps = {
          ...(data as unknown as Record<string, unknown>),
        };
        safeData = {
          // Spread remaining properties if any custom ones exist
          ...extraErrorProps,
          name: data.name,
          message: data.message,
          stack: data.stack,
          cause: (data as Error & { cause?: unknown }).cause,
        };
      } else if (typeof data === "object" && data !== null) {
        // Create a snapshot of data to prevent mutation issues and ensure it's serializable
        // Simple circular reference check could be added here if needed, but JSON.stringify/parse is a quick sanitizer
        safeData = JSON.parse(
          JSON.stringify(data, (key, value) => {
            // Filter out large binary data strings to keep logs readable
            if (
              typeof value === "string" &&
              value.length > 1000 &&
              (key === "base64" || key === "data")
            ) {
              return `[TRUNCATED_STRING length=${value.length}]`;
            }
            return value;
          }),
        );
      }
    } catch (e) {
      safeData = "[Data cannot be serialized - Circular reference or invalid]";
    }

    const entry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type,
      title,
      data: safeData,
    };

    // Keep most recent 50 logs
    this.logs = [entry, ...this.logs].slice(0, 50);
    this.notify();

    const logPrefix = `[ConfAgent] [${type.toUpperCase()}] ${title}`;
    if (type === "error") {
      console.error(logPrefix, data || "");
    } else if (type === "warn") {
      console.warn(logPrefix, data || "");
    } else {
      console.log(logPrefix, data || "");
    }
  }

  subscribe(listener: Listener) {
    this.listeners.push(listener);
    listener(this.logs); // Send current logs immediately
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.logs));
  }

  clear() {
    this.logs = [];
    this.notify();
  }
}

export const logger = new Logger();
