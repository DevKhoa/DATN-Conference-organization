import React, { useState, useEffect, useRef } from "react";
import { Send, Bot, User, Loader2, Sparkles, AlertCircle } from "lucide-react";
import Button from "../components/ui/Button";
import {
  createScriptSession,
  sendScriptMessage,
  deleteScriptSession,
} from "../lib/ai-agent";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

const AiAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "intro",
      role: "assistant",
      content:
        "Hello! I'm your conference AI assistant. I can help you find information about papers, sessions, and schedules from our database. How can I assist you today?",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [userId, setUserId] = useState("");
  const [sessionError, setSessionError] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Session on Mount
  useEffect(() => {
    const initSession = async () => {
      // 1. Generate new IDs for this interaction
      const newSessionId = crypto.randomUUID();
      const newUserId = "guest_user_" + Math.floor(Math.random() * 10000);

      setSessionId(newSessionId);
      setUserId(newUserId);

      // 2. Request backend to create session
      const success = await createScriptSession(newUserId, newSessionId);

      if (success) {
        setIsSessionReady(true);
      } else {
        setSessionError(true);
      }
    };

    initSession();

    // Cleanup session on unmount
    return () => {
      // Note: We use the state values here, but inside a closure in useEffect return
      // we need to ensure we have the IDs. Since this cleanup runs on unmount,
      // we might need refs if strict mode renders twice, but for standard flow:
      if (sessionId && userId) {
        // Best effort cleanup
        // deleteScriptSession(userId, sessionId);
      }
    };
  }, []); // Empty dependency array ensures this runs once per mount (navigation)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (
      !inputValue.trim() ||
      !isSessionReady ||
      isTyping ||
      !sessionId ||
      !userId
    )
      return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: inputValue,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    // Create a placeholder for the assistant response
    const assistantMsgId = crypto.randomUUID();
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      isStreaming: true,
    };
    setMessages((prev) => [...prev, assistantMsg]);

    await sendScriptMessage(userMsg.content, userId, sessionId, (update) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === assistantMsgId) {
            if (update.type === "text" && update.data) {
              return { ...msg, content: msg.content + update.data };
            }
          }
          return msg;
        }),
      );
    });

    // Mark streaming as done
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === assistantMsgId) {
          return { ...msg, isStreaming: false };
        }
        return msg;
      }),
    );
    setIsTyping(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3 shadow-sm z-10">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Sparkles className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">AI Assistant</h1>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${isSessionReady ? "bg-green-500" : sessionError ? "bg-red-500" : "bg-yellow-500 animate-pulse"}`}
            ></span>
            <span className="text-xs text-slate-500">
              {isSessionReady
                ? "Online"
                : sessionError
                  ? "Connection Failed"
                  : "Connecting..."}
            </span>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-grow overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === "user"
                  ? "bg-brand-600 text-white"
                  : "bg-white border border-slate-200 text-indigo-600 shadow-sm"
              }`}
            >
              {msg.role === "user" ? (
                <User className="w-5 h-5" />
              ) : (
                <Bot className="w-5 h-5" />
              )}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[80%] rounded-2xl px-5 py-3.5 shadow-sm text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-brand-600 text-white rounded-tr-none"
                  : "bg-white border border-slate-200 text-slate-700 rounded-tl-none"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.isStreaming && (
                <span className="inline-block w-1.5 h-4 bg-indigo-400 ml-1 animate-pulse align-middle"></span>
              )}
            </div>
          </div>
        ))}

        {isTyping && messages[messages.length - 1].role === "user" && (
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 text-indigo-600 shadow-sm flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
            <div className="text-xs text-slate-400 mt-2">Thinking...</div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-slate-200 p-4 sm:p-6">
        <form
          onSubmit={handleSendMessage}
          className="max-w-4xl mx-auto relative flex items-center gap-3"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={
              isSessionReady
                ? "Ask about conferences, papers, or schedules..."
                : "Connecting to agent..."
            }
            className="flex-grow bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 block w-full p-4 outline-none disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-inner"
            disabled={!isSessionReady || isTyping}
          />
          <Button
            type="submit"
            disabled={!inputValue.trim() || !isSessionReady || isTyping}
            className={`h-[54px] px-6 rounded-xl transition-all ${
              !inputValue.trim() || !isSessionReady || isTyping
                ? "bg-slate-100 text-slate-400 border-slate-200"
                : "bg-brand-600 text-white hover:bg-brand-700 shadow-md hover:shadow-lg"
            }`}
          >
            {isTyping ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </form>
        {sessionError && (
          <div className="text-center mt-2 text-xs text-red-500 flex items-center justify-center gap-1">
            <AlertCircle className="w-3 h-3" /> Failed to connect to AI service.
            Please refresh the page.
          </div>
        )}
      </div>
    </div>
  );
};

export default AiAssistant;
