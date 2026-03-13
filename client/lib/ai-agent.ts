/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { logger } from "./logger";

const API_BASE_URL = "https://retrieval-agent-220969899128.us-central1.run.app";
const APP_NAME = "Agent";

export interface ScriptMessage {
  type: "text" | "tool";
  data?: string;
  role: "user" | "assistant";
  toolName?: string;
  toolArgs?: any;
}

export const createScriptSession = async (
  userId: string,
  sessionId: string,
): Promise<boolean> => {
  const url = `${API_BASE_URL}/apps/${APP_NAME}/users/${userId}/sessions/${sessionId}`;
  logger.log("request", "Creating Script Session", { userId, sessionId, url });

  try {
    // UPDATED: Added headers and empty JSON body
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    const success = res.status === 200;
    logger.log(
      success ? "response" : "error",
      "Script Session Creation Result",
      { status: res.status, success },
    );
    return success;
  } catch (error) {
    logger.log("error", "Failed to create script session", error);
    return false;
  }
};

export const deleteScriptSession = async (
  userId: string,
  sessionId: string,
): Promise<void> => {
  const url = `${API_BASE_URL}/apps/${APP_NAME}/users/${userId}/sessions/${sessionId}`;
  logger.log("info", "Deleting Script Session", { userId, sessionId });
  try {
    await fetch(url, { method: "DELETE" });
  } catch (error) {
    logger.log("error", "Failed to delete script session", error);
  }
};

export const sendScriptMessage = async (
  message: string,
  userId: string,
  sessionId: string,
  onUpdate: (update: {
    type: "text" | "tool";
    data?: string;
    toolName?: string;
    toolArgs?: any;
  }) => void,
): Promise<void> => {
  const payload = {
    app_name: APP_NAME,
    user_id: userId,
    session_id: sessionId,
    new_message: {
      role: "user",
      parts: [{ text: message }],
    },
  };

  const url = `${API_BASE_URL}/run_sse`;

  logger.log("request", "Script Agent: Send Message (SSE)", payload);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.log("error", `Script Agent: HTTP Error ${response.status}`, {
        error: errorText,
      });
      onUpdate({
        type: "text",
        data: `[ERROR] ${response.status}: ${errorText}`,
      });
      return;
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    if (!reader) {
      logger.log("error", "Script Agent: Failed to get stream reader");
      return;
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        logger.log("info", "Script Agent: Stream completed");
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      const lines = buffer.split("\n");
      // Keep the last line in the buffer as it might be incomplete
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;

        const rawData = line.slice(6).trim();
        if (!rawData) continue;

        try {
          const data = JSON.parse(rawData);
          // logger.log('response', 'Script Agent: Parsed SSE Data', data);

          const content = data.content || {};
          if (content.parts) {
            for (const part of content.parts) {
              // Handle Text
              if (part.text) {
                onUpdate({ type: "text", data: part.text });
              }

              // Handle Function Call
              if (part.functionCall) {
                logger.log(
                  "info",
                  "Script Agent: Function Call detected",
                  part.functionCall,
                );
                onUpdate({
                  type: "tool",
                  toolName: part.functionCall.name,
                  toolArgs: part.functionCall.args,
                });
              }
            }
          }
        } catch (e) {
          // Safety Check: Only treat as text if it doesn't look like a JSON object/array
          // This prevents raw broken JSON from being displayed to the user
          const trimmed = rawData.trim();
          if (trimmed && !trimmed.startsWith("{") && !trimmed.startsWith("[")) {
            onUpdate({ type: "text", data: rawData });
          } else {
            // It looked like JSON but failed to parse (or logic failed), implying it shouldn't be user-facing text
            logger.log(
              "warn",
              "Script Agent: Skipped potential raw JSON chunk",
              rawData,
            );
          }
        }
      }
    }
  } catch (error) {
    logger.log("error", "Script Agent: Generation flow exception", error);
    onUpdate({
      type: "text",
      data: `[ERROR] Connection failed: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
};
