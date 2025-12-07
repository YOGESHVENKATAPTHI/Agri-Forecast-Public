import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLand } from "@/contexts/LandContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useTranslation } from "@/lib/translations";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, Loader2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';
import type { ChatMessage } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";

// Component to handle the typing effect for the last message
const TypingMarkdown = ({ content, onComplete }: { content: string, onComplete?: () => void }) => {
  const [displayedContent, setDisplayedContent] = useState("");
  const indexRef = useRef(0);
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    // Reset if content changes drastically (though usually it's static for a finished response)
    // But here we assume content is the full response passed at once.
    
    const interval = setInterval(() => {
      if (indexRef.current < content.length) {
        // Add 2 characters at a time for speed
        setDisplayedContent((prev) => prev + content.slice(indexRef.current, indexRef.current + 2));
        indexRef.current += 2;
      } else {
        setDisplayedContent(content); // Ensure full content is shown
        setIsTyping(false);
        clearInterval(interval);
        onComplete?.();
      }
    }, 10); // 10ms per chunk

    return () => clearInterval(interval);
  }, [content, onComplete]);

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          h1: ({children}) => <h1 className="text-lg font-bold text-green-700 dark:text-green-400 mb-2">{children}</h1>,
          h2: ({children}) => <h2 className="text-base font-semibold text-green-600 dark:text-green-300 mb-2 mt-3">{children}</h2>,
          h3: ({children}) => <h3 className="text-sm font-medium text-green-500 dark:text-green-200 mb-1 mt-2">{children}</h3>,
          p: ({children}) => <p className="text-sm mb-2 leading-relaxed">{children}</p>,
          ul: ({children}) => <ul className="text-sm space-y-1 ml-4 list-disc">{children}</ul>,
          ol: ({children}) => <ol className="text-sm space-y-1 ml-4 list-decimal">{children}</ol>,
          li: ({children}) => <li className="text-sm">{children}</li>,
          table: ({children}) => (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full text-xs border-collapse border border-gray-300 dark:border-gray-600">
                {children}
              </table>
            </div>
          ),
          th: ({children}) => (
            <th className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-left text-xs font-medium border border-gray-300 dark:border-gray-600">
              {children}
            </th>
          ),
          td: ({children}) => (
            <td className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600">
              {children}
            </td>
          ),
          code: ({inline, className, children, ...props}) => {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <pre className="bg-gray-100 dark:bg-gray-800 rounded p-2 text-xs overflow-x-auto my-2">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-xs font-mono" {...props}>
                {children}
              </code>
            );
          },
          blockquote: ({children}) => (
            <blockquote className="border-l-4 border-green-500 pl-3 py-1 my-2 bg-green-50 dark:bg-green-900/20 text-sm italic">
              {children}
            </blockquote>
          ),
          strong: ({children}) => <strong className="font-semibold text-green-700 dark:text-green-300">{children}</strong>,
          em: ({children}) => <em className="italic text-green-600 dark:text-green-400">{children}</em>,
        }}
      >
        {displayedContent + (isTyping ? " ●" : "")}
      </ReactMarkdown>
    </div>
  );
};

// Static markdown renderer for older messages
const StaticMarkdown = ({ content }: { content: string }) => (
  <div className="prose prose-sm max-w-none dark:prose-invert">
    <ReactMarkdown
      remarkPlugins={[remarkMath, remarkGfm]}
      rehypePlugins={[rehypeKatex, rehypeHighlight]}
      components={{
        h1: ({children}) => <h1 className="text-lg font-bold text-green-700 dark:text-green-400 mb-2">{children}</h1>,
        h2: ({children}) => <h2 className="text-base font-semibold text-green-600 dark:text-green-300 mb-2 mt-3">{children}</h2>,
        h3: ({children}) => <h3 className="text-sm font-medium text-green-500 dark:text-green-200 mb-1 mt-2">{children}</h3>,
        p: ({children}) => <p className="text-sm mb-2 leading-relaxed">{children}</p>,
        ul: ({children}) => <ul className="text-sm space-y-1 ml-4 list-disc">{children}</ul>,
        ol: ({children}) => <ol className="text-sm space-y-1 ml-4 list-decimal">{children}</ol>,
        li: ({children}) => <li className="text-sm">{children}</li>,
        table: ({children}) => (
          <div className="overflow-x-auto my-2">
            <table className="min-w-full text-xs border-collapse border border-gray-300 dark:border-gray-600">
              {children}
            </table>
          </div>
        ),
        th: ({children}) => (
          <th className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-left text-xs font-medium border border-gray-300 dark:border-gray-600">
            {children}
          </th>
        ),
        td: ({children}) => (
          <td className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600">
            {children}
          </td>
        ),
        code: ({inline, className, children, ...props}) => {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <pre className="bg-gray-100 dark:bg-gray-800 rounded p-2 text-xs overflow-x-auto my-2">
              <code className={className} {...props}>
                {children}
              </code>
            </pre>
          ) : (
            <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-xs font-mono" {...props}>
              {children}
            </code>
          );
        },
        blockquote: ({children}) => (
          <blockquote className="border-l-4 border-green-500 pl-3 py-1 my-2 bg-green-50 dark:bg-green-900/20 text-sm italic">
            {children}
          </blockquote>
        ),
        strong: ({children}) => <strong className="font-semibold text-green-700 dark:text-green-300">{children}</strong>,
        em: ({children}) => <em className="italic text-green-600 dark:text-green-400">{children}</em>,
      }}
    >
      {content}
    </ReactMarkdown>
  </div>
);

