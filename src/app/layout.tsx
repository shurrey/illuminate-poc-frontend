import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { UserProvider } from "@/context/UserContext";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { HelpButton } from "@/components/HelpButton";

export const metadata: Metadata = {
  title: "Blackboard Illuminate",
  description: "Personalized Analytics Hub for Education",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#f5f6f8] text-gray-900 antialiased flex flex-col min-h-screen">
        <AuthProvider>
          <UserProvider>
            <Navigation />
            <main className="flex-1">{children}</main>
            <Footer />
            <HelpButton />
          </UserProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
