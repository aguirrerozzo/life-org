"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Settings2, Plus, GripVertical, Trash2, Edit2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { StatusData } from "@/types";

interface ManageStatusesDialogProps {
    statuses: StatusData[];
    onUpdated: () => void;
}

export function ManageStatusesDialog({ statuses, onUpdated }: ManageStatusesDialogProps) {
    const t = useTranslations("tasks");
    const locale = useLocale();
    const [open, setOpen] = useState(false);

    // Create / Edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [nameEn, setNameEn] = useState("");
    const [nameEs, setNameEs] = useState("");
    const [color, setColor] = useState("#3b82f6"); // Default blue
    const [requiresReason, setRequiresReason] = useState(false);
    const [loading, setLoading] = useState(false);

    // Delete state
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [fallbackId, setFallbackId] = useState<string>("");

    function resetForm() {
        setEditingId(null);
        setNameEn("");
        setNameEs("");
        setColor("#3b82f6");
        setRequiresReason(false);
    }

    function handleEdit(status: StatusData) {
        setEditingId(status.id);
        setNameEn(status.nameEn);
        setNameEs(status.nameEs);
        setColor(status.color);
        setRequiresReason(status.requiresReason || false);
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        if (!nameEn || !nameEs) return;
        setLoading(true);

        const body = { nameEn, nameEs, color, requiresReason };

        let res;
        try {
            if (editingId) {
                res = await fetch(`/api/statuses/${editingId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });
            } else {
                res = await fetch(`/api/statuses`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });
            }

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                console.error("Failed to save status:", errorData);
                alert("Error al guardar el estado. Verifica consola.");
            }
        } catch (error) {
            console.error(error);
            alert("Error de red al guardar.");
        }

        resetForm();
        onUpdated();
        setLoading(false);
    }

    async function handleDeleteConfirm() {
        if (!deleteId || !fallbackId) return;
        setLoading(true);

        await fetch(`/api/statuses/${deleteId}?fallbackStatusId=${fallbackId}`, {
            method: "DELETE",
        });

        setDeleteId(null);
        setFallbackId("");
        onUpdated();
        setLoading(false);
    }

    return (
        <>
            <Dialog open={open} onOpenChange={(v) => {
                setOpen(v);
                if (!v) {
                    resetForm();
                    setDeleteId(null);
                }
            }}>
                <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors border border-input border-dashed bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3 text-xs w-auto">
                    <Settings2 className="h-4 w-4" />
                    {t("manageStatuses") || "Manage Statuses"}
                </DialogTrigger>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t("manageStatuses") || "Manage Statuses"}</DialogTitle>
                        <DialogDescription>
                            Create, rename, or remove task statuses for your board.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-2">
                        {statuses.map((status) => (
                            <div
                                key={status.id}
                                className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50"
                            >
                                <div className="flex items-center gap-3">
                                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab opacity-50 hover:opacity-100 hidden" />
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                                    <div>
                                        <p className="text-sm font-medium">{locale === "es" ? status.nameEs : status.nameEn}</p>
                                        <p className="text-[10px] text-muted-foreground">{locale === "es" ? status.nameEn : status.nameEs}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(status)}>
                                        <Edit2 className="h-3 w-3" />
                                    </Button>
                                    {statuses.length > 1 && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => setDeleteId(status.id)}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 border-t border-border/50 mt-2">
                        <form onSubmit={handleSave} className="space-y-3">
                            <h4 className="text-sm font-medium">
                                {editingId ? "Edit Status" : "Create New Status"}
                            </h4>
                            <div className="flex gap-3">
                                <div className="space-y-1.5 flex-1">
                                    <Label className="text-xs">Name (EN)</Label>
                                    <Input
                                        value={nameEn}
                                        onChange={(e) => setNameEn(e.target.value)}
                                        placeholder="e.g. Backlog"
                                        className="h-8 text-sm"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5 flex-1">
                                    <Label className="text-xs">Name (ES)</Label>
                                    <Input
                                        value={nameEs}
                                        onChange={(e) => setNameEs(e.target.value)}
                                        placeholder="e.g. Pendientes"
                                        className="h-8 text-sm"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="space-y-1.5 flex-1 max-w-[100px]">
                                    <Label className="text-xs">Color {color && !color.startsWith("#") && "(Invalid hex)"}</Label>
                                    <div className="flex h-8 w-full rounded-md border border-input bg-transparent px-1 py-1 text-sm shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring">
                                        <input
                                            type="color"
                                            value={color.startsWith("#") ? color : "#cccccc"}
                                            onChange={(e) => setColor(e.target.value)}
                                            className="h-full w-full border-0 bg-transparent p-0 focus:outline-none cursor-pointer"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5 flex flex-col pt-1">
                                    <Label className="text-xs leading-none">Requires Reason</Label>
                                    <div className="flex items-center pt-1.5 h-8">
                                        <Switch
                                            checked={requiresReason}
                                            onCheckedChange={setRequiresReason}
                                            className="data-[state=checked]:bg-destructive"
                                        />
                                    </div>
                                </div>
                                <div className="flex-1 flex items-end justify-end pt-[22px]">
                                    {editingId && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="mr-2 h-8"
                                            onClick={resetForm}
                                        >
                                            Cancel
                                        </Button>
                                    )}
                                    <Button type="submit" size="sm" className="h-8" disabled={loading}>
                                        {loading ? "..." : editingId ? "Save Changes" : "Create Status"}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-5 w-5" />
                            Delete Status
                        </DialogTitle>
                        <DialogDescription>
                            Before you delete this status, please select where existing tasks should be reassigned.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-3">
                        <Label>Fallback Status</Label>
                        <Select value={fallbackId} onValueChange={(v) => setFallbackId(v || "")}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a status..." />
                            </SelectTrigger>
                            <SelectContent>
                                {statuses.filter(s => s.id !== deleteId).map(s => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {locale === "es" ? s.nameEs : s.nameEn}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button variant="destructive" disabled={!fallbackId || loading} onClick={handleDeleteConfirm}>
                            {loading ? "Deleting..." : "Confirm Deletion"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
