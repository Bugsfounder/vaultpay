"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";


export default function AccessDeniedPage() {
  const router = useRouter();
  const { user } = useAuth();

  const handleReturn = () => {
    if (!user) {
      router.push("/");
    } else if (user.role === "admin") {
      router.push("/admin/dashboard");
    } else {
      router.push("/client/dashboard");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        padding: "1.5rem",
        position: "relative",
      }}
    >
      {/* Decorative cyber grid scan effect */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "linear-gradient(rgba(239, 68, 68, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(239, 68, 68, 0.03) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          pointerEvents: "none",
        }}
      />

      <div
        className="glass-card"
        style={{
          maxWidth: "500px",
          width: "100%",
          textAlign: "center",
          padding: "3rem 2.5rem",
          borderColor: "rgba(239, 68, 68, 0.3)",
          boxShadow: "0 10px 40px rgba(239, 68, 68, 0.1)",
          zIndex: 1,
        }}
      >


        <h1 style={{ fontSize: "1.75rem", marginBottom: "1rem", color: "#ef4444" }}>
          403: Security Exception
        </h1>

        <p style={{ color: "var(--text-secondary)", marginBottom: "2rem", fontSize: "0.95rem" }}>
          VaultPay security protocols have intercepted an unauthorized route request. Your account role (
          <strong style={{ color: "var(--text-primary)" }}>{user?.role || "anonymous"}</strong>
          ) is not permitted to access this area.
        </p>

        <div
          style={{
            background: "rgba(239, 68, 68, 0.05)",
            border: "1px solid rgba(239, 68, 68, 0.1)",
            borderRadius: "6px",
            padding: "1rem",
            marginBottom: "2rem",
            fontFamily: "var(--font-mono)",
            fontSize: "0.8rem",
            textAlign: "left",
            color: "#dc2626",
          }}
        >
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <span style={{ color: "var(--text-muted)" }}>[PROTOCOL]:</span>
            <span>ZERO_TRUST_ROUTE_VIOLATION</span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <span style={{ color: "var(--text-muted)" }}>[RESOURCE]:</span>
            <span>/admin/* Restricted Area</span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <span style={{ color: "var(--text-muted)" }}>[IDENTITY]:</span>
            <span>{user?.email || "unknown_token"}</span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <span style={{ color: "var(--text-muted)" }}>[ACTION]:</span>
            <span>SHIELD_ENGAGED_REDIRECT_REQUIRED</span>
          </div>
        </div>

        <button
          onClick={handleReturn}
          className="btn btn-primary"
          style={{
            background: "transparent",
            border: "1px solid var(--text-secondary)",
            color: "var(--text-primary)",
            width: "100%",
            boxShadow: "none",
            gap: "0.5rem",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(0, 0, 0, 0.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <span>Return to Secured Domain</span>
        </button>
      </div>
    </div>
  );
}
