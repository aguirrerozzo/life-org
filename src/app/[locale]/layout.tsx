import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = (await import(`../../../messages/${locale}.json`)).default;

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <TooltipProvider>
              {children}
            </TooltipProvider>
            <Toaster />
          </NextIntlClientProvider>
        </Providers>
      </body>
    </html>
  );
}
