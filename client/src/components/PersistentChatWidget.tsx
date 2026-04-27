import React, { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  MessageCircle,
  X,
  ChevronLeft,
  Bot,
  User,
  Send,
  Loader2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import useAuth from "@/features/auth/hooks/useAuth";
import { chatApi, Conversation, Message } from "@/features/chat/api/chat.api";
import { useMyCurrentSubscriptionQuery } from "@/features/subscriptions/services/queries";
import { isSubscriptionUsable } from "@/features/subscriptions/utils";
import remarkGfm from "remark-gfm";
import { WebSocketNavigator } from "./WebSocketNavigator";

interface ToolCall {
  name: string;
  args: any;
  result?: any;
}

interface ChatMessage {
  id: string; // frontend generated or from db
  role: "user" | "model";
  content: string;
  isStreaming?: boolean;
  toolCalls?: ToolCall[];
}

export const PersistentChatWidget: React.FC = () => {
  const { session } = useAuth();
  const { data: currentSubscription } = useMyCurrentSubscriptionQuery();

  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<"list" | "chat">("list");

  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [activeTitle, setActiveTitle] = useState<string>("New Conversation");
  const [parentId, setParentId] = useState<number | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 10;

  const userId = session?.user?.user_metadata["user_id"].toString();

  // Generate a unique tabId for the current session/tab
  const tabId = useMemo(() => Math.random().toString(36).substring(2, 8), []);

  // Queries
  const { data: conversations, refetch: refetchConversations } = useQuery({
    queryKey: ["conversations", userId],
    queryFn: () => chatApi.getConversations(userId),
    enabled: isOpen && view === "list",
  });

  const { data: historyMessages, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["messages", userId, activeConvId, offset],
    queryFn: async () => {
      if (!activeConvId) return [];
      return chatApi.getMessages(userId, activeConvId, LIMIT, offset);
    },
    enabled: isOpen && view === "chat" && activeConvId !== null,
  });

  // Handle history loading
  useEffect(() => {
    if (historyMessages && historyMessages.length > 0) {
      // Map db messages to ChatMessage
      const mapped: ChatMessage[] = historyMessages.map((m) => ({
        id: m.message_id.toString(),
        role: m.role,
        content: m.content,
      }));
      // Server returns desc order, so reverse to display chronologically
      mapped.reverse();

      if (offset === 0) {
        setChatMessages(mapped);
        if (historyMessages.length > 0) {
          // Set parent_id to the most recent message's ID (which was at index 0 before reverse)
          setParentId(historyMessages[0].message_id);
        }
      } else {
        // Prepend older messages
        setChatMessages((prev) => [...mapped, ...prev]);
      }

      if (historyMessages.length < LIMIT) {
        setHasMore(false);
      }
    } else if (historyMessages && historyMessages.length === 0) {
      setHasMore(false);
    }
  }, [historyMessages, offset]);

  // Scroll to bottom on new message if offset 0
  useEffect(() => {
    if (offset === 0 && chatMessages.length > 0 && !isLoadingHistory) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [chatMessages, isLoadingHistory, offset]);

  const handleScroll = () => {
    if (chatContainerRef.current) {
      if (
        chatContainerRef.current.scrollTop === 0 &&
        hasMore &&
        !isLoadingHistory
      ) {
        setOffset((prev) => prev + LIMIT);
      }
    }
  };

  const handleOpenConversation = (conv: Conversation) => {
    setActiveConvId(conv.conv_id);
    setActiveTitle(conv.title);
    setParentId(null);
    setChatMessages([]);
    setOffset(0);
    setHasMore(true);
    setView("chat");
  };

  const handleNewChat = () => {
    setActiveConvId(null);
    setActiveTitle("New Conversation");
    setParentId(null);
    setChatMessages([]);
    setOffset(0);
    setHasMore(false);
    setView("chat");
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: "temp-" + Date.now().toString(),
      role: "user",
      content: inputValue,
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    const assistantMsgId = "temp-assist-" + Date.now().toString();
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: "model", // using 'model' to match db
      content: "",
      isStreaming: true,
    };
    setChatMessages((prev) => [...prev, assistantMsg]);

    try {
      const url = `${import.meta.env.VITE_API_BASE_URL}/${userId}/send-message-stream`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          content: userMsg.content,
          parent_id: parentId,
          tab_id: tabId, // Send tabId to backend to trigger websocket navigation
        }),
      });

      if (!response.ok) throw new Error("Failed to connect");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const rawData = line.slice(6).trim();
            if (!rawData) continue;

            try {
              const data = JSON.parse(rawData);

              if (data.parts && data.parts.type === "text") {
                setChatMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMsgId
                      ? { ...msg, content: msg.content + data.parts.content }
                      : msg,
                  ),
                );
              } else if (data.parts && data.parts.type === "tool_call") {
                const fc = data.parts.content;
                setChatMessages((prev) =>
                  prev.map((msg) => {
                    if (msg.id === assistantMsgId) {
                      const toolC = msg.toolCalls || [];
                      const funcName = fc.function_name || fc.name;
                      return {
                        ...msg,
                        toolCalls: [
                          ...toolC,
                          { name: funcName, args: fc.args },
                        ],
                      };
                    }
                    return msg;
                  }),
                );
              } else if (data.parts && data.parts.type === "tool_result") {
                const fr = data.parts.content;
                setChatMessages((prev) =>
                  prev.map((msg) => {
                    if (msg.id === assistantMsgId) {
                      const toolC = [...(msg.toolCalls || [])];
                      if (toolC.length > 0) {
                        toolC[toolC.length - 1].result = fr.output || "Success";
                      }
                      return { ...msg, toolCalls: toolC };
                    }
                    return msg;
                  }),
                );
              } else if (data.status?.is_finish) {
                // stream finished
                if (data.metadata?.title && !activeConvId) {
                  setActiveTitle(data.metadata.title);
                }
                if (data.metadata?.message_id) {
                  setParentId(data.metadata.message_id);
                }
                if (data.metadata?.conv_id && !activeConvId) {
                  setActiveConvId(data.metadata.conv_id);
                }
              }
            } catch (e) {
              console.warn("Error parsing chunk", e);
            }
          }
        }
      }
    } catch (err) {
      setChatMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? { ...msg, content: msg.content + "\n[ERROR: Failed to reach AI]" }
            : msg,
        ),
      );
    } finally {
      setIsTyping(false);
      setChatMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId ? { ...msg, isStreaming: false } : msg,
        ),
      );
      refetchConversations();
    }
  };

  // Only show if logged in
  if (!session?.user) return null;

  const hasValidSubscription = isSubscriptionUsable(
    currentSubscription?.status,
    currentSubscription?.expires_at,
  );

  if (!hasValidSubscription) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Headless WebSocket Navigator, active only when chat view is open */}
      <WebSocketNavigator isActive={isOpen && view === "chat"} tabId={tabId} />

      {/* Floating Action Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 flex flex-col items-center justify-center p-0"
        >
          <MessageCircle className="w-6 h-6 text-primary-foreground" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-[350px] sm:w-[400px] h-[500px] sm:h-[600px] bg-background border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-primary px-4 py-3 flex items-center justify-between text-primary-foreground">
            <div className="flex items-center gap-2">
              {view === "chat" && (
                <button
                  onClick={() => setView("list")}
                  className="hover:bg-primary-foreground/20 rounded p-1"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <h3 className="font-semibold">
                {view === "list" ? "AI Conversations" : activeTitle}
              </h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-primary-foreground/20 rounded p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden relative flex flex-col">
            {view === "list" ? (
              <div className="p-4 flex-1 overflow-y-auto">
                <Button
                  onClick={handleNewChat}
                  className="w-full mb-4 bg-primary/10 text-primary hover:bg-primary/20"
                  variant="secondary"
                >
                  + New Conversation
                </Button>
                {conversations?.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm mt-4">
                    No past conversations.
                  </p>
                )}
                <div className="space-y-2">
                  {conversations?.map((conv) => (
                    <div
                      key={conv.conv_id}
                      onClick={() => handleOpenConversation(conv)}
                      className="p-3 border border-border rounded-lg cursor-pointer hover:bg-muted transition-colors"
                    >
                      <h4 className="font-medium text-sm truncate">
                        {conv.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(conv.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Chat View
              <div className="flex-1 flex flex-col h-full bg-card">
                <div
                  ref={chatContainerRef}
                  onScroll={handleScroll}
                  className="flex-1 overflow-y-auto p-4 space-y-4"
                >
                  {isLoadingHistory && offset === 0 && (
                    <div className="flex justify-center p-4">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {hasMore && chatMessages.length > 0 && !isLoadingHistory && (
                    <div className="text-center text-xs text-muted-foreground mb-4">
                      Scroll up to load more
                    </div>
                  )}

                  {chatMessages.length === 0 &&
                    activeConvId === null &&
                    !isTyping && (
                      <div className="text-center text-muted-foreground text-sm flex flex-col items-center justify-center h-full gap-2">
                        <Bot className="w-8 h-8 text-primary opacity-50" />
                        <p>Start a new conversation</p>
                      </div>
                    )}

                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex shrink-0 items-center justify-center ${msg.role === "user" ? "bg-primary" : "bg-secondary"}`}
                      >
                        {msg.role === "user" ? (
                          <User className="w-3 h-3 text-primary-foreground" />
                        ) : (
                          <Bot className="w-3 h-3 text-foreground" />
                        )}
                      </div>
                      <div
                        className={`px-3 py-2 rounded-2xl max-w-[85%] text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted text-foreground rounded-bl-none w-full overflow-hidden"}`}
                      >
                        {msg.toolCalls?.map((tc, idx) => (
                          <details
                            key={idx}
                            className="group bg-background/60 rounded-md mb-2 text-xs border border-border/50 overflow-hidden"
                          >
                            <summary className="flex items-center gap-2 p-2 text-muted-foreground cursor-pointer hover:bg-muted/50 list-none [&::-webkit-details-marker]:hidden">
                              {!tc.result && msg.isStreaming ? (
                                <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                              ) : (
                                <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                              )}
                              <span className="font-mono flex-1 truncate">
                                used {tc.name}
                              </span>
                              <ChevronLeft className="w-3 h-3 transition-transform group-open:-rotate-90 opacity-50 shrink-0" />
                            </summary>
                            <div className="p-3 pt-0 border-t border-border/50 bg-background/40">
                              <div className="mt-2">
                                <strong className="text-foreground/80 font-semibold mb-1 block">
                                  Arguments:
                                </strong>
                                <pre className="bg-background border border-border/50 rounded p-2 overflow-x-auto">
                                  <code>
                                    {typeof tc.args === "string"
                                      ? tc.args
                                      : JSON.stringify(tc.args, null, 2)}
                                  </code>
                                </pre>
                              </div>
                              {tc.result && (
                                <div className="mt-2">
                                  <strong className="text-foreground/80 font-semibold mb-1 block">
                                    Result:
                                  </strong>
                                  <pre className="bg-background border border-border/50 rounded p-2 overflow-x-auto max-h-40">
                                    <code>
                                      {typeof tc.result === "string"
                                        ? tc.result
                                        : JSON.stringify(tc.result, null, 2)}
                                    </code>
                                  </pre>
                                </div>
                              )}
                            </div>
                          </details>
                        ))}

                        {msg.content && (
                          <div className="m-0 p-0 prose prose-sm dark:prose-invert max-w-none break-words leading-relaxed">
                            <ReactMarkdown
                              components={{
                                p: ({ node, ...props }) => (
                                  <p
                                    className="mb-2 last:mb-0 whitespace-pre-wrap"
                                    {...props}
                                  />
                                ),
                                a: ({ node, ...props }) => (
                                  <a
                                    className="underline font-semibold text-primary transition-colors hover:text-primary/80"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    {...props}
                                  />
                                ),
                                ul: ({ node, ...props }) => (
                                  <ul
                                    className="list-disc ml-4 mb-2 marker:text-primary"
                                    {...props}
                                  />
                                ),
                                ol: ({ node, ...props }) => (
                                  <ol
                                    className="list-decimal ml-4 mb-2 marker:text-primary font-medium"
                                    {...props}
                                  />
                                ),
                                li: ({ node, ...props }) => (
                                  <li className="mb-1" {...props} />
                                ),
                                strong: ({ node, ...props }) => (
                                  <strong
                                    className="font-semibold text-primary"
                                    {...props}
                                  />
                                ),
                                table: ({ node, ...props }) => (
                                  <div className="overflow-x-auto my-3 rounded-md border border-border/50 bg-background/50">
                                    <table
                                      className="w-full text-left border-collapse text-sm"
                                      {...props}
                                    />
                                  </div>
                                ),
                                thead: ({ node, ...props }) => (
                                  <thead
                                    className="bg-muted/50 text-foreground font-semibold"
                                    {...props}
                                  />
                                ),
                                tbody: ({ node, ...props }) => (
                                  <tbody
                                    className="divide-y divide-border/50"
                                    {...props}
                                  />
                                ),
                                tr: ({ node, ...props }) => (
                                  <tr
                                    className="hover:bg-muted/30 transition-colors"
                                    {...props}
                                  />
                                ),
                                th: ({ node, ...props }) => (
                                  <th
                                    className="px-3 py-2 border-b border-border/50 whitespace-nowrap"
                                    {...props}
                                  />
                                ),
                                td: ({ node, ...props }) => (
                                  <td
                                    className="px-3 py-2 whitespace-nowrap"
                                    {...props}
                                  />
                                ),
                                // ----------------------------------
                                code: ({
                                  node,
                                  className,
                                  children,
                                  ...props
                                }: any) => {
                                  const match = /language-(\w+)/.exec(
                                    className || "",
                                  );
                                  return match ? (
                                    <pre className="bg-background border border-border rounded p-3 overflow-x-auto text-xs my-3 shadow-inner">
                                      <code className={className} {...props}>
                                        {children}
                                      </code>
                                    </pre>
                                  ) : (
                                    <code
                                      className="bg-background border border-border/50 rounded px-1.5 py-0.5 text-[0.7rem] text-primary font-mono shadow-sm"
                                      {...props}
                                    >
                                      {children}
                                    </code>
                                  );
                                },
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        )}
                        {!msg.content &&
                          msg.isStreaming &&
                          (!msg.toolCalls || msg.toolCalls.length === 0) && (
                            <span className="text-muted-foreground opacity-70 italic text-xs">
                              Thinking...
                            </span>
                          )}
                        {msg.isStreaming && (
                          <span className="inline-block w-1.5 h-3.5 bg-foreground/50 ml-1 animate-pulse align-middle" />
                        )}
                      </div>
                    </div>
                  ))}
                  {isTyping &&
                    chatMessages[chatMessages.length - 1]?.role !== "model" && (
                      <div className="flex items-end gap-2">
                        <div className="w-6 h-6 rounded-full flex shrink-0 items-center justify-center bg-secondary">
                          <Bot className="w-3 h-3 text-foreground" />
                        </div>
                        <div className="px-3 py-2 rounded-2xl bg-muted rounded-bl-none flex items-center justify-center h-9 w-12">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                      </div>
                    )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input block */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 border-t border-border bg-background"
                >
                  <div className="flex items-center gap-2 relative">
                    <input
                      type="text"
                      className="flex-1 bg-muted border-none rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                      placeholder="Ask me anything..."
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      disabled={isTyping}
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={isTyping || !inputValue.trim()}
                      className="rounded-full shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
