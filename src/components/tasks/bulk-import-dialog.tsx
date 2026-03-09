"use client";

import { useState, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Upload, FileDown, AlertCircle, FileText, CheckCircle2, Loader2 } from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { StatusData } from "@/types";

interface BulkImportDialogProps {
    onSaved: () => void;
    statuses: StatusData[];
}

interface ParsedTaskRow {
    Title: string;
    Description?: string;
    Status: string;
    Priority: "LOW" | "MEDIUM" | "HIGH";
    DueDate?: string;
    Cost?: string;
    IsRecurring?: string;
    RecurrenceType?: string;
    Tags?: string;
    RemindersPreAlertMinutes?: string;
}

export function BulkImportDialog({ onSaved, statuses }: BulkImportDialogProps) {
    const t = useTranslations("tasks");
    const tCommon = useTranslations("common");
    const locale = useLocale();
    const [open, setOpen] = useState(false);

    const [parsedData, setParsedData] = useState<ParsedTaskRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const TEMPLATE_HEADERS = [
        "Title",
        "Description",
        "Status",
        "Priority",
        "DueDate",
        "Cost",
        "IsRecurring",
        "RecurrenceType",
        "Tags",
        "RemindersPreAlertMinutes"
    ];

    const handleDownloadTemplate = () => {
        const csvContent = "data:text/csv;charset=utf-8," + TEMPLATE_HEADERS.join(",") + "\n" +
            "Buy groceries,Milk and eggs,To Do,MEDIUM,2024-12-31,25.50,false,,,120\n" +
            "Pay Electricity,Invoice #1234,To Do,HIGH,2024-12-15,100.00,true,MONTHLY,,1440";

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "life_org_tasks_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        setParsedData([]);

        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.csv')) {
            setError(locale === "es" ? "Por favor sube un archivo CSV válido." : "Please upload a valid CSV file.");
            return;
        }

        Papa.parse<ParsedTaskRow>(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors.length > 0) {
                    setError(locale === "es" ? "Error parseando el archivo CSV." : "Error parsing CSV file.");
                    console.error(results.errors);
                    return;
                }

                // Validation: Check if required headers exist
                const fields = results.meta.fields || [];
                if (!fields.includes("Title")) {
                    setError(locale === "es" ? "El CSV debe incluir una columna 'Title'." : "The CSV must include a 'Title' column.");
                    return;
                }

                setParsedData(results.data.filter(row => row.Title && row.Title.trim() !== ""));
            },
            error: (error) => {
                setError(error.message);
            }
        });

        // Reset input so the same file can be uploaded again if needed
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleImport = async () => {
        if (parsedData.length === 0) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/tasks/bulk-import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tasks: parsedData,
                    defaultStatusId: statuses[0]?.id
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to import tasks");
            }

            const result = await response.json();

            toast.success(
                locale === "es"
                    ? `¡${result.count} tareas importadas con éxito!`
                    : `Successfully imported ${result.count} tasks!`
            );

            setOpen(false);
            setParsedData([]);
            onSaved();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (!val) {
                setParsedData([]);
                setError(null);
            }
        }}>
            <DialogTrigger render={
                <Button variant="outline" size="sm" className="h-8 gap-1 hidden sm:flex">
                    <Upload className="h-3.5 w-3.5" />
                    {locale === "es" ? "Importar CSV" : "Import CSV"}
                </Button>
            } />

            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        {locale === "es" ? "Importación Masiva de Tareas" : "Bulk Task Import"}
                    </DialogTitle>
                    <DialogDescription>
                        {locale === "es"
                            ? "Sube un archivo .csv para crear múltiples tareas de golpe. Asegúrate de usar la plantilla correcta."
                            : "Upload a .csv file to bulk create tasks. Make sure to use the correct template."}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-muted/50 p-4 rounded-lg border border-border/50">
                        <div className="text-sm">
                            <p className="font-medium">{locale === "es" ? "1. Descarga la Plantilla" : "1. Download Template"}</p>
                            <p className="text-muted-foreground">{locale === "es" ? "Incluye los encabezados necesarios." : "Includes all the required headers."}</p>
                        </div>
                        <Button variant="secondary" size="sm" onClick={handleDownloadTemplate} className="gap-2">
                            <FileDown className="h-4 w-4" />
                            Template.csv
                        </Button>
                    </div>

                    <div className="flex flex-col gap-2">
                        <p className="font-medium text-sm">{locale === "es" ? "2. Sube tu Archivo" : "2. Upload your File"}</p>

                        <div
                            className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-3 transition-colors text-center ${parsedData.length > 0 ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'}`}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                accept=".csv"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                            />

                            {parsedData.length > 0 ? (
                                <>
                                    <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                        <CheckCircle2 className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-primary">
                                            {locale === "es" ? "Archivo cargado" : "File loaded"}
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {parsedData.length} {locale === "es" ? "tareas detectadas listas para importar." : "tasks detected ready for import."}
                                        </p>
                                    </div>
                                    <Button variant="ghost" size="sm" className="mt-2" onClick={(e) => { e.stopPropagation(); setParsedData([]); }}>
                                        {locale === "es" ? "Cambiar archivo" : "Change file"}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                        <Upload className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="font-medium">
                                            {locale === "es" ? "Haz clic para seleccionar tu CSV" : "Click to select your CSV"}
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-1 text-balance">
                                            {locale === "es" ? "Asegúrate de que los encabezados coinciden con la plantilla." : "Ensure headers match the template exactly."}
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {parsedData.length > 0 && (
                        <div className="max-h-40 overflow-y-auto rounded-md border text-sm">
                            <table className="w-full">
                                <thead className="bg-muted sticky top-0">
                                    <tr>
                                        <th className="text-left py-2 px-3 font-medium">Title</th>
                                        <th className="text-left py-2 px-3 font-medium">Priority</th>
                                        <th className="text-left py-2 px-3 font-medium">Cost</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsedData.slice(0, 5).map((row, i) => (
                                        <tr key={i} className="border-t">
                                            <td className="py-2 px-3 truncate max-w-[200px]">{row.Title}</td>
                                            <td className="py-2 px-3">
                                                <Badge variant="outline" className="text-[10px]">{row.Priority || "MEDIUM"}</Badge>
                                            </td>
                                            <td className="py-2 px-3 text-muted-foreground">{row.Cost ? `$${row.Cost}` : "-"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {parsedData.length > 5 && (
                                <div className="bg-muted/50 p-2 text-center text-xs text-muted-foreground border-t">
                                    {locale === "es" ? `+ ${parsedData.length - 5} tareas más...` : `+ ${parsedData.length - 5} more tasks...`}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                        {tCommon("cancel")}
                    </Button>
                    <Button onClick={handleImport} disabled={parsedData.length === 0 || loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {loading
                            ? (locale === "es" ? "Importando..." : "Importing...")
                            : (locale === "es" ? `Importar ${parsedData.length} tareas` : `Import ${parsedData.length} tasks`)}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
