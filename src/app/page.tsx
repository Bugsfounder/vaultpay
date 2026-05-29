"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";


export default function LoginPage() {
  const { login, user } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in, redirect to correct dashboard
  React.useEffect(() => {
    if (user) {
      if (user.role === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/client/dashboard");
      }
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      let role: "admin" | "client" = "client";
      let clientProfileId = "client-acme";

      if (email.toLowerCase() === "admin@nexus.com") {
        role = "admin";
      } else if (email.toLowerCase() === "billing@globex.com") {
        role = "client";
        clientProfileId = "client-globex";
      } else if (email.toLowerCase() === "billing@acme.com") {
        role = "client";
        clientProfileId = "client-acme";
      } else {
        // Simple heuristic for demo purposes
        if (email.includes("nexus")) {
          role = "admin";
        } else if (email.includes("globex")) {
          role = "client";
          clientProfileId = "client-globex";
        } else {
          role = "client";
          clientProfileId = "client-acme";
        }
      }

      await login(email.toLowerCase(), role, clientProfileId);
    } catch (err) {
      setError("Authentication failed. Please check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string, role: "admin" | "client", profileId?: string) => {
    setError("");
    setIsSubmitting(true);
    setEmail(demoEmail);
    setPassword("••••••••••••");
    try {
      await login(demoEmail, role, profileId);
    } catch (err) {
      setError("Quick login failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h2>VaultPay Financial Core</h2>
          <p style={{ fontSize: "0.9rem", marginTop: "0.25rem" }}>
            Nexus Corporate Services Gateway
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: "1rem",
              background: "var(--color-danger-bg)",
              border: "1px solid var(--color-danger-border)",
              borderRadius: "8px",
              color: "var(--color-danger)",
              fontSize: "0.9rem",
              marginBottom: "1.5rem",
            }}
          >
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Corporate Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="e.g., billing@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group" style={{ marginBottom: "1.5rem" }}>
            <label className="form-label">Access Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", gap: "0.75rem" }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span>Verifying Secure Handshake...</span>
            ) : (
              <span>Establish Session</span>
            )}
          </button>
        </form>

        <div
          style={{
            margin: "2rem 0 1rem 0",
            borderTop: "1px solid var(--border-card)",
            paddingTop: "1.5rem",
          }}
        >
          <p
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--text-muted)",
              marginBottom: "1rem",
              textAlign: "center",
            }}
          >
            Security Evaluation Profiles
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <button
              onClick={() => handleQuickLogin("admin@nexus.com", "admin")}
              disabled={isSubmitting}
              className="btn btn-secondary"
              style={{ justifyContent: "space-between", fontSize: "0.85rem", padding: "0.6rem 1rem" }}
            >
              <span style={{ fontWeight: 600 }}>Evelyn Croft (Admin)</span>
              <span style={{ color: "var(--text-muted)" }}>admin@nexus.com</span>
            </button>

            <button
              onClick={() => handleQuickLogin("billing@acme.com", "client", "client-acme")}
              disabled={isSubmitting}
              className="btn btn-secondary"
              style={{ justifyContent: "space-between", fontSize: "0.85rem", padding: "0.6rem 1rem" }}
            >
              <span>Acme Corp (Client)</span>
              <span style={{ color: "var(--text-muted)" }}>billing@acme.com</span>
            </button>

            <button
              onClick={() => handleQuickLogin("billing@globex.com", "client", "client-globex")}
              disabled={isSubmitting}
              className="btn btn-secondary"
              style={{ justifyContent: "space-between", fontSize: "0.85rem", padding: "0.6rem 1rem" }}
            >
              <span>Globex Corp (Client)</span>
              <span style={{ color: "var(--text-muted)" }}>billing@globex.com</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
