import fs from "fs";
import path from "path";

export interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
}

export interface Invoice {
  id: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  amount: number;
  currency: string;
  status: "Pending" | "Paid" | "Overdue";
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  paidAt?: string;
  stripePaymentIntentId?: string;
}

export interface ClientProfile {
  id: string;
  name: string;
  email: string;
  address: string;
}

const DATA_FILE = path.join(process.cwd(), "src/lib/data.json");

const DEFAULT_CLIENTS: ClientProfile[] = [
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
];

const DEFAULT_INVOICES: Invoice[] = [
  {
    id: "INV-8901",
    clientName: "Acme Corporation",
    clientEmail: "billing@acme.com",
    clientAddress: "123 Industrial Way, Suite A, New York, NY 10001",
    amount: 15000,
    currency: "USD",
    status: "Pending",
    issueDate: "2026-05-15",
    dueDate: "2026-06-15",
    items: [
      {
        description: "Nexus Security Review & Penetration Testing",
        quantity: 1,
        rate: 15000,
      },
    ],
  },
  {
    id: "INV-4412",
    clientName: "Globex Corp",
    clientEmail: "billing@globex.com",
    clientAddress: "456 Innovation Blvd, Tech Center, San Francisco, CA 94107",
    amount: 32500,
    currency: "USD",
    status: "Paid",
    issueDate: "2026-05-01",
    dueDate: "2026-05-31",
    items: [
      {
        description: "Cloud Architecture Design & Migration Services",
        quantity: 1,
        rate: 25000,
      },
      {
        description: "Kubernetes Hardening & IAM Setup",
        quantity: 1,
        rate: 7500,
      },
    ],
    paidAt: "2026-05-20T14:32:00Z",
    stripePaymentIntentId: "pi_mock_12345abcdef",
  },
  {
    id: "INV-7203",
    clientName: "Acme Corporation",
    clientEmail: "billing@acme.com",
    clientAddress: "123 Industrial Way, Suite A, New York, NY 10001",
    amount: 5200,
    currency: "USD",
    status: "Overdue",
    issueDate: "2026-04-10",
    dueDate: "2026-05-10",
    items: [
      {
        description: "Prodesk IT Vulnerability Advisory Service",
        quantity: 1,
        rate: 5200,
      },
    ],
  },
];

function initDb() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    const data = {
      clients: DEFAULT_CLIENTS,
      invoices: DEFAULT_INVOICES,
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  }
}

export function getDbData(): { clients: ClientProfile[]; invoices: Invoice[] } {
  initDb();
  try {
    const content = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error("Error reading mock DB:", error);
    return { clients: DEFAULT_CLIENTS, invoices: DEFAULT_INVOICES };
  }
}

export function saveDbData(data: { clients: ClientProfile[]; invoices: Invoice[] }) {
  initDb();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving mock DB:", error);
  }
}

export function getInvoices(): Invoice[] {
  return getDbData().invoices;
}

export function getInvoiceById(id: string): Invoice | undefined {
  return getInvoices().find((inv) => inv.id === id);
}

export function getClients(): ClientProfile[] {
  return getDbData().clients;
}

export function createInvoice(invoice: Omit<Invoice, "status" | "paidAt" | "stripePaymentIntentId">): Invoice {
  const data = getDbData();
  const newInvoice: Invoice = {
    ...invoice,
    status: "Pending",
  };
  data.invoices.unshift(newInvoice); // Add to beginning
  saveDbData(data);
  return newInvoice;
}

export function updateInvoiceStatus(id: string, status: "Pending" | "Paid" | "Overdue", stripePaymentIntentId?: string): boolean {
  const data = getDbData();
  const invoiceIndex = data.invoices.findIndex((inv) => inv.id === id);
  if (invoiceIndex === -1) return false;

  data.invoices[invoiceIndex].status = status;
  if (status === "Paid") {
    data.invoices[invoiceIndex].paidAt = new Date().toISOString();
    data.invoices[invoiceIndex].stripePaymentIntentId = stripePaymentIntentId || `pi_mock_${Math.random().toString(36).substring(2)}`;
  } else {
    delete data.invoices[invoiceIndex].paidAt;
    delete data.invoices[invoiceIndex].stripePaymentIntentId;
  }

  saveDbData(data);
  return true;
}
