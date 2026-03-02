import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import MessageBubble from "./MessageBubble";

export default function AgentChat() {
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!open || !conversation?.id) return;

    const unsubscribe = base44.agents.subscribeToConversation(
      conversation.id,
      (data) => {
        setMessages(data.messages || []);
      }
    );

    return unsubscribe;
  }, [open, conversation?.id]);

  const handleOpen = async () => {
    if (!open) {
      try {
        const conv = await base44.agents.createConversation({
          agent_name: "MarketAdvisor",
          metadata: { name: "Chat", description: "Consulta con MarketAdvisor" },
        });
        setConversation(conv);
        setMessages(conv.messages || []);
      } catch (err) {
        console.error("Error creating conversation:", err);
      }
    }
    setOpen(!open);
  };

  const handleSend = async () => {
    if (!input.trim() || !conversation || loading) return;

    const userMessage = input;
    setInput("");
    setLoading(true);

    try {
      await base44.agents.addMessage(conversation, {
        role: "user",
        content: userMessage,
      });
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[#00ff88] hover:bg-[#00cc6a] text-[#0a0e1a] flex items-center justify-center shadow-lg transition-all hover:scale-110"
      >
        <MessageCircle className="w-6 h-6" strokeWidth={2.5} />
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-40 w-96 h-96 rounded-2xl bg-[#0f1629] border border-[#1a2240] shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a2240]">
            <div>
              <h3 className="text-sm font-bold text-white">MarketAdvisor</h3>
              <p className="text-xs text-slate-500">Asesor de inversión IA</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center">
                <p className="text-xs text-slate-500">
                  Pregunta sobre decisiones de inversión, análisis de mercado o tu estrategia
                </p>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <MessageBubble key={idx} message={msg} />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          <div className="border-t border-[#1a2240] p-3 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder="Escribe tu pregunta..."
              className="flex-1 bg-[#1a2240] text-white text-sm rounded-lg px-3 py-2 outline-none focus:border focus:border-[#00ff88]"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="bg-[#00ff88] hover:bg-[#00cc6a] text-[#0a0e1a] rounded-lg p-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}