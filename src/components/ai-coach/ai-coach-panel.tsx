"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Sparkles, RefreshCw, Send, Trash2 } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AICoachPanelProps {
  apiKey: string;
  onApiKeyMissing: () => void;
  weightCount: number;
  workoutCount: number;
}

const STORAGE_KEY = "wt-chat-history";
const MAX_MESSAGES = 50;

const PRESET_QUESTIONS = [
  { text: "Why is my weight fluctuating?", short: "Fluctuations" },
  { text: "How can I break through a plateau?", short: "Plateau" },
  { text: "Am I on track to reach my goal?", short: "Progress" },
  { text: "What should I focus on this week?", short: "This Week" },
  { text: "Analyze my recent activity patterns", short: "Activity" },
  { text: "Give me motivation tips", short: "Motivation" },
];

export function AICoachPanel({ apiKey, onApiKeyMissing, weightCount, workoutCount }: AICoachPanelProps) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load chat history
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setChatMessages(parsed.slice(-MAX_MESSAGES));
      } catch {
        // Invalid data, ignore
      }
    }
  }, []);

  // Save chat history
  useEffect(() => {
    if (chatMessages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chatMessages.slice(-MAX_MESSAGES)));
    }
  }, [chatMessages]);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const clearChat = () => {
    setChatMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const askCoach = async (question?: string) => {
    if (!apiKey) {
      onApiKeyMissing();
      return;
    }

    const userMessage = question || chatInput.trim();
    if (!userMessage && chatMessages.length === 0) {
      // Initial request
      setLoading(true);
      try {
        const response = await fetch("/api/coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey }),
        });
        const data = await response.json();
        if (data.error) {
          setChatMessages([{ role: "assistant", content: `Error: ${data.error}` }]);
        } else {
          setChatMessages([{ role: "assistant", content: data.message }]);
        }
      } catch {
        setChatMessages([{ role: "assistant", content: "Failed to get coaching advice. Please try again." }]);
      }
      setLoading(false);
      return;
    }

    if (!userMessage) return;

    const newMessages: ChatMessage[] = [...chatMessages, { role: "user", content: userMessage }];
    setChatMessages(newMessages);
    setChatInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          question: userMessage,
          conversationHistory: newMessages,
        }),
      });
      const data = await response.json();
      if (data.error) {
        setChatMessages([...newMessages, { role: "assistant", content: `Error: ${data.error}` }]);
      } else {
        setChatMessages([...newMessages, { role: "assistant", content: data.message }]);
      }
    } catch {
      setChatMessages([...newMessages, { role: "assistant", content: "Failed to get response. Please try again." }]);
    }
    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      askCoach(chatInput.trim());
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Coach
              <Sparkles className="h-4 w-4 text-xp-gold" />
            </CardTitle>
            <CardDescription>
              Personalized advice powered by Claude
            </CardDescription>
          </div>
          {chatMessages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearChat}>
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {chatMessages.length > 0 ? (
          <div className="space-y-4">
            {/* Chat Messages */}
            <div className="max-h-96 overflow-y-auto space-y-4 p-4 bg-muted/50 rounded-lg">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-3 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background border"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        {msg.content.split("\n").map((p, j) => (
                          <p key={j} className="mb-2 last:mb-0">{p}</p>
                        ))}
                      </div>
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-background border rounded-lg p-3">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Preset Questions */}
            <div className="flex flex-wrap gap-2">
              {PRESET_QUESTIONS.slice(0, 4).map((q, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => askCoach(q.text)}
                  disabled={loading}
                  className="text-xs"
                >
                  {q.short}
                </Button>
              ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about your weight, activity, tips..."
                disabled={loading}
                className="flex-1"
              />
              <Button type="submit" disabled={loading || !chatInput.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">
              Get personalized coaching based on your {weightCount} weight entries
              {workoutCount > 0 && ` and ${workoutCount} workouts`}
            </p>

            {/* Preset Questions Grid */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {PRESET_QUESTIONS.map((q, i) => (
                <Button
                  key={i}
                  variant="outline"
                  onClick={() => askCoach(q.text)}
                  disabled={loading}
                  className="text-sm"
                >
                  {q.short}
                </Button>
              ))}
            </div>

            <Button onClick={() => askCoach()} disabled={loading} size="lg">
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Start Chat with AI Coach
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
