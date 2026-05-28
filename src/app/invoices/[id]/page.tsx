"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { 
  Building, ArrowLeft, Download, CreditCard, Lock, Loader, 
  AlertTriangle, CheckCircle, Shield 
} from "@/components/Icons";
import { CheckoutModal } from "@/components/CheckoutModal";
import { Confetti } from "@/components/Confetti";
import { Invoice } from "@/lib/mockDb";

type Props = {
  params: Promise<{ id: string }>
}

export default function InvoiceDetailPage(props: Props) {
  const resolvedParams = use(props.params);
  const id = resolvedParams.id;

  const { user } = useAuth();
  const router = useRouter();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Checkout & Confetti state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const fetchInvoice = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/invoices?id=${id}`, {
        headers: {
          "x-user-role": user.role,
          "x-user-email": user.email,
        },
      });

      if (!res.ok) {
        if (res.status === 403) {
          router.replace("/403");
          return;
        }
        throw new Error("Failed to load invoice details");
      }

      const data = await res.json();
      setInvoice(data);
    } catch (err: any) {
      setError(err.message || "Failed to load invoice records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [user, id]);

  const handleDownloadPDF = async () => {
    if (!user || !invoice) return;
    setIsDownloading(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/pdf`, {
        headers: {
          "x-user-role": user.role,
          "x-user-email": user.email,
        },
      });

      if (!res.ok) throw new Error("Could not construct PDF from ledger");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nexus_invoice_${invoice.id.toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || "Error generating document vault file.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setIsCheckoutOpen(false);
    setShowConfetti(true);
    // Refresh invoice details
    fetchInvoice();
  };

  const handleBack = () => {
    if (user?.role === "admin") {
      router.push("/admin/dashboard");
    } else {
      router.push("/client/dashboard");
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <Loader className="animate-spin text-primary" size={32} style={{ marginBottom: "1rem" }} />
          <p>Decrypting invoice file...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", padding: "1.5rem" }}>
        <div className="glass-card" style={{ maxWidth: "480px", width: "100%", textAlign: "center", padding: "2.5rem" }}>
          <AlertTriangle size={40} style={{ color: "#ef4444", marginBottom: "1rem" }} />
          <h2>Invoice Access Violation</h2>
          <p style={{ margin: "0.5rem 0 1.5rem 0" }}>{error || "Invoice record not found."}</p>
          <button onClick={handleBack} className="btn btn-secondary" style={{ width: "100%" }}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const subtotal = invoice.items.reduce((sum, item) => sum + item.quantity * item.rate, 0);

  return (
    <div style={{ minHeight: "100vh", padding: "2.5rem 1.5rem" }}>
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />

      <div style={{ maxWidth: "840px", margin: "0 auto" }}>
        {/* Navigation back and quick actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2rem",
          }}
        >
          <button
            onClick={handleBack}
            className="btn btn-secondary"
            style={{ borderRadius: "8px", padding: "0.5rem 1rem", gap: "0.4rem" }}
          >
            <ArrowLeft size={16} />
            <span>Dashboard</span>
          </button>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="btn btn-secondary"
              style={{ gap: "0.4rem" }}
            >
              {isDownloading ? (
                <Loader className="animate-spin" size={16} />
              ) : (
                <Download size={16} />
              )}
              <span>Download PDF</span>
            </button>

            {invoice.status !== "Paid" && user?.role === "client" && (
              <button
                onClick={() => setIsCheckoutOpen(true)}
                className="btn btn-primary"
                style={{ background: "#10b981", boxShadow: "0 4px 14px rgba(16, 185, 129, 0.2)", gap: "0.4rem" }}
              >
                <CreditCard size={16} />
                <span>Pay Invoice</span>
              </button>
            )}
          </div>
        </div>

        {/* Invoice Statement Sheet */}
        <div
          className="glass-card"
          style={{
            padding: "3.5rem",
            position: "relative",
            background: "#0d0d12",
            borderColor: "rgba(255,255,255,0.05)",
            boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
            overflow: "hidden",
          }}
        >
          {/* PAID STAMP */}
          {invoice.status === "Paid" && (
            <div className="stamp-container">
              <div className="rubber-stamp stamp-paid">PAID</div>
            </div>
          )}
          {invoice.status === "Pending" && (
            <div className="stamp-container">
              <div className="rubber-stamp stamp-pending">PENDING</div>
            </div>
          )}
          {invoice.status === "Overdue" && (
            <div className="stamp-container">
              <div className="rubber-stamp stamp-overdue">OVERDUE</div>
            </div>
          )}

          {/* Letterhead */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              borderBottom: "1px solid var(--border-card)",
              paddingBottom: "2rem",
              marginBottom: "2.5rem",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <Shield size={22} style={{ color: "#8b5cf6" }} />
                <h3 style={{ fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.01em" }}>
                  NEXUS CORPORATE SERVICES
                </h3>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: "1.4" }}>
                Financial Core Security Audit Division<br />
                500 Fifth Avenue, Suite 4500<br />
                New York, NY 10110, USA
              </p>
            </div>

            <div style={{ textAlign: "right" }}>
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Statement Ref
              </span>
              <h2 style={{ fontFamily: "var(--font-mono)", fontSize: "1.75rem", color: "var(--text-primary)", margin: "0.1rem 0" }}>
                {invoice.id}
              </h2>
              <span
                className={`badge ${
                  invoice.status === "Paid"
                    ? "badge-paid"
                    : invoice.status === "Pending"
                    ? "badge-pending"
                    : "badge-overdue"
                }`}
                style={{ marginTop: "0.25rem" }}
              >
                {invoice.status}
              </span>
            </div>
          </div>

          {/* Metadata: Issuer and Bill To details */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "2rem",
              marginBottom: "3rem",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  display: "block",
                  marginBottom: "0.5rem",
                }}
              >
                Prepared For
              </span>
              <strong style={{ fontSize: "1rem", color: "var(--text-primary)", display: "block" }}>
                {invoice.clientName}
              </strong>
              <p style={{ fontSize: "0.85rem", marginTop: "0.25rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                {invoice.clientAddress || "Corporate Registered HQ"}<br />
                Contact: {invoice.clientEmail}
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    display: "block",
                    marginBottom: "0.25rem",
                  }}
                >
                  Date Issued
                </span>
                <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: 500 }}>
                  {invoice.issueDate}
                </span>
              </div>

              <div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    display: "block",
                    marginBottom: "0.25rem",
                  }}
                >
                  Due Date
                </span>
                <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: 500 }}>
                  {invoice.dueDate}
                </span>
              </div>

              {invoice.paidAt && (
                <div style={{ gridColumn: "span 2" }}>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      display: "block",
                      marginBottom: "0.25rem",
                    }}
                  >
                    Settled On
                  </span>
                  <span style={{ fontSize: "0.85rem", color: "#10b981", fontWeight: 600 }}>
                    {new Date(invoice.paidAt).toLocaleDateString()} via Stripe Network
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Itemized Table */}
          <div style={{ border: "1px solid var(--border-card)", borderRadius: "8px", overflow: "hidden", marginBottom: "2rem" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border-card)" }}>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 500, color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase" }}>
                    Service Charge Breakdown
                  </th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 500, color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase", textAlign: "center", width: "80px" }}>
                    Qty
                  </th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 500, color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase", textAlign: "right", width: "120px" }}>
                    Rate
                  </th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 500, color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase", textAlign: "right", width: "140px" }}>
                    Line Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: idx === invoice.items.length - 1 ? "none" : "1px solid var(--border-card)" }}>
                    <td style={{ padding: "1rem", fontWeight: 500, color: "var(--text-primary)" }}>
                      {item.description}
                    </td>
                    <td style={{ padding: "1rem", color: "var(--text-secondary)", textAlign: "center" }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: "1rem", color: "var(--text-secondary)", textAlign: "right" }}>
                      ${item.rate.toLocaleString()}
                    </td>
                    <td style={{ padding: "1rem", fontWeight: 500, color: "var(--text-primary)", textAlign: "right" }}>
                      ${(item.quantity * item.rate).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div style={{ width: "280px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", fontSize: "0.9rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>Subtotal:</span>
                <span style={{ fontWeight: 500 }}>${subtotal.toLocaleString()} USD</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", fontSize: "0.9rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>Stripe Processing:</span>
                <span style={{ fontWeight: 500 }}>$0.00 USD</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "0.75rem 0",
                  borderTop: "1px solid var(--border-card)",
                  marginTop: "0.5rem",
                }}
              >
                <strong style={{ fontSize: "1rem" }}>Total Invoiced:</strong>
                <strong style={{ fontSize: "1.1rem", color: "#8b5cf6" }}>
                  ${invoice.amount.toLocaleString()} USD
                </strong>
              </div>
            </div>
          </div>

          {/* Terms & compliance sign-off */}
          <div
            style={{
              marginTop: "4rem",
              borderTop: "1px solid var(--border-card)",
              paddingTop: "1.5rem",
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              lineHeight: "1.5",
            }}
          >
            <p style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
              Nexus Corporate Services Compliance & Security Policy
            </p>
            <p>
              This invoice contains high-value cybersecurity and architectural review scopes. All payments settled via Stripe Credit Card elements are instant. Invoices are cryptographic proof of settlement, backed by decentralized compliance ledger logs. Incidents or queries regarding payment security should be escalated to Mr. Nakul (IT Management).
            </p>
          </div>
        </div>
      </div>

      {/* Checkout Modal Frame */}
      {isCheckoutOpen && invoice && (
        <CheckoutModal
          invoiceId={invoice.id}
          amount={invoice.amount}
          clientEmail={invoice.clientEmail}
          onSuccess={handlePaymentSuccess}
          onClose={() => setIsCheckoutOpen(false)}
        />
      )}
    </div>
  );
}
