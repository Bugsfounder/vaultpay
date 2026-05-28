"use client";

import React, { useState } from "react";
import { CreditCard, Lock, Loader, AlertTriangle, CheckCircle } from "./Icons";

interface CheckoutModalProps {
  invoiceId: string;
  amount: number;
  clientEmail: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  invoiceId,
  amount,
  clientEmail,
  onSuccess,
  onClose,
}) => {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");
  
  // Submit States
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Form input formatters
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 16) value = value.slice(0, 16);
    // Format in blocks of 4
    const matches = value.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      setCardNumber(parts.join(" "));
    } else {
      setCardNumber(value);
    }
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length >= 3) {
      setExpiry(`${value.slice(0, 2)}/${value.slice(2)}`);
    } else {
      setExpiry(value);
    }
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 4) setCvc(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // CRITICAL: Double-click prevention guard
    if (isProcessing || success) return;

    if (!cardNumber || cardNumber.replace(/\s/g, "").length < 16) {
      setError("Please enter a valid 16-digit card number.");
      return;
    }
    if (!expiry || expiry.length < 5) {
      setError("Please enter card expiration date (MM/YY).");
      return;
    }
    if (!cvc || cvc.length < 3) {
      setError("Please enter card verification code.");
      return;
    }
    if (!name) {
      setError("Please enter cardholder name.");
      return;
    }

    setError("");
    setIsProcessing(true); // Disable buttons and state immediately
    setStatusMessage("1. Generating Stripe Token & Verifying Handshake...");

    try {
      // Step 1: Simulate Client Tokenization
      await new Promise((resolve) => setTimeout(resolve, 800));
      setStatusMessage("2. Relaying payload to secure banking network...");

      // Step 2: Call mock payment API
      const savedSession = localStorage.getItem("vaultpay_session");
      const user = savedSession ? JSON.parse(savedSession) : null;

      if (!user) {
        throw new Error("Authentication session expired.");
      }

      setStatusMessage("3. Performing Zero-Trust Identity check & settling funds...");
      const res = await fetch("/api/pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": user.role,
          "x-user-email": user.email,
        },
        body: JSON.stringify({
          invoiceId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Stripe transaction declined.");
      }

      const paymentResult = await res.json();
      setStatusMessage("4. Funds cleared! Finalizing receipt ledger...");
      await new Promise((resolve) => setTimeout(resolve, 600));

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during processing.");
      setIsProcessing(false); // Re-enable for corrections
      setStatusMessage("");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(6px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1100,
        padding: "1.5rem",
      }}
    >
      <div
        className="glass-card"
        style={{
          maxWidth: "460px",
          width: "100%",
          padding: "2.5rem",
          background: "#0d0d12",
          borderColor: success ? "rgba(16, 185, 129, 0.3)" : "rgba(124, 58, 237, 0.2)",
          position: "relative",
          boxShadow: success ? "0 0 40px rgba(16, 185, 129, 0.1)" : "0 10px 40px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700 }}>Secure Credit Card Payment</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>
              Powered by Stripe compliance layer
            </p>
          </div>
          {!isProcessing && !success && (
            <button
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: "0.3rem 0.6rem", borderRadius: "6px", fontSize: "0.8rem" }}
            >
              Cancel
            </button>
          )}
        </div>

        {error && (
          <div
            style={{
              padding: "0.8rem",
              background: "var(--color-danger-bg)",
              border: "1px solid var(--color-danger-border)",
              borderRadius: "8px",
              color: "#f87171",
              fontSize: "0.85rem",
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div
            style={{
              textAlign: "center",
              padding: "2rem 0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <div style={{ color: "#10b981" }}>
              <CheckCircle size={48} />
            </div>
            <h3 style={{ color: "#10b981" }}>Transaction Confirmed</h3>
            <p style={{ fontSize: "0.9rem" }}>
              Stripe webhook has triggered and marked invoice <strong style={{ color: "var(--text-primary)" }}>{invoiceId}</strong> as Paid.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="stripe-form-container">
            <div
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid var(--border-card)",
                padding: "1rem",
                borderRadius: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.5rem",
              }}
            >
              <div>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>Amount to Settle</span>
                <strong style={{ fontSize: "1.2rem", fontWeight: 700 }}>${amount.toLocaleString()} USD</strong>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "right" }}>
                <span>Invoice: </span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>{invoiceId}</span>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Card Number</label>
              <div className="stripe-input-wrapper">
                <CreditCard size={18} style={{ color: "var(--text-muted)" }} />
                <input
                  type="text"
                  className="stripe-input"
                  placeholder="4242 4242 4242 4242"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  disabled={isProcessing}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Expiration Date</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={handleExpiryChange}
                  disabled={isProcessing}
                  style={{ fontFamily: "var(--font-mono)", fontSize: "0.95rem" }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Security Code (CVC)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="123"
                  value={cvc}
                  onChange={handleCvcChange}
                  disabled={isProcessing}
                  style={{ fontFamily: "var(--font-mono)", fontSize: "0.95rem" }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: "1rem" }}>
              <label className="form-label">Cardholder Full Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Evelyn Croft"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isProcessing}
              />
            </div>

            {isProcessing && (
              <div
                style={{
                  background: "rgba(124, 58, 237, 0.05)",
                  border: "1px solid rgba(124, 58, 237, 0.2)",
                  borderRadius: "8px",
                  padding: "0.8rem 1rem",
                  fontSize: "0.8rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  color: "#a78bfa",
                  marginBottom: "0.5rem",
                }}
              >
                <Loader className="animate-spin" size={16} />
                <span>{statusMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isProcessing}
              className="btn btn-primary"
              style={{ width: "100%", height: "48px", gap: "0.5rem" }}
            >
              {isProcessing ? (
                <>
                  <Loader className="animate-spin" size={16} />
                  <span>Settling transaction... DO NOT REFRESH</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span>Submit Payment for ${amount.toLocaleString()}</span>
                </>
              )}
            </button>

            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center", marginTop: "0.5rem" }}>
              PCI-DSS Compliant. Fully encrypted connection.
            </p>
          </form>
        )}
      </div>
    </div>
  );
};
