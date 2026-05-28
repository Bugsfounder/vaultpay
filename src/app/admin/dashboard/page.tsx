"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { 
  Building, LogOut, Plus, DollarSign, Calendar, Clock, 
  ArrowRight, Shield, Loader, CheckCircle, Search, AlertTriangle 
} from "@/components/Icons";
import { Invoice, ClientProfile } from "@/lib/mockDb";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Paid" | "Pending" | "Overdue">("All");

  // Create Invoice Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  // Invoice Form Fields
  const [selectedClientId, setSelectedClientId] = useState("");
  const [customClientName, setCustomClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState<{ description: string; quantity: number; rate: number }[]>([
    { description: "", quantity: 1, rate: 0 },
  ]);

  // Set default dates on load
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    setIssueDate(today);
    setDueDate(in30Days);
  }, []);

  // Fetch Invoices and Clients
  const fetchDashboardData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError("");
      
      // Fetch Invoices
      const invRes = await fetch("/api/invoices", {
        headers: {
          "x-user-role": user.role,
          "x-user-email": user.email,
        },
      });
      if (!invRes.ok) throw new Error("Failed to fetch invoices");
      const invData = await invRes.json();
      setInvoices(invData);

      // Pre-seed clients from a quick client fetch or mock details
      setClients([
        {
          id: "client-acme",
          name: "Acme Corporation",
          email: "billing@acme.com",
          address: "123 Industrial Way, Suite A, New York, NY 10001",
        },
        {
          id: "client-globex",
          name: "Globex Corp",
          email: "billing@globex.com",
          address: "456 Innovation Blvd, Tech Center, San Francisco, CA 94107",
        },
      ]);
    } catch (err: any) {
      setError(err.message || "An error occurred while loading dashboard metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  // Handle client selection change to pre-fill email/address
  useEffect(() => {
    if (selectedClientId === "new") {
      setCustomClientName("");
      setClientEmail("");
      setClientAddress("");
    } else {
      const client = clients.find((c) => c.id === selectedClientId);
      if (client) {
        setCustomClientName(client.name);
        setClientEmail(client.email);
        setClientAddress(client.address);
      }
    }
  }, [selectedClientId, clients]);

  // Calculations
  const paidInvoices = invoices.filter((i) => i.status === "Paid");
  const outstandingInvoices = invoices.filter((i) => i.status === "Pending");
  const overdueInvoices = invoices.filter((i) => i.status === "Overdue");

  const totalRevenue = paidInvoices.reduce((sum, i) => sum + i.amount, 0);
  const totalOutstanding = outstandingInvoices.reduce((sum, i) => sum + i.amount, 0) + overdueInvoices.reduce((sum, i) => sum + i.amount, 0);
  const totalInvoiced = totalRevenue + totalOutstanding;
  const collectionRate = totalInvoiced > 0 ? Math.round((totalRevenue / totalInvoiced) * 100) : 0;

  // Add Item Line
  const handleAddItemLine = () => {
    setItems([...items, { description: "", quantity: 1, rate: 0 }]);
  };

  // Remove Item Line
  const handleRemoveItemLine = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  // Handle Item Input Change
  const handleItemChange = (index: number, field: "description" | "quantity" | "rate", value: any) => {
    const updated = [...items];
    if (field === "quantity") {
      updated[index].quantity = parseInt(value) || 0;
    } else if (field === "rate") {
      updated[index].rate = parseFloat(value) || 0;
    } else {
      updated[index].description = value;
    }
    setItems(updated);
  };

  // Submit Invoice Creation Form
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!customClientName) {
      setModalError("Please select a client or enter a client name.");
      return;
    }
    if (!clientEmail || !clientEmail.includes("@")) {
      setModalError("Please enter a valid client billing email.");
      return;
    }
    
    // Validate Items
    const invalidItems = items.some((item) => !item.description || item.quantity <= 0 || item.rate <= 0);
    if (invalidItems) {
      setModalError("Please complete all line items with descriptions, positive quantities, and rates.");
      return;
    }

    setModalError("");
    setModalLoading(true);

    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": user.role,
          "x-user-email": user.email,
        },
        body: JSON.stringify({
          clientName: customClientName,
          clientEmail,
          clientAddress,
          issueDate,
          dueDate,
          items,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to generate invoice");
      }

      // Refresh invoices
      await fetchDashboardData();
      
      // Close Modal and Reset fields
      setIsModalOpen(false);
      setSelectedClientId("");
      setCustomClientName("");
      setClientEmail("");
      setClientAddress("");
      setItems([{ description: "", quantity: 1, rate: 0 }]);
    } catch (err: any) {
      setModalError(err.message || "Server rejected invoice generation request.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  // Filter and search invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch = 
      inv.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
      inv.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.clientEmail.toLowerCase().includes(searchQuery.toLowerCase());
      
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
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "var(--color-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 0 15px var(--color-primary-glow)",
              }}
            >
              <Shield size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Nexus VaultPay</h2>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", letterSpacing: "0.05em" }}>
                FINANCIAL CORE CLIENT PORTAL
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "rgba(255, 255, 255, 0.03)",
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
                  background: "var(--color-primary)",
                  boxShadow: "0 0 8px var(--color-primary)",
                }}
              />
              <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>
                {user?.name} (CFO)
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", borderRadius: "20px", gap: "0.4rem" }}
            >
              <LogOut size={14} />
              <span>Disconnect</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="main-content">
        {/* Page title and create button */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2rem",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 700 }}>Administrative Ledger</h1>
            <p style={{ fontSize: "0.95rem" }}>Generate client invoices, track collections, and verify financial compliance.</p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary"
            style={{ borderRadius: "8px", gap: "0.5rem" }}
          >
            <Plus size={18} />
            <span>Generate Invoice</span>
          </button>
        </div>

        {/* Analytics Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "1.5rem",
            marginBottom: "2.5rem",
          }}
        >
          <div className="glass-card" style={{ position: "relative", overflow: "hidden" }}>
            <div style={{ color: "var(--color-success)", marginBottom: "0.75rem" }}>
              <DollarSign size={24} />
            </div>
            <p style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
              Total Revenue (Collected)
            </p>
            <h2 style={{ fontSize: "2rem", fontWeight: 700, marginTop: "0.25rem" }}>
              ${totalRevenue.toLocaleString()}
            </h2>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Cleared through Stripe Network
            </span>
          </div>

          <div className="glass-card">
            <div style={{ color: "var(--color-pending)", marginBottom: "0.75rem" }}>
              <Clock size={24} />
            </div>
            <p style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
              Outstanding Balance
            </p>
            <h2 style={{ fontSize: "2rem", fontWeight: 700, marginTop: "0.25rem" }}>
              ${totalOutstanding.toLocaleString()}
            </h2>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Pending + Overdue accounts
            </span>
          </div>

          <div className="glass-card">
            <div style={{ color: "#8b5cf6", marginBottom: "0.75rem" }}>
              <CheckCircle size={24} />
            </div>
            <p style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
              Accounts Receivable Rate
            </p>
            <h2 style={{ fontSize: "2rem", fontWeight: 700, marginTop: "0.25rem" }}>
              {collectionRate}%
            </h2>
            <div
              style={{
                width: "100%",
                height: "6px",
                background: "rgba(255, 255, 255, 0.05)",
                borderRadius: "3px",
                marginTop: "0.5rem",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${collectionRate}%`,
                  background: "linear-gradient(90deg, #8b5cf6, #10b981)",
                  borderRadius: "3px",
                }}
              />
            </div>
          </div>
        </div>

        {/* Dashboard Error Alert */}
        {error && (
          <div
            style={{
              padding: "1rem",
              background: "var(--color-danger-bg)",
              border: "1px solid var(--color-danger-border)",
              borderRadius: "8px",
              color: "#f87171",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <AlertTriangle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Filters and Search toolbar */}
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
              background: "rgba(0, 0, 0, 0.2)",
              border: "1px solid var(--border-card)",
              borderRadius: "8px",
              padding: "0.4rem 0.8rem",
              minWidth: "280px",
              width: "100%",
              maxWidth: "360px",
            }}
          >
            <Search size={18} style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search by invoice ID, client name..."
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
                  boxShadow: statusFilter === filter ? "0 2px 8px var(--color-primary-glow)" : "none",
                  border: statusFilter === filter ? "none" : "1px solid rgba(255, 255, 255, 0.05)",
                }}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Ledger Table */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem 0" }}>
            <Loader className="animate-spin text-primary" size={32} style={{ margin: "0 auto 1rem auto" }} />
            <p>Decrypting secure ledger records...</p>
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
            <Building size={40} style={{ color: "var(--text-muted)", marginBottom: "1rem", opacity: 0.5 }} />
            <h3>No invoice records found</h3>
            <p style={{ fontSize: "0.9rem", marginTop: "0.25rem" }}>
              Try broadening your filters or create a new invoice to get started.
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Client</th>
                  <th>Date</th>
                  <th>Due Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ fontFamily: "var(--font-mono)", fontWeight: 500, color: "#8b5cf6" }}>
                      {inv.id}
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 500 }}>{inv.clientName}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {inv.clientEmail}
                        </div>
                      </div>
                    </td>
                    <td>{inv.issueDate}</td>
                    <td>{inv.dueDate}</td>
                    <td style={{ fontWeight: 600 }}>
                      ${inv.amount.toLocaleString()}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          inv.status === "Paid"
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
                        }}
                      >
                        <span>Details</span>
                        <ArrowRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Create Invoice Modal Drawer */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            padding: "1.5rem",
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: "680px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "2.5rem",
              background: "#0d0d12",
              borderColor: "rgba(124, 58, 237, 0.2)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
              <div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Generate Client Invoice</h2>
                <p style={{ fontSize: "0.85rem" }}>Fill in items and dates. Invoices are stored in compliance ledger.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="btn btn-secondary"
                style={{ padding: "0.4rem 0.75rem", borderRadius: "6px" }}
              >
                Cancel
              </button>
            </div>

            {modalError && (
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
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateInvoice}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Client Workspace Selection</label>
                  <select
                    className="form-select"
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                  >
                    <option value="">-- Choose Client --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                    <option value="new">+ Dynamic Client</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Corporate Client Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Company Name"
                    value={customClientName}
                    onChange={(e) => setCustomClientName(e.target.value)}
                    disabled={selectedClientId !== "" && selectedClientId !== "new"}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Billing Officer Email</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="billing@company.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  disabled={selectedClientId !== "" && selectedClientId !== "new"}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Corporate Registered Address</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Street Address, City, ZIP, Country"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  disabled={selectedClientId !== "" && selectedClientId !== "new"}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Date of Issue</label>
                  <input
                    type="date"
                    className="form-input"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Compliance Due Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Line Items */}
              <div style={{ margin: "1.5rem 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <label className="form-label" style={{ margin: 0 }}>Itemized Charges</label>
                  <button
                    type="button"
                    onClick={handleAddItemLine}
                    className="btn btn-secondary"
                    style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem", borderRadius: "4px", gap: "0.25rem" }}
                  >
                    <Plus size={12} />
                    <span>Line Item</span>
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {items.map((item, index) => (
                    <div key={index} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
                      <div className="form-group" style={{ flex: 3, margin: 0 }}>
                        <input
                          type="text"
                          placeholder="Audit description / consultation scope"
                          className="form-input"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, "description", e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ width: "80px", margin: 0 }}>
                        <input
                          type="number"
                          placeholder="Qty"
                          min="1"
                          className="form-input"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ width: "120px", margin: 0 }}>
                        <input
                          type="number"
                          placeholder="Rate ($)"
                          min="0"
                          step="0.01"
                          className="form-input"
                          value={item.rate || ""}
                          onChange={(e) => handleItemChange(index, "rate", e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItemLine(index)}
                        disabled={items.length === 1}
                        className="btn btn-secondary"
                        style={{
                          padding: "0.75rem",
                          border: "1px solid var(--color-danger-border)",
                          color: "#ef4444",
                          background: "transparent",
                          height: "44px",
                          width: "44px",
                          borderRadius: "8px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  borderTop: "1px solid var(--border-card)",
                  paddingTop: "1.5rem",
                  marginTop: "1.5rem",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.75rem",
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="btn btn-primary"
                  style={{ gap: "0.5rem" }}
                >
                  {modalLoading ? (
                    <>
                      <Loader className="animate-spin" size={16} />
                      <span>Writing to Ledger...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      <span>Release Invoice</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
