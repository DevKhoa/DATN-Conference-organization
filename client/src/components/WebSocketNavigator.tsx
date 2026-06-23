import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import useAuth from "@/features/auth/hooks/useAuth";
import { RadioTower, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";

const BASE_API_URL = import.meta.env.VITE_API_BASE_URL as string;
const wsProtocolUrl = BASE_API_URL.replace(/^http/, "ws");

interface WebSocketNavigatorProps {
  isActive: boolean;
  tabId: string;
}

export const WebSocketNavigator = ({
  isActive,
  tabId,
}: WebSocketNavigatorProps) => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [, setIsActive] = useState(false);

  const userId = session?.user?.user_metadata?.["user_id"]?.toString();

  useEffect(() => {
    if (!userId || !isActive) return;

    console.log(
      `[WebSocketNavigator] Connecting... UserID: ${userId}, TabID: ${tabId}`,
    );

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
    const wsProto = apiBaseUrl.startsWith("https") ? "wss" : "ws";
    const wsHost = apiBaseUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const ws = new WebSocket(`${wsProto}://${wsHost}/ws/${userId}/${tabId}`);

    ws.onopen = () => {
      console.log(`[WebSocketNavigator] Connected! TabID is: ${tabId}`);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("[WebSocketNavigator] Received action:", data);

        const isElementVisible = (el: Element): boolean => {
          const style = window.getComputedStyle(el);
          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            style.opacity !== "0" &&
            (el as HTMLElement).offsetParent !== null
          );
        };

        const getPageContextIds = (): string[] => {
          const interactableSelector = [
            "button:not([disabled])[id]",
            "a[href][id]",
            "input:not([type='hidden']):not([disabled])[id]",
            "textarea:not([disabled])[id]",
            "select:not([disabled])[id]",
          ].join(", ");
          const elements = document.querySelectorAll(interactableSelector);
          return Array.from(elements)
            .filter((el) => isElementVisible(el))
            .map((el) => el.id);
        };

        const getCleanedHtml = (): string => {
          const SKIP_TAGS = new Set([
            "script", "style", "svg", "noscript", "iframe",
            "path", "defs", "g", "head", "meta", "link",
          ]);
          const INTERACTIVE_TAGS = new Set(["button", "a", "input", "textarea", "select"]);
          const CONTENT_TAGS = new Set([
            "h1", "h2", "h3", "h4", "h5", "h6",
            "p", "li", "label", "th", "td", "option",
          ]);

          const lines: string[] = [];

          const processElement = (el: Element): void => {
            const tag = el.tagName.toLowerCase();
            if (SKIP_TAGS.has(tag)) return;
            if (!isElementVisible(el)) return;

            if (INTERACTIVE_TAGS.has(tag)) {
              const attrs: string[] = [];
              if (el.id) attrs.push(`id="${el.id}"`);

              const type = el.getAttribute("type");
              if (type) attrs.push(`type="${type}"`);

              const placeholder = el.getAttribute("placeholder");
              if (placeholder) attrs.push(`placeholder="${placeholder}"`);

              const ariaLabel = el.getAttribute("aria-label");
              if (ariaLabel) attrs.push(`aria-label="${ariaLabel}"`);

              const href = el.getAttribute("href");
              if (href && !href.startsWith("#")) attrs.push(`href="${href}"`);

              if ((el as HTMLButtonElement).disabled) attrs.push("disabled");

              const attrStr = attrs.length ? " " + attrs.join(" ") : "";
              const text = el.textContent?.trim().replace(/\s+/g, " ") || "";

              if (tag === "input") {
                const val = (el as HTMLInputElement).value;
                const valStr = val ? ` value="${val}"` : "";
                lines.push(`<${tag}${attrStr}${valStr}/>`);
              } else if (tag === "textarea") {
                const val = (el as HTMLTextAreaElement).value;
                lines.push(`<${tag}${attrStr}>${val}</${tag}>`);
              } else if (tag === "select") {
                const val = (el as HTMLSelectElement).value;
                if (val) attrs.push(`value="${val}"`);
                lines.push(`<${tag}${attrStr}/>`);
              } else {
                // button, a
                if (text) lines.push(`<${tag}${attrStr}>${text}</${tag}>`);
              }
              return; // do not recurse into interactive elements
            }

            if (CONTENT_TAGS.has(tag)) {
              const text = el.textContent?.trim().replace(/\s+/g, " ") || "";
              if (text) lines.push(`<${tag}>${text}</${tag}>`);
              return; // do not recurse further
            }

            // Structural wrapper — transparent, recurse into children in DOM order
            Array.from(el.children).forEach((child) => processElement(child));
          };

          Array.from(document.body.children).forEach((child) =>
            processElement(child),
          );

          return lines.join("\n");
        };

        const sendResponse = (
          status: "success" | "error",
          message: string,
          url: string,
          html?: string,
        ) => {
          if (data.action_id && ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                action_id: data.action_id,
                status,
                message,
                url,
                available_ids: getPageContextIds(),
                html: html,
              }),
            );
          }
        };

        switch (data.action) {
          case "navigate":
            const targetRoute = data.path || data.page;
            if (targetRoute) {
              const path = targetRoute.startsWith("/")
                ? targetRoute
                : `/${targetRoute}`;
              console.log("[WebSocketNavigator] Navigating to:", path);
              try {
                // @ts-ignore
                navigate({ to: path })
                  .then(() => {
                    setTimeout(() => {
                      sendResponse(
                        "success",
                        "Navigated successfully",
                        window.location.href,
                      );
                    }, 100);
                  })
                  .catch((e: any) => {
                    sendResponse(
                      "error",
                      `Failed to navigate: ${e.message}`,
                      window.location.href,
                    );
                  });
              } catch (e: any) {
                sendResponse(
                  "error",
                  `Failed to navigate: ${e.message}`,
                  window.location.href,
                );
              }
            } else {
              sendResponse("error", "No route provided", window.location.href);
            }
            break;

          case "click":
            if (data.target) {
              console.log(
                "[WebSocketNavigator] Clicking element:",
                data.target,
              );
              const elementToClick = document.querySelector(
                data.target,
              ) as HTMLElement;
              if (elementToClick) {
                elementToClick.click();
                setTimeout(() => {
                  sendResponse(
                    "success",
                    `Clicked on ${data.target}`,
                    window.location.href,
                  );
                }, 100);
              } else {
                sendResponse(
                  "error",
                  `Element not found: ${data.target}`,
                  window.location.href,
                );
              }
            } else {
              sendResponse(
                "error",
                "No target provided for click",
                window.location.href,
              );
            }
            break;

          case "fill":
            if (data.target && data.value !== undefined) {
              console.log(
                `[WebSocketNavigator] Filling element ${data.target} with value:`,
                data.value,
              );
              const inputElement = document.querySelector(data.target) as
                | HTMLInputElement
                | HTMLTextAreaElement;
              if (inputElement) {
                try {
                  const proto =
                    inputElement instanceof HTMLTextAreaElement
                      ? window.HTMLTextAreaElement.prototype
                      : window.HTMLInputElement.prototype;

                  const nativeInputValueSetter =
                    Object.getOwnPropertyDescriptor(proto, "value")?.set;

                  if (nativeInputValueSetter) {
                    nativeInputValueSetter.call(inputElement, data.value);
                    inputElement.dispatchEvent(
                      new Event("input", { bubbles: true }),
                    );
                    // Dispatch change event to trigger React state updates
                    inputElement.dispatchEvent(
                      new Event("change", { bubbles: true }),
                    );

                    setTimeout(() => {
                      sendResponse(
                        "success",
                        `Filled ${data.target}`,
                        window.location.href,
                      );
                    }, 50);
                  } else {
                    inputElement.value = data.value;
                    inputElement.dispatchEvent(
                      new Event("input", { bubbles: true }),
                    );
                    sendResponse(
                      "success",
                      `Filled ${data.target} via fallback`,
                      window.location.href,
                    );
                  }
                } catch (e: any) {
                  sendResponse(
                    "error",
                    `Error filling element: ${e.message}`,
                    window.location.href,
                  );
                }
              } else {
                sendResponse(
                  "error",
                  `Element not found: ${data.target}`,
                  window.location.href,
                );
              }
            } else {
              sendResponse(
                "error",
                "Target or value missing for fill action",
                window.location.href,
              );
            }
            break;

          case "fill_enter":
            if (data.target && data.value !== undefined) {
              console.log(
                `[WebSocketNavigator] Filling element and pressing Enter ${data.target} with value:`,
                data.value,
              );
              const inputElement = document.querySelector(data.target) as
                | HTMLInputElement
                | HTMLTextAreaElement;
              if (inputElement) {
                try {
                  const proto =
                    inputElement instanceof HTMLTextAreaElement
                      ? window.HTMLTextAreaElement.prototype
                      : window.HTMLInputElement.prototype;

                  const nativeInputValueSetter =
                    Object.getOwnPropertyDescriptor(proto, "value")?.set;

                  if (nativeInputValueSetter) {
                    nativeInputValueSetter.call(inputElement, data.value);
                    inputElement.dispatchEvent(
                      new Event("input", { bubbles: true }),
                    );
                    inputElement.dispatchEvent(
                      new Event("change", { bubbles: true }),
                    );

                    // Trigger Enter keydown
                    inputElement.dispatchEvent(
                      new KeyboardEvent("keydown", {
                        key: "Enter",
                        code: "Enter",
                        keyCode: 13,
                        which: 13,
                        bubbles: true,
                        cancelable: true,
                      }),
                    );

                    setTimeout(() => {
                      sendResponse(
                        "success",
                        `Filled ${data.target} and pressed Enter`,
                        window.location.href,
                      );
                    }, 50);
                  } else {
                    inputElement.value = data.value;
                    inputElement.dispatchEvent(
                      new Event("input", { bubbles: true }),
                    );
                    inputElement.dispatchEvent(
                      new KeyboardEvent("keydown", {
                        key: "Enter",
                        bubbles: true,
                      }),
                    );
                    sendResponse(
                      "success",
                      `Filled ${data.target} via fallback and pressed Enter`,
                      window.location.href,
                    );
                  }
                } catch (e: any) {
                  sendResponse(
                    "error",
                    `Error filling element: ${e.message}`,
                    window.location.href,
                  );
                }
              } else {
                sendResponse(
                  "error",
                  `Element not found: ${data.target}`,
                  window.location.href,
                );
              }
            } else {
              sendResponse(
                "error",
                "Target or value missing for fill_enter action",
                window.location.href,
              );
            }
            break;

          case "fill_datetime":
            if (data.target && data.value !== undefined) {
              console.log(
                `[WebSocketNavigator] Filling datetime element ${data.target} with value:`,
                data.value,
              );
              const inputElement = document.querySelector(
                data.target,
              ) as HTMLInputElement;
              if (inputElement) {
                try {
                  const proto = window.HTMLInputElement.prototype;
                  const nativeInputValueSetter =
                    Object.getOwnPropertyDescriptor(proto, "value")?.set;

                  if (nativeInputValueSetter) {
                    nativeInputValueSetter.call(inputElement, data.value);
                    inputElement.dispatchEvent(
                      new Event("input", { bubbles: true }),
                    );
                    inputElement.dispatchEvent(
                      new Event("change", { bubbles: true }),
                    );
                    inputElement.dispatchEvent(
                      new Event("blur", { bubbles: true }),
                    );

                    setTimeout(() => {
                      sendResponse(
                        "success",
                        `Filled datetime ${data.target}`,
                        window.location.href,
                      );
                    }, 50);
                  } else {
                    inputElement.value = data.value;
                    inputElement.dispatchEvent(
                      new Event("input", { bubbles: true }),
                    );
                    inputElement.dispatchEvent(
                      new Event("change", { bubbles: true }),
                    );
                    sendResponse(
                      "success",
                      `Filled datetime ${data.target} via fallback`,
                      window.location.href,
                    );
                  }
                } catch (e: any) {
                  sendResponse(
                    "error",
                    `Error filling datetime element: ${e.message}`,
                    window.location.href,
                  );
                }
              } else {
                sendResponse(
                  "error",
                  `Datetime element not found: ${data.target}`,
                  window.location.href,
                );
              }
            } else {
              sendResponse(
                "error",
                "Target or value missing for fill_datetime action",
                window.location.href,
              );
            }
            break;

          case "get_context":
            console.log("[WebSocketNavigator] Getting page context");
            sendResponse(
              "success",
              "Successfully retrieved page context",
              window.location.href,
              getCleanedHtml(),
            );
            break;

          default:
            console.log("[WebSocketNavigator] Unknown action:", data.action);
        }
      } catch (err) {
        console.error("[WebSocketNavigator] Error parsing message:", err);
      }
    };

    ws.onerror = (error) => {
      console.error("[WebSocketNavigator] WebSocket Error:", error);
      setIsActive(false);
    };

    ws.onclose = () => {
      console.log("[WebSocketNavigator] Disconnected");
    };

    return () => {
      ws.close();
    };
  }, [userId, isActive, tabId, navigate]);

  return null;
};
