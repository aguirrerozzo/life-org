"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { CommentData } from "@/types";

interface TaskCommentsProps {
  taskId: string;
  comments: CommentData[];
  onCommentAdded: () => void;
}

export function TaskComments({ taskId, comments, onCommentAdded }: TaskCommentsProps) {
  const t = useTranslations("tasks");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    const res = await fetch(`/api/tasks/${taskId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim() }),
    });

    if (res.ok) {
      setText("");
      onCommentAdded();
    }
    setLoading(false);
  }

  const userComments = comments.filter(c => !c.isSystem);
  const systemLogs = comments.filter(c => c.isSystem);

  return (
    <div className="space-y-4">
      {/* Input Form */}
      <h4 className="font-medium text-sm px-2 pt-2">{t("comments")} ({userComments.length})</h4>

      <div className="px-2 pb-2">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("addComment")}
            rows={2}
            className="resize-none text-sm bg-background/50 border-border/80 focus-visible:ring-1"
          />
          <Button type="submit" size="icon" disabled={!text.trim() || loading} className="shrink-0 h-auto">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* User Comments Array */}
      {userComments.length > 0 && (
        <div className="space-y-4 px-2 pb-3 pt-2">
          {userComments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="h-7 w-7 shrink-0 border border-border/50">
                <AvatarImage src={comment.user?.image || undefined} />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {comment.user?.name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-[13px] font-semibold text-foreground/90">
                    {comment.user?.name || "User"}
                  </span>
                  <span className="text-[10px] text-muted-foreground/70 font-medium">
                    {new Date(comment.createdAt).toLocaleString(undefined, {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
                <div className="text-sm text-foreground/80 whitespace-pre-wrap bg-background/60 border border-border/50 rounded-xl rounded-tl-none px-3 py-2 shadow-sm inline-block w-full">
                  {comment.text}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* System History Logs */}
      {systemLogs.length > 0 && (
        <div className="border-t border-border/40 px-3 pt-2">
          <Accordion className="w-full">
            <AccordionItem value="history" className="border-b-0">
              <AccordionTrigger className="py-2 text-xs font-semibold text-muted-foreground hover:no-underline">
                Historial de Actividad ({systemLogs.length})
              </AccordionTrigger>
              <AccordionContent className="pb-3 pt-1 space-y-3">
                {systemLogs.map((log) => (
                  <div key={log.id} className="relative pl-4">
                    <div className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full bg-border/80" />
                    <div className="text-[11px] text-muted-foreground/70 font-medium mb-0.5">
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                    <div className="text-xs text-foreground/80 leading-relaxed italic">
                      {log.text}
                    </div>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}
    </div>
  );
}
