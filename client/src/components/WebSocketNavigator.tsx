import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import useAuth from "@/features/auth/hooks/useAuth";
import { RadioTower, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";

interface WebSocketNavigatorProps {
  isActive: boolean;
  tabId: string;
}

export const WebSocketNavigator = ({
  isActive,
  tabId,
}: WebSocketNavigatorProps) => {
  const { session, roles } = useAuth();
  const navigate = useNavigate();
  const [, setIsActive] = useState(false);

  const userId = session?.user?.user_metadata?.["user_id"]?.toString();

  useEffect(() => {
    if (!userId || !isActive) return;

    console.log(
      `[WebSocketNavigator] Connecting... UserID: ${userId}, TabID: ${tabId}`,
    );

    const ws = new WebSocket(`ws://localhost:8080/ws/${userId}/${tabId}`);

    ws.onopen = () => {
      console.log(`[WebSocketNavigator] Connected! TabID is: ${tabId}`);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("[WebSocketNavigator] Received action:", data);

        // const getPageContextIds = () => {
        //   const elements = document.querySelectorAll(
        //     "button[id], a[id], input[id], form[id], textarea[id], select[id]",
        //   );
        //   return Array.from(elements).map((el) => el.id);
        // };

        const getCleanedHtml = () => {
          const clone = document.body.cloneNode(true) as HTMLElement;

          // Remove elements that should be excluded from agent context
          const elementsToRemove = clone.querySelectorAll(
            "script, style, svg, noscript, iframe, [data-agent-ignore='true']",
          );
          elementsToRemove.forEach((el) => el.remove());

          const allElements = clone.querySelectorAll("*");
          allElements.forEach((el) => {
            el.removeAttribute("class");
            el.removeAttribute("style");
          });

          return clone.outerHTML;
        };

        const sendResponse = (
          status: "success" | "error",
          message: string,
          url: string,
          html?: string,
          userRoles?: string[],
        ) => {
          if (data.action_id && ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                action_id: data.action_id,
                status,
                message,
                url,
                // available_ids: getPageContextIds(),
                html: html,
                user_roles: userRoles,
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
              roles,
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
