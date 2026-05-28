import { NextRequest, NextResponse } from "next/server";
import { getInvoices, getInvoiceById, createInvoice } from "@/lib/mockDb";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  // Retrieve user headers to simulate Zero-Trust verification
  const role = req.headers.get("x-user-role");
  const email = req.headers.get("x-user-email");

  if (!role || !email) {
    return NextResponse.json({ error: "Unauthorized: Missing authentication details" }, { status: 401 });
  }

  // Handle single invoice request (IDOR check)
  if (id) {
    const invoice = getInvoiceById(id);
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // IDOR Protection: client can only read their own invoices
    if (role === "client" && invoice.clientEmail.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: "Forbidden: You do not own this resource" }, { status: 403 });
    }

    // Ensure it's admin or the invoice owner
    if (role !== "admin" && invoice.clientEmail.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(invoice);
  }

  // Handle get all invoices
  const allInvoices = getInvoices();
  if (role === "admin") {
    return NextResponse.json(allInvoices);
  } else if (role === "client") {
    // Return only client-specific invoices
    const clientInvoices = allInvoices.filter(
      (inv) => inv.clientEmail.toLowerCase() === email.toLowerCase()
    );
    return NextResponse.json(clientInvoices);
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { clientName, clientEmail, clientAddress, items, issueDate, dueDate } = body;

    if (!clientName || !clientEmail || !items || items.length === 0) {
      return NextResponse.json({ error: "Bad Request: Missing required fields" }, { status: 400 });
    }

    // Calculate total amount
    const amount = items.reduce((sum: number, item: any) => sum + item.quantity * item.rate, 0);

    // Generate random 4 digit invoice ID
    const randomId = `INV-${Math.floor(1000 + Math.random() * 9000)}`;

    const newInvoice = createInvoice({
      id: randomId,
      clientName,
      clientEmail,
      clientAddress: clientAddress || "",
      amount,
      currency: "USD",
      issueDate: issueDate || new Date().toISOString().split("T")[0],
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      items,
    });

    return NextResponse.json(newInvoice, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
