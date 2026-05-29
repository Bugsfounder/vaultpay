"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

import { Invoice } from "@/lib/mockDb";

export default function ClientDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Paid" | "Pending" | "Overdue">("All");

  const fetchClientInvoices = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/invoices", {
        headers: {
          "x-user-role": user.role,
          "x-user-email": user.email,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch client invoices");
      const data: Invoice[] = await res.json();

      // Local persistence overrides for stateless environments (e.g. Vercel)
      const createdList: Invoice[] = JSON.parse(localStorage.getItem("vaultpay_created_invoices") || "[]");
      const clientCreated = createdList.filter(inv => inv.clientEmail.toLowerCase() === user.email.toLowerCase());

      // Combine lists, avoiding duplicates
      const allInvoices = [...data];
      clientCreated.forEach((cInv) => {
        if (!allInvoices.some((inv) => inv.id === cInv.id)) {
          allInvoices.unshift(cInv);
        }
      });

      const paidList: string[] = JSON.parse(localStorage.getItem("vaultpay_paid_invoices") || "[]");
      const todayStr = new Date().toISOString().split("T")[0];
      allInvoices.forEach((inv) => {
        if (paidList.includes(inv.id)) {
          inv.status = "Paid";
          if (!inv.paidAt) {
            inv.paidAt = new Date().toISOString();
          }
        } else if (inv.status === "Pending" && inv.dueDate < todayStr) {
          inv.status = "Overdue";
        }
      });

      setInvoices(allInvoices);
    } catch (err: any) {
      setError(err.message || "An error occurred while loading your billing details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientInvoices();
  }, [user]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  // Calculations
  const paidInvoices = invoices.filter((i) => i.status === "Paid");
  const outstandingInvoices = invoices.filter((i) => i.status === "Pending");
  const overdueInvoices = invoices.filter((i) => i.status === "Overdue");

  const totalPaid = paidInvoices.reduce((sum, i) => sum + i.amount, 0);
  const totalOutstanding = outstandingInvoices.reduce((sum, i) => sum + i.amount, 0) + overdueInvoices.reduce((sum, i) => sum + i.amount, 0);

  // Filters & Search
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.items.some((item) => item.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "All" ? true : inv.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Top Navbar */}
      <header
        style={{
          borderBottom: "1px solid var(--border-card)",
          background: "rgba(10, 10, 15, 0.8)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "1rem 1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "white" }}>Nexus VaultPay</h2>
              <span style={{ fontSize: "0.75rem", letterSpacing: "0.05em", color: "white" }}>
                SECURED CLIENT PORTAL
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "rgba(0, 0, 0, 0.03)",
                border: "1px solid var(--border-card)",
                padding: "0.4rem 0.8rem",
                borderRadius: "20px",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#10b981",
                  boxShadow: "0 0 8px #10b981",
                }}
              />
              <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>
                {user?.clientProfile?.name}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", borderRadius: "20px", gap: "0.4rem" }}
            >
              <span>Disconnect</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="main-content">
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 700 }}>Corporate Billing History</h1>
          <p style={{ fontSize: "0.95rem" }}>
            Manage outstanding balances, review consultation itemizations, and submit secure credit card payments.
          </p>
        </div>

        {/* Analytics Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.5rem",
            marginBottom: "2.5rem",
          }}
        >
          <div className="glass-card">
            <div style={{ color: "var(--color-pending)", marginBottom: "0.75rem" }}>
            </div>
            <p style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
              Outstanding Balance Due
            </p>
            <h2 style={{ fontSize: "2rem", fontWeight: 700, marginTop: "0.25rem" }}>
              ${totalOutstanding.toLocaleString()}
            </h2>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Requires immediate action
            </span>
          </div>

          <div className="glass-card">
            <div style={{ color: "var(--color-success)", marginBottom: "0.75rem" }}>
            </div>
            <p style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
              Total Fees Settled
            </p>
            <h2 style={{ fontSize: "2rem", fontWeight: 700, marginTop: "0.25rem" }}>
              ${totalPaid.toLocaleString()}
            </h2>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Securely receipted invoices
            </span>
          </div>
        </div>

        {/* Client Error Alert */}
        {error && (
          <div
            style={{
              padding: "1rem",
              background: "var(--color-danger-bg)",
              border: "1px solid var(--color-danger-border)",
              borderRadius: "8px",
              color: "var(--color-danger)",
              marginBottom: "1.5rem",
            }}
          >
            <span>{error}</span>
          </div>
        )}

        {/* Search & Filter toolbar */}
        <div
          className="glass-card"
          style={{
            padding: "1rem 1.25rem",
            marginBottom: "1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              background: "#ffffff",
              border: "1px solid var(--border-card)",
              borderRadius: "8px",
              padding: "0.4rem 0.8rem",
              minWidth: "280px",
              width: "100%",
              maxWidth: "360px",
            }}
          >

            <input
              type="text"
              placeholder="Search by invoice ID or item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-primary)",
                fontSize: "0.9rem",
                width: "100%",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            {(["All", "Paid", "Pending", "Overdue"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`btn ${statusFilter === filter ? "btn-primary" : "btn-secondary"}`}
                style={{
                  padding: "0.4rem 1rem",
                  fontSize: "0.85rem",
                  borderRadius: "6px",
                  boxShadow: "none",
                  border: statusFilter === filter ? "none" : "1px solid var(--border-card)",
                  background: statusFilter === filter ? "var(--color-success)" : "#f1f5f9",
                }}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Invoices List */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem 0" }}>
            <p>Loading secure billing ledger...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div
            className="glass-card"
            style={{
              textAlign: "center",
              padding: "4rem 2rem",
              borderStyle: "dashed",
              borderColor: "var(--border-card)",
            }}
          >

            <h3>No invoices listed</h3>
            <p style={{ fontSize: "0.9rem", marginTop: "0.25rem" }}>
              Your account does not have any invoices under this category.
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Statement Description</th>
                  <th>Date Issued</th>
                  <th>Due Date</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ fontFamily: "var(--font-mono)", fontWeight: 500, color: "#10b981" }}>
                      {inv.id}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, maxWidth: "320px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {inv.items[0]?.description || "Consultation Fees"}
                        {inv.items.length > 1 && ` (+${inv.items.length - 1} more items)`}
                      </div>
                    </td>
                    <td>{inv.issueDate}</td>
                    <td>{inv.dueDate}</td>
                    <td style={{ fontWeight: 600 }}>
                      ${inv.amount.toLocaleString()}
                    </td>
                    <td>
                      <span
                        className={`badge ${inv.status === "Paid"
                          ? "badge-paid"
                          : inv.status === "Pending"
                            ? "badge-pending"
                            : "badge-overdue"
                          }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => router.push(`/invoices/${inv.id}`)}
                        className="btn btn-secondary"
                        style={{
                          padding: "0.35rem 0.75rem",
                          fontSize: "0.8rem",
                          borderRadius: "6px",
                          gap: "0.3rem",
                          borderColor: inv.status !== "Paid" ? "var(--color-success-border)" : "var(--border-card)",
                          color: inv.status !== "Paid" ? "#10b981" : "var(--text-primary)",
                        }}
                      >
                        <span>{inv.status === "Paid" ? "View Receipt" : "Review & Pay"}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
