"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { PlusCircle, Trash2, Smartphone, Mail, Hash, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface ChannelConnection {
    id: string;
    platform: string;
    channelId: string;
    createdAt: string;
}

export default function IntegrationsPage() {
    const t = useTranslations("tasks"); // using tasks namespace for simplicity, can make 'settings' later
    const [connections, setConnections] = useState<ChannelConnection[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Form State
    const [platform, setPlatform] = useState("whatsapp");
    const [channelId, setChannelId] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const PLATFORM_OPTIONS = [
        { id: "whatsapp", label: "WhatsApp", icon: Smartphone },
        { id: "telegram", label: "Telegram", icon: Bot },
        { id: "slack", label: "Slack", icon: Hash },
        { id: "email", label: "Email", icon: Mail },
    ];

    useEffect(() => {
        fetchConnections();
    }, []);

    async function fetchConnections() {
        try {
            const res = await fetch("/api/integrations");
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setConnections(data);
        } catch (error) {
            toast.error("Error loading integrations");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleAddConnection(e: React.FormEvent) {
        e.preventDefault();
        if (!channelId.trim()) return;

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/integrations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ platform, channelId: channelId.trim() })
            });

            if (!res.ok) throw new Error("Failed to save integration");

            toast.success(`${platform} connected successfully`);
            setChannelId("");
            fetchConnections(); // refresh the list
        } catch (error) {
            toast.error("Failed to connect channel");
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDelete(platformToDelete: string) {
        try {
            const res = await fetch(`/api/integrations?platform=${platformToDelete}`, {
                method: "DELETE"
            });
            if (!res.ok) throw new Error("Failed to delete");

            toast.success("Connection removed");
            setConnections(connections.filter(c => c.platform !== platformToDelete));
        } catch (error) {
            toast.error("Error removing connection");
        }
    }

    const getPlatformIcon = (platformId: string) => {
        const option = PLATFORM_OPTIONS.find(p => p.id === platformId);
        const Icon = option ? option.icon : Bot;
        return <Icon className="h-5 w-5" />;
    };

    const getPlatformLabel = (platformId: string) => {
        const option = PLATFORM_OPTIONS.find(p => p.id === platformId);
        return option ? option.label : platformId;
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">AI Integrations</h1>
                <p className="text-muted-foreground mt-2 text-lg">
                    Connect an external messaging channel so the AI can track your tasks from your phone or slack workspace.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Form to Add New */}
                <Card className="col-span-1 border-border/50 shadow-sm bg-card/50">
                    <CardHeader>
                        <CardTitle className="text-lg">Add Connection</CardTitle>
                        <CardDescription>Link a new channel directly to your account.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddConnection} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Platform</label>
                                <Select value={platform} onValueChange={(val) => val && setPlatform(val)}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select platform" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PLATFORM_OPTIONS.map(opt => (
                                            <SelectItem key={opt.id} value={opt.id}>
                                                <div className="flex items-center gap-2">
                                                    <opt.icon className="h-4 w-4 text-muted-foreground" />
                                                    {opt.label}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    {platform === "email" ? "Email Address" : "Channel / Phone ID"}
                                </label>
                                <Input
                                    placeholder={platform === "whatsapp" ? "e.g. 5215512345678" : "Enter ID..."}
                                    value={channelId}
                                    onChange={(e) => setChannelId(e.target.value)}
                                    disabled={isSubmitting}
                                />
                                {platform === "whatsapp" && (
                                    <p className="text-[10px] text-muted-foreground">
                                        Exclude the '+' sign. Must exactly match the Webhook sender format.
                                    </p>
                                )}
                            </div>

                            <div className="space-y-4 pt-4">
                                <Button type="submit" className="w-full" disabled={isSubmitting || !channelId.trim()}>
                                    {isSubmitting ? "Connecting..." : (
                                        <>
                                            <PlusCircle className="mr-2 h-4 w-4" /> Connect
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* List of active connections */}
                <Card className="col-span-1 md:col-span-2 border-border/50 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg">Active Connections</CardTitle>
                        <CardDescription>Accounts authorized to command the AI Assistant.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="text-sm text-muted-foreground animate-pulse p-4">Loading connections...</div>
                        ) : connections.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground border border-dashed rounded-lg bg-muted/20">
                                <Bot className="h-8 w-8 mb-3 opacity-20" />
                                <p className="text-sm">You haven't connected any external channels yet.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border/50 border rounded-lg overflow-hidden">
                                {connections.map((conn) => (
                                    <div key={conn.id} className="flex items-center justify-between p-4 bg-card hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                {getPlatformIcon(conn.platform)}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm">{getPlatformLabel(conn.platform)}</p>
                                                <p className="text-xs text-muted-foreground truncate max-w-[200px] md:max-w-xs">{conn.channelId}</p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                                            onClick={() => handleDelete(conn.platform)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
