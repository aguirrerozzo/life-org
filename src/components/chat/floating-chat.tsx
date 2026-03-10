"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { MessageSquare, X, Send, Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslations } from "next-intl";

export function FloatingChat() {
    const [isOpen, setIsOpen] = useState(false);
    const t = useTranslations("tasks");
    const scrollRef = useRef<HTMLDivElement>(null);

    const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
        api: "/api/chat",
    });

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    return (
        <>
            {/* Floating Action Button */}
            <Button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl transition-transform duration-300 hover:scale-105 z-50 ${isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'}`}
            >
                <MessageSquare className="h-6 w-6" />
            </Button>

            {/* Chat Window */}
            <div
                className={`fixed bottom-6 right-6 w-[380px] h-[580px] bg-card border border-border/50 shadow-2xl rounded-2xl flex flex-col z-50 transition-all duration-300 origin-bottom-right ${isOpen ? 'scale-100 opacity-100' : 'scale-75 opacity-0 pointer-events-none'}`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/40 rounded-t-2xl">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary/10 p-1.5 rounded-lg">
                            <Bot className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-sm">Life-Org AI</h3>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                Online
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setIsOpen(false)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Message Area */}
                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-60">
                            <Bot className="h-12 w-12 text-muted-foreground" />
                            <p className="text-sm text-balance">
                                ¡Hola! Soy tu asistente de IA. Puedo leer, crear y administrar tus tareas. ¿En qué te ayudo hoy?
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4 pb-4">
                            {messages.map((m: any) => (
                                <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {m.role === 'assistant' && (
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                                            <Bot className="h-4 w-4 text-primary" />
                                        </div>
                                    )}

                                    <div className={`flex flex-col gap-1 max-w-[80%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                                        {m.content && (
                                            <div className={`px-3 py-2 rounded-2xl text-[13px] leading-relaxed ${m.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>
                                                {m.content}
                                            </div>
                                        )}

                                        {/* Render tool invocations gracefully */}
                                        {m.toolInvocations?.map((toolInvocation: any) => {
                                            const toolCallId = toolInvocation.toolCallId;
                                            if (!('result' in toolInvocation)) {
                                                return (
                                                    <div key={toolCallId} className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium bg-muted/30 px-2 py-1.5 rounded-md border border-border/50 animate-pulse">
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                        Consultando la base de datos... ({toolInvocation.toolName})
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div key={toolCallId} className="flex items-center gap-2 text-[10px] text-emerald-500 font-medium bg-emerald-500/10 px-2 py-1.5 rounded-md border border-emerald-500/20">
                                                    Base de datos actualizada ({toolInvocation.toolName})
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {m.role === 'user' && (
                                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-1">
                                            <User className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                {/* Input Area */}
                <div className="p-3 border-t border-border/50 bg-background/50 rounded-b-2xl">
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <Input
                            value={input}
                            onChange={handleInputChange}
                            disabled={isLoading}
                            placeholder="Ej: 'Muéstrame las tareas de hoy' o 'Crea una tarea para comprar leche'"
                            className="flex-1 rounded-full bg-muted/50 border-transparent focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:bg-background text-sm px-4"
                        />
                        <Button type="submit" size="icon" disabled={!input.trim() || isLoading} className="h-9 w-9 rounded-full shrink-0 shadow-sm transition-transform hover:scale-105 active:scale-95">
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </div>
        </>
    );
}
