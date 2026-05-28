import { NextRequest, NextResponse } from "next/server";
import { getInvoiceById, updateInvoiceStatus } from "@/lib/mockDb";

export async function POST(req: NextRequest) {
  // Retrieve user headers to simulate Zero-Trust verification
  const role = req.headers.get("x-user-role");
  const email = req.headers.get("x-user-email");

  if (!role || !email) {
    return NextResponse.json({ error: "Unauthorized: Missing credentials" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { invoiceId } = body;

    if (!invoiceId) {
      return NextResponse.json({ error: "Bad Request: Missing invoiceId" }, { status: 400 });
    }

    const invoice = getInvoiceById(invoiceId);
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // IDOR Protection: only the owner of the invoice or an admin can pay it
    if (role === "client" && invoice.clientEmail.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: "Forbidden: You do not own this invoice" }, { status: 403 });
    }

    if (invoice.status === "Paid") {
      return NextResponse.json({ error: "Bad Request: Invoice is already paid" }, { status: 400 });
    }

    // Simulate payment processing latency (e.g. 2000ms) to verify client double-click prevention
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Update status to Paid in our mock DB
    const success = updateInvoiceStatus(invoiceId, "Paid");

    if (success) {
      return NextResponse.json({
        success: true,
        message: "Payment processed successfully",
        transactionId: `tx_${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
      });
    } else {
      return NextResponse.json({ error: "Internal Server Error: Failed to update invoice status" }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
