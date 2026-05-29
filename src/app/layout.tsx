import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { RouteGuard } from "@/components/RouteGuard";

export const metadata: Metadata = {
  title: "VaultPay Financial Core - Nexus Corporate Services",
  description: "Secure client portal and role-based invoicing workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <RouteGuard>
            <div className="app-container">
              {children}
            </div>
          </RouteGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
