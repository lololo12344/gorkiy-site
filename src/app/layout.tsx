import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "ГОРЬКИЙ — кофейня в Нальчике",
  description: "Минималистичный заказ авторского кофе и кухни в кофейнях «Горький» (г. Нальчик, 4 точки).",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${manrope.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans bg-white text-[#111111]">
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
