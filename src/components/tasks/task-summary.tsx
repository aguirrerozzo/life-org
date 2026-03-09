"use client";

import { useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ChevronDown, CalendarDays, DollarSign, Wallet, CalendarClock, TrendingUp } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import type { TaskWithRelations } from "@/types";

interface TaskSummaryProps {
    tasks: TaskWithRelations[];
}

interface MonthFinancials {
    realizados: number;
    pendientes: number;
}

export function TaskSummary({ tasks }: TaskSummaryProps) {
    const t = useTranslations("tasks");
    const locale = useLocale();

    const metrics = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Adjust for Monday start
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        let todayCount = 0;
        let weekCount = 0;

        const monthlyFinancials: Record<string, MonthFinancials> = {};
        let rollingOverduePendientes = 0; // Money from past months that are NOT done

        const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

        tasks.forEach(task => {
            if (!task.dueDate) return;
            const taskDate = new Date(task.dueDate);
            const taskDateStr = task.dueDate.split("T")[0];
            const taskYearMonth = taskDateStr.substring(0, 7); // "YYYY-MM"
            const isDone = task.statusRel?.nameEn?.toUpperCase() === "DONE";

            // Date Checks
            if (taskDateStr === today.toISOString().split("T")[0] && !isDone) {
                todayCount++;
            }
            if (taskDate >= startOfWeek && taskDate <= endOfWeek && !isDone) {
                weekCount++;
            }

            // Financial Checks
            if (task.isPayment && task.paymentValue) {
                // If the task is from a PAST month and is NOT done, capture it as rollover debt
                if (taskYearMonth < currentYearMonth && !isDone) {
                    rollingOverduePendientes += task.paymentValue;
                } else {
                    if (!monthlyFinancials[taskYearMonth]) {
                        monthlyFinancials[taskYearMonth] = { realizados: 0, pendientes: 0 };
                    }

                    if (isDone) {
                        monthlyFinancials[taskYearMonth].realizados += task.paymentValue;
                    } else {
                        monthlyFinancials[taskYearMonth].pendientes += task.paymentValue;
                    }
                }
            }
        });

        // Apply Rollover Debt to CURRENT month
        if (rollingOverduePendientes > 0) {
            if (!monthlyFinancials[currentYearMonth]) {
                monthlyFinancials[currentYearMonth] = { realizados: 0, pendientes: 0 };
            }
            monthlyFinancials[currentYearMonth].pendientes += rollingOverduePendientes;
        }

        // Sort months descending (Latest first)
        const sortedMonths = Object.keys(monthlyFinancials).sort((a, b) => b.localeCompare(a));

        return {
            todayCount,
            weekCount,
            monthlyFinancials,
            sortedMonths
        };
    }, [tasks]);

    const { todayCount, weekCount, monthlyFinancials, sortedMonths } = metrics;

    const formatter = new Intl.NumberFormat(locale === "es" ? 'es-AR' : 'en-US', {
        style: "currency",
        currency: "USD",
        currencyDisplay: "narrowSymbol",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });

    const getMonthName = (yearMonthStr: string) => {
        const [year, month] = yearMonthStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        const monthName = date.toLocaleString(locale === "es" ? "es-ES" : "en-US", { month: "long" });
        return monthName.charAt(0).toUpperCase() + monthName.slice(1);
    };

    return (
        <Accordion multiple={true} className="w-full animate-in fade-in duration-300">
            <AccordionItem value="agenda-root" className="border-b-0 bg-card rounded-md border border-border/50">
                <AccordionTrigger className="px-3 py-2.5 hover:no-underline flex-row-reverse justify-end gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-full">
                    <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {locale === "es" ? "Agenda" : "Agenda"}
                    </span>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3 pt-1">
                    <div className="space-y-6">

                        {/* Time Tracking */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-background border border-border/50 rounded-lg p-3 flex flex-col justify-between hover:border-primary/30 transition-colors">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1"><CalendarClock className="h-3 w-3" /> {locale === "es" ? "Para Hoy" : "For Today"}</span>
                                <span className="text-2xl font-black mt-1 text-foreground">{todayCount}</span>
                            </div>
                            <div className="bg-background border border-border/50 rounded-lg p-3 flex flex-col justify-between hover:border-primary/30 transition-colors">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {locale === "es" ? "Esta Semana" : "This Week"}</span>
                                <span className="text-2xl font-black mt-1 text-foreground">{weekCount}</span>
                            </div>
                        </div>

                        {/* Financial Tracking */}
                        {sortedMonths.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-1 border-b border-border/40">
                                    <span className="flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" /> {locale === "es" ? "Finanzas" : "Financials"}</span>
                                </div>

                                <div className="space-y-3">
                                    {sortedMonths.map(monthKey => {
                                        const data = monthlyFinancials[monthKey];
                                        return (
                                            <div key={monthKey} className="bg-background border border-border/50 rounded-lg overflow-hidden transition-colors hover:border-primary/30">
                                                <div className="bg-muted/30 px-3 py-1.5 border-b border-border/40 text-[11px] font-bold text-foreground flex items-center justify-between uppercase tracking-wide">
                                                    {getMonthName(monthKey)}
                                                </div>
                                                <div className="p-3 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] font-semibold text-muted-foreground">{locale === "es" ? "Pagados" : "Paid"}</span>
                                                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-500">{formatter.format(data.realizados)}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] font-semibold text-muted-foreground">{locale === "es" ? "Pendientes" : "Pending"}</span>
                                                        <span className="text-sm font-bold text-destructive">{formatter.format(data.pendientes)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}