export default function Chat() {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const { selectedLand } = useLand();
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [user, authLoading, toast]);

  const { data: messages, isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/history", selectedLand?.id],
    queryFn: async () => {
      if (!selectedLand) return [];
      const res = await apiRequest("GET", `/api/chat/history/${selectedLand.id}`);
      return await res.json();
    },
    enabled: !!user && !!selectedLand,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      if (!selectedLand) throw new Error("No land selected");
      return await apiRequest("POST", "/api/chat/send", { 
        message: messageText,
        landId: selectedLand.id 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/history", selectedLand?.id] });
      setMessage("");
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!message.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(message);
    // Clear message immediately for better UX
    setMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Scroll to bottom whenever messages change or when sending
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, messagesLoading, sendMessageMutation.isPending]);

  const quickActions = [
    "Rice cultivation plan",
    "Wheat fertilization",
    "Organic farming tips",
    "Irrigation methods",
    "Soil pH guide",
    "Weather forecast",
  ];

  if (authLoading || !user) {
    return <div className="p-4 md:p-8"><Skeleton className="h-96" /></div>;
  }

  // Combine real messages with pending message
  const displayMessages = [...(messages || [])];
  
  // If sending, add the pending user message and a thinking placeholder
  if (sendMessageMutation.isPending) {
    // Add pending user message if not already in the list (optimistic update logic simplified)
    // Note: Since we clear 'message' state on send, we need to track the sent message content differently 
    // or just rely on the mutation variable if available. 
    // For simplicity, we'll just show the thinking indicator.
    
    // Actually, let's use the mutation variables to show the user message too
    if (sendMessageMutation.variables) {
       displayMessages.push({
         id: "temp-user-msg",
         userId: user.id,
         role: "user",
         message: sendMessageMutation.variables,
         timestamp: new Date(),
       } as ChatMessage);
    }

    displayMessages.push({
      id: "temp-ai-thinking",
      userId: user.id,
      role: "assistant",
      message: "Thinking...", // This will be replaced by the typing indicator
      timestamp: new Date(),
      isThinking: true // Custom flag we'll use in rendering
    } as any);
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-gradient-to-b from-background to-background/80">
      <Card className="flex-1 flex flex-col m-4 md:m-6 border-none shadow-2xl bg-background/60 backdrop-blur-xl overflow-hidden rounded-3xl ring-1 ring-white/20 dark:ring-gray-800">
        
        {/* Chat Area */}
        <CardContent className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent">
          {messagesLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-3/4 rounded-2xl" />
              <Skeleton className="h-24 w-3/4 ml-auto rounded-2xl" />
              <Skeleton className="h-24 w-3/4 rounded-2xl" />
            </div>
          ) : displayMessages.length > 0 ? (
            <AnimatePresence initial={false}>
              {displayMessages.map((msg, index) => {
                const isLastMessage = index === displayMessages.length - 1;
                const isAssistant = msg.role === "assistant";
                const isThinking = (msg as any).isThinking;
                
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`
                        max-w-[85%] md:max-w-[75%] p-5 rounded-3xl shadow-sm
                        ${isAssistant 
                          ? "bg-white/80 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-tl-none" 
                          : "bg-gradient-to-br from-green-600 to-emerald-600 text-white rounded-tr-none shadow-lg shadow-green-500/20"
                        }
                      `}
                    >
                      {isAssistant ? (
                        isThinking ? (
                           <div className="flex items-center gap-2 text-muted-foreground">
                             <Loader2 className="h-4 w-4 animate-spin" />
                             <span className="text-sm font-medium animate-pulse">AI is analyzing farm data...</span>
                           </div>
                        ) : (
                          // Only type the last message if it's from assistant AND not a thinking placeholder
                          isLastMessage ? (
                            <TypingMarkdown 
                              content={msg.message} 
                              onComplete={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
                            />
                          ) : (
                            <StaticMarkdown content={msg.message} />
                          )
                        )
                      ) : (
                        <p className="text-base leading-relaxed whitespace-pre-wrap font-medium">{msg.message}</p>
                      )}
                      
                      {msg.timestamp && !isThinking && (
                        <p className={`text-[10px] mt-3 font-medium opacity-60 ${isAssistant ? "text-gray-400" : "text-green-100"}`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="max-w-lg space-y-8"
              >
                <div className="space-y-2">
                  <h3 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    Agri-Forecast AI
                  </h3>
                  <p className="text-muted-foreground text-lg">
                    {t("personal_agricultural_expert")}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {quickActions.map((action, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="h-auto py-3 px-4 text-sm font-medium text-left justify-start whitespace-normal hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-300 rounded-xl"
                      onClick={() => setMessage(action)}
                    >
                      {action}
                    </Button>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md border-t border-white/20 dark:border-gray-800">
          <div className="relative flex items-end gap-3 max-w-4xl mx-auto">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={t("ask_about_your_farm")}
              className="min-h-[60px] max-h-32 resize-none rounded-2xl border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all shadow-sm text-base py-4 px-5"
              disabled={sendMessageMutation.isPending}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || sendMessageMutation.isPending}
              size="icon"
              className={`
                h-[60px] w-[60px] rounded-2xl shrink-0 transition-all duration-300 shadow-lg
                ${!message.trim() || sendMessageMutation.isPending 
                  ? "bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600" 
                  : "bg-gradient-to-br from-green-600 to-emerald-600 text-white hover:scale-105 hover:shadow-green-500/30"
                }
              `}
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Send className="w-6 h-6 ml-0.5" />
              )}
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-3">
            AI can make mistakes. Please verify important agricultural decisions.
          </p>
        </div>
      </Card>
    </div>
  );
}
