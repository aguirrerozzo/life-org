"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Plus, Repeat, Calendar, FolderOpen, AlertTriangle, CircleDot, Tag, MessageSquare, Trash2, Edit2, X, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { TASK_PRIORITIES, PRIORITY_COLORS } from "@/types";
import type { TaskWithRelations, StatusData, TagData } from "@/types";
import { TagSelector } from "@/components/tags/tag-selector";
import { TaskComments } from "./task-comments";

interface TaskDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: "create" | "view";
    task?: TaskWithRelations | null;
    statuses: StatusData[];
    onSaved: () => void;
    onDeleted?: () => void;
}

export function TaskDialog({ open, onOpenChange, mode, task, statuses, onSaved, onDeleted }: TaskDialogProps) {
    const t = useTranslations("tasks");
    const tPriority = useTranslations("priority");
    const tCommon = useTranslations("common");
    const locale = useLocale();

    // Internal visual state
    const [isEditing, setIsEditing] = useState(mode === "create");
    const [loading, setLoading] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    // Field states for editing/creation
    const [title, setTitle] = useState(task?.title || "");
    const [description, setDescription] = useState(task?.description || "");
    const [statusId, setStatusId] = useState(task?.statusId || statuses[0]?.id || "");
    const [priority, setPriority] = useState(task?.priority || "MEDIUM");
    const [dueDate, setDueDate] = useState<string>(
        task?.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : ""
    );
    const [selectedTags, setSelectedTags] = useState<TagData[]>(task?.taskTags?.map(tt => tt.tag) || []);

    // Recurrence Set
    const [isRecurring, setIsRecurring] = useState(task?.isRecurring || false);

    // Payment Set
    const [isPayment, setIsPayment] = useState(task?.isPayment || false);
    const [paymentValue, setPaymentValue] = useState<string>(
        task?.paymentValue !== undefined && task?.paymentValue !== null ? task.paymentValue.toString() : ""
    );
    const [recurrenceType, setRecurrenceType] = useState<"DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY">(
        task?.recurrenceType || "MONTHLY"
    );
    const [recurrenceDaysOfWeek, setRecurrenceDaysOfWeek] = useState<number[]>(task?.recurrenceDaysOfWeek || []);
    const [recurrenceDay, setRecurrenceDay] = useState<number>(task?.recurrenceDay || 1);
    const [recurrenceMonth, setRecurrenceMonth] = useState<number>(task?.recurrenceMonth || 1);

    // Reason Prompt
    const [reasonText, setReasonText] = useState("");

    // Use refs to avoid continuous re-syncs if background polling updates the task object reference
    const prevOpenRef = useRef<boolean>(false);
    const prevTaskIdRef = useRef<string | undefined>(undefined);

    // Sync state when task/mode changes (for when dialog opens)
    useEffect(() => {
        if (open && (!prevOpenRef.current || task?.id !== prevTaskIdRef.current)) {
            setIsEditing(mode === "create");
            setTitle(task?.title || "");
            setDescription(task?.description || "");
            setStatusId(task?.statusId || statuses[0]?.id || "");
            setPriority(task?.priority || "MEDIUM");
            setDueDate(task?.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "");
            setSelectedTags(task?.taskTags?.map(tt => tt.tag) || []);

            setIsPayment(task?.isPayment || false);
            setPaymentValue(task?.paymentValue !== undefined && task?.paymentValue !== null ? task.paymentValue.toString() : "");

            setIsRecurring(task?.isRecurring || false);
            setRecurrenceType(task?.recurrenceType || "MONTHLY");
            setRecurrenceDaysOfWeek(task?.recurrenceDaysOfWeek || []);
            setRecurrenceDay(task?.recurrenceDay || 1);
            setRecurrenceMonth(task?.recurrenceMonth || 1);
        }

        prevOpenRef.current = open;
        prevTaskIdRef.current = task?.id;
    }, [open, mode, task, statuses]);

    const activeStatus = statuses.find(s => s.id === statusId) || statuses[0];
    const targetStatusRequiresReason = !!(activeStatus?.requiresReason && statusId !== task?.statusId);

    async function handleSave() {
        if (!title.trim()) return;
        if (targetStatusRequiresReason && !reasonText.trim()) return;

        setLoading(true);
        const payload = {
            title,
            description: description || null,
            statusId,
            priority,
            dueDate: dueDate || null,
            tagIds: selectedTags.map(t => t.id),
            isPayment,
            paymentValue: isPayment && paymentValue.trim() !== "" ? parseFloat(paymentValue) : null,
            isRecurring,
            recurrenceType: isRecurring ? recurrenceType : null,
            recurrenceDaysOfWeek: isRecurring && (recurrenceType === "DAILY" || recurrenceType === "WEEKLY") ? recurrenceDaysOfWeek : [],
            recurrenceDay: isRecurring && (recurrenceType === "MONTHLY" || recurrenceType === "YEARLY") ? recurrenceDay : null,
            recurrenceMonth: isRecurring && recurrenceType === "YEARLY" ? recurrenceMonth : null,
        };

        const url = mode === "create" ? "/api/tasks" : `/api/tasks/${task?.id}`;
        const method = mode === "create" ? "POST" : "PATCH";

        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        setLoading(false);
        if (res.ok) {
            // Post reason as comment if applicable
            if (targetStatusRequiresReason && reasonText.trim() && task?.id) {
                await fetch(`/api/tasks/${task.id}/comments`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: reasonText.trim() }),
                });
                setReasonText("");
            }

            onSaved();
            if (mode === "create") {
                onOpenChange(false);
            } else {
                setIsEditing(false); // Drop back down into View Mode
            }
        }
    }

    async function handleDelete() {
        if (!task?.id) return;
        setLoading(true);
        const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
        setLoading(false);
        if (res.ok) {
            setDeleteOpen(false);
            onOpenChange(false);
            onDeleted?.();
        }
    }

    const isOverdue = task?.dueDate && new Date(task.dueDate) < new Date() && task.statusId !== statuses[statuses.length - 1]?.id;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-2xl w-full p-0 flex flex-col max-h-[90vh] overflow-hidden">
                    {/* Header Row */}
                    <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-border/50 bg-muted/20">
                        <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                            {mode === "create" ? (
                                <>
                                    <Plus className="h-5 w-5 text-primary" />
                                    {t("newTask")}
                                </>
                            ) : (
                                <>
                                    {isEditing ? (
                                        <span className="flex items-center gap-1.5"><Edit2 className="h-4 w-4 text-primary" /> Editar Tarea</span>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <Badge className="text-xs px-2 py-0 border-0 flex items-center gap-1 h-5" style={{ backgroundColor: `${activeStatus?.color}20`, color: activeStatus?.color }}>
                                                <CircleDot className="h-2.5 w-2.5" />
                                                {locale === "es" ? activeStatus?.nameEs : activeStatus?.nameEn}
                                            </Badge>
                                            <Badge className={`text-xs px-2 py-0 border-0 h-5 ${PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS]}`}>
                                                {tPriority(priority)}
                                            </Badge>
                                            {isOverdue && (
                                                <Badge variant="outline" className="text-xs px-2 py-0 h-5 gap-1 text-destructive border-destructive/30">
                                                    <AlertTriangle className="h-2.5 w-2.5" />
                                                    {t("overdue")}
                                                </Badge>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </DialogTitle>

                        <div className="flex items-center gap-2 mr-6">
                            {mode === "view" && !isEditing && (
                                <>
                                    <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => setIsEditing(true)}>
                                        <Edit2 className="h-3.5 w-3.5" />
                                        {locale === "es" ? "Editar" : "Edit"}
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteOpen(true)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Form Body - Scrollable */}
                    <div className="px-6 py-4 overflow-y-auto flex-1 outline-none">
                        <div className="space-y-6">

                            {/* Title */}
                            <div className="space-y-1.5">
                                {isEditing ? (
                                    <>
                                        <Label htmlFor="title" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("taskTitle")}</Label>
                                        <Input id="title" autoFocus={mode === "create"} value={title} onChange={(e) => setTitle(e.target.value)} className="text-base font-medium h-10 border-border/80 focus-visible:ring-1" placeholder="Nueva tarea..." />
                                    </>
                                ) : (
                                    <h2 className="text-2xl font-bold tracking-tight text-foreground pr-4 py-1">{title}</h2>
                                )}
                            </div>

                            {/* Two Column Layout for Properties */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">

                                {/* Meta Properties */}
                                <div className="space-y-5">

                                    {isEditing && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><CircleDot className="h-3 w-3" /> {t("status")}</Label>
                                                <Select value={statusId} onValueChange={(val) => setStatusId(val || "")}>
                                                    <SelectTrigger className="w-full h-9 text-xs border-border/80">
                                                        <span className="truncate">{locale === "es" ? activeStatus?.nameEs : activeStatus?.nameEn}</span>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {statuses.map((s) => (
                                                            <SelectItem key={s.id} value={s.id} className="text-xs">
                                                                {locale === "es" ? s.nameEs : s.nameEn}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><AlertTriangle className="h-3 w-3" /> {t("priority")}</Label>
                                                <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                                                    <SelectTrigger className="w-full h-9 text-xs border-border/80">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {TASK_PRIORITIES.map((p) => (
                                                            <SelectItem key={p} value={p} className="text-xs">{tPriority(p)}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    )}

                                    {/* Conditional Reason Field */}
                                    {isEditing && targetStatusRequiresReason && (
                                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <Label className="text-[11px] font-semibold uppercase tracking-wider text-destructive flex items-center gap-1.5"><AlertTriangle className="h-3 w-3" /> {t("requiresReason") || "Justificación Requerida"}</Label>
                                            <Textarea
                                                value={reasonText}
                                                onChange={(e) => setReasonText(e.target.value)}
                                                className="resize-none min-h-[80px] text-xs border-destructive/50 focus-visible:ring-destructive"
                                                placeholder={locale === "es" ? "¿Por qué se mueve a este estado?" : "Why is this task being moved to this status?"}
                                                required
                                            />
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Calendar className="h-3 w-3" /> {t("dueDate")}</Label>
                                            {isEditing ? (
                                                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-9 text-xs border-border/80" />
                                            ) : (
                                                <div className="text-sm border border-transparent py-1 font-medium">{dueDate ? new Date(dueDate + "T00:00:00").toLocaleDateString() : <span className="text-muted-foreground font-normal italic">Sin fecha</span>}</div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Tag className="h-3 w-3" /> {t("tags")}</Label>
                                        {isEditing ? (
                                            <TagSelector selectedTags={selectedTags} onTagsChange={setSelectedTags} />
                                        ) : (
                                            <div className="flex flex-wrap gap-1.5 py-1 min-h-[28px]">
                                                {selectedTags.length > 0 ? selectedTags.map(tag => (
                                                    <Badge key={tag.id} variant="secondary" className="text-[10px] px-2 py-0.5 items-center justify-center gap-1 font-medium border" style={tag.color ? { backgroundColor: tag.color + "15", color: tag.color, borderColor: tag.color + "40" } : {}}>
                                                        {tag.name}
                                                    </Badge>
                                                )) : <span className="text-muted-foreground text-sm italic">Ninguna</span>}
                                            </div>
                                        )}
                                    </div>

                                    {/* Payment Block */}
                                    {isEditing ? (
                                        <div className="space-y-3 pt-4 border-t border-border/40">
                                            <div className="flex items-center gap-2.5">
                                                <input
                                                    type="checkbox"
                                                    id="isPayment"
                                                    checked={isPayment}
                                                    onChange={(e) => setIsPayment(e.target.checked)}
                                                    className="h-4 w-4 rounded border-border accent-primary"
                                                />
                                                <Label htmlFor="isPayment" className="flex items-center gap-1.5 cursor-pointer font-semibold text-sm">
                                                    <DollarSign className="h-4 w-4 text-primary" />
                                                    {locale === "es" ? "Tarea de Pago" : "Payment Task"}
                                                </Label>
                                            </div>

                                            {isPayment && (
                                                <div className="space-y-4 pl-7 animate-in fade-in zoom-in-95 duration-200">
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] text-muted-foreground uppercase font-semibold">{locale === "es" ? "Valor / Monto" : "Amount / Value"}</Label>
                                                        <div className="relative">
                                                            <span className="absolute left-2.5 top-1.5 text-xs text-muted-foreground">$</span>
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                value={paymentValue}
                                                                onChange={(e) => setPaymentValue(e.target.value)}
                                                                className="h-8 text-xs border-border/80 pl-6"
                                                                placeholder="150000"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        isPayment && (
                                            <div className="space-y-2 pt-2 pb-1">
                                                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><DollarSign className="h-3 w-3" /> {locale === "es" ? "Monto" : "Amount"}</Label>
                                                <div className="text-sm border border-transparent py-1 font-medium text-primary">
                                                    {paymentValue ? `$${new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(paymentValue))}` : <span className="text-muted-foreground font-normal italic">Sin valor</span>}
                                                </div>
                                            </div>
                                        )
                                    )}

                                    {/* Recurrence Block */}
                                    {isEditing ? (
                                        <div className="space-y-3 pt-4 border-t border-border/40">
                                            <div className="flex items-center gap-2.5">
                                                <input
                                                    type="checkbox"
                                                    id="isRecurring"
                                                    checked={isRecurring}
                                                    onChange={(e) => setIsRecurring(e.target.checked)}
                                                    className="h-4 w-4 rounded border-border accent-primary"
                                                />
                                                <Label htmlFor="isRecurring" className="flex items-center gap-1.5 cursor-pointer font-semibold text-sm">
                                                    <Repeat className="h-4 w-4 text-primary" />
                                                    {locale === "es" ? "Tarea Recurrente" : "Recurring Task"}
                                                </Label>
                                            </div>

                                            {isRecurring && (
                                                <div className="space-y-4 pl-7 animate-in fade-in zoom-in-95 duration-200">
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] text-muted-foreground uppercase font-semibold">{locale === "es" ? "Periodicidad" : "Frequency"}</Label>
                                                        <Select value={recurrenceType} onValueChange={(v: any) => setRecurrenceType(v)}>
                                                            <SelectTrigger className="h-8 text-xs border-border/80"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="DAILY" className="text-xs">{locale === "es" ? "Diario" : "Daily"}</SelectItem>
                                                                <SelectItem value="WEEKLY" className="text-xs">{locale === "es" ? "Semanal" : "Weekly"}</SelectItem>
                                                                <SelectItem value="MONTHLY" className="text-xs">{locale === "es" ? "Mensual" : "Monthly"}</SelectItem>
                                                                <SelectItem value="YEARLY" className="text-xs">{locale === "es" ? "Anual" : "Yearly"}</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    {(recurrenceType === "DAILY" || recurrenceType === "WEEKLY") && (
                                                        <div className="space-y-2">
                                                            <Label className="text-[10px] text-muted-foreground uppercase font-semibold">{locale === "es" ? "Días de la semana" : "Days of week"}</Label>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {[
                                                                    { val: 1, label: locale === "es" ? "L" : "M" },
                                                                    { val: 2, label: locale === "es" ? "M" : "T" },
                                                                    { val: 3, label: locale === "es" ? "X" : "W" },
                                                                    { val: 4, label: locale === "es" ? "J" : "T" },
                                                                    { val: 5, label: locale === "es" ? "V" : "F" },
                                                                    { val: 6, label: locale === "es" ? "S" : "S" },
                                                                    { val: 0, label: locale === "es" ? "D" : "S" },
                                                                ].map((day) => {
                                                                    const isSelected = recurrenceDaysOfWeek.includes(day.val);
                                                                    return (
                                                                        <button
                                                                            key={day.val}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                if (recurrenceType === "WEEKLY") {
                                                                                    setRecurrenceDaysOfWeek([day.val]);
                                                                                } else {
                                                                                    setRecurrenceDaysOfWeek((prev: number[]) =>
                                                                                        prev.includes(day.val) ? prev.filter((d: number) => d !== day.val) : [...prev, day.val].sort()
                                                                                    );
                                                                                }
                                                                            }}
                                                                            className={`h-7 w-7 rounded-full text-xs font-semibold transition-all ${isSelected ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20 ring-offset-1 ring-offset-background" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                                                                        >
                                                                            {day.label}
                                                                        </button>
                                                                    )
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {(recurrenceType === "MONTHLY" || recurrenceType === "YEARLY") && (
                                                        <div className="grid grid-cols-2 gap-3">
                                                            {recurrenceType === "YEARLY" && (
                                                                <div className="space-y-2">
                                                                    <Label className="text-[10px] text-muted-foreground uppercase font-semibold">{locale === "es" ? "Mes" : "Month"}</Label>
                                                                    <Select value={String(recurrenceMonth)} onValueChange={(v) => setRecurrenceMonth(Number(v))}>
                                                                        <SelectTrigger className="h-8 text-xs border-border/80"><SelectValue /></SelectTrigger>
                                                                        <SelectContent>
                                                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                                                                                <SelectItem key={m} value={String(m)} className="text-xs">{m}</SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                            )}
                                                            <div className="space-y-2">
                                                                <Label className="text-[10px] text-muted-foreground uppercase font-semibold">{locale === "es" ? "Día del mes" : "Day of month"}</Label>
                                                                <Input type="number" min={1} max={31} value={recurrenceDay} onChange={(e) => setRecurrenceDay(Number(e.target.value))} className="h-8 text-xs border-border/80" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        // Read Only Recurrence Presentation
                                        isRecurring && (
                                            <div className="space-y-2 pt-2 pb-1">
                                                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Repeat className="h-3 w-3" /> {locale === "es" ? "Recurrencia" : "Recurrence"}</Label>
                                                <div className="text-sm border border-transparent py-1 font-medium text-primary">
                                                    {recurrenceType === "DAILY" ? (locale === "es" ? "Diariamente" : "Daily") :
                                                        recurrenceType === "WEEKLY" ? (locale === "es" ? "Semanalmente" : "Weekly") :
                                                            recurrenceType === "MONTHLY" ? (locale === "es" ? `Mensualmente (Día ${recurrenceDay})` : `Monthly (Day ${recurrenceDay})`) :
                                                                recurrenceType === "YEARLY" ? (locale === "es" ? `Anualmente (Mes ${recurrenceMonth}, Día ${recurrenceDay})` : `Yearly (Mth ${recurrenceMonth}, Day ${recurrenceDay})`) : ""}
                                                </div>
                                            </div>
                                        )
                                    )}

                                </div>

                                {/* Description & Comments */}
                                <div className="flex flex-col gap-6">
                                    <div className="space-y-2 border border-transparent flex-1 flex flex-col">
                                        <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("description")}</Label>
                                        {isEditing ? (
                                            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="resize-none flex-1 min-h-[160px] text-sm border-border/80 bg-background/50 focus-visible:ring-1" placeholder="Añade detalles o notas adicionales a la tarea..." />
                                        ) : (
                                            <div className="text-sm whitespace-pre-wrap rounded-md bg-muted/20 p-4 flex-1 border border-border/30 overflow-y-auto max-h-[220px]">
                                                {description || <span className="text-muted-foreground italic">Sin descripción proporcionada.</span>}
                                            </div>
                                        )}
                                    </div>

                                </div>
                            </div>

                            {/* Full Width Comments Section */}
                            {mode === "view" && task && (
                                <div className="space-y-2 pt-4 border-t border-border/30 mt-6">
                                    <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><MessageSquare className="h-3 w-3" /> {locale === "es" ? "Comentarios" : "Comments"}</Label>
                                    <div className="border border-border/40 rounded-lg border-none">
                                        <TaskComments taskId={task.id} comments={task.comments || []} onCommentAdded={() => onSaved()} />
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>

                    {/* Action Footer */}
                    {isEditing && (
                        <div className="px-6 py-4 border-t border-border/50 bg-muted/10 flex justify-end gap-3 mt-auto shrink-0 shadow-[0_-4px_15px_-10px_rgba(0,0,0,0.1)]">
                            {mode === "view" && (
                                <Button type="button" variant="outline" className="text-sm h-9 bg-background hover:bg-muted" onClick={() => {
                                    setIsEditing(false);
                                    setTitle(task?.title || "");
                                    setDescription(task?.description || "");
                                }}>
                                    Cancelar
                                </Button>
                            )}
                            <Button type="button" size="sm" disabled={loading || (targetStatusRequiresReason && !reasonText.trim())} onClick={handleSave} className="min-w-[100px] h-9 text-sm font-medium shadow-sm">
                                {loading ? "..." : (mode === "create" ? tCommon("create") : tCommon("save"))}
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("deleteTask")}</DialogTitle>
                        <DialogDescription>{t("deleteConfirm")}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteOpen(false)}>{tCommon("cancel")}</Button>
                        <Button variant="destructive" disabled={loading} onClick={handleDelete}>{t("deleteTask")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
