"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";


export const RouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // If auth is still loading, show spinner
    if (isLoading) return;

    // Public paths that do not require authentication
    const isPublicPath = pathname === "/" || pathname === "/403";

    if (isPublicPath) {
      setAuthorized(true);
      return;
    }

    // Redirect to login if user is not logged in
    if (!user) {
      router.replace("/");
      setAuthorized(false);
      return;
    }

    // Role-based path checks
    const isAdminPath = pathname.startsWith("/admin");
    const isClientPath = pathname.startsWith("/client");
    const isInvoicePath = pathname.startsWith("/invoices");

    if (isAdminPath && user.role !== "admin") {
      router.replace("/403");
      setAuthorized(false);
      return;
    }

    if (isClientPath && user.role !== "client") {
      router.replace("/");
      setAuthorized(false);
      return;
    }

    // Invoice path ownership check
    if (isInvoicePath && user.role === "client") {
      const invoiceId = pathname.split("/").pop();
      if (invoiceId) {
        // Fetch invoice info to verify ownership with security headers
        fetch(`/api/invoices?id=${invoiceId}`, {
          headers: {
            "x-user-role": user.role,
            "x-user-email": user.email,
          },
        })
          .then((res) => {
            if (res.status === 401 || res.status === 403 || res.status === 404) {
              router.replace("/403");
              setAuthorized(false);
            } else {
              res.json().then((invoice) => {
                if (invoice.clientEmail?.toLowerCase() !== user.email.toLowerCase()) {
                  router.replace("/403");
                  setAuthorized(false);
                } else {
                  setAuthorized(true);
                }
              });
            }
          })
          .catch(() => {
            router.replace("/403");
            setAuthorized(false);
          });
        return;
      }
    }

    setAuthorized(true);
  }, [user, isLoading, pathname, router]);

  if (isLoading || (!authorized && pathname !== "/" && pathname !== "/403")) {
    return (
      <div className="guard-loading-screen">
        <div className="guard-loading-card">
          <p className="guard-loading-text">Verifying Security Credentials...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
