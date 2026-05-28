import { NextRequest, NextResponse } from "next/server";
import { getInvoiceById } from "@/lib/mockDb";

type Props = {
  params: Promise<{ id: string }>
}

export async function GET(
  req: NextRequest,
  props: Props
) {
  const { id } = await props.params;

  // Retrieve user headers to simulate Zero-Trust verification
  const role = req.headers.get("x-user-role");
  const email = req.headers.get("x-user-email");

  if (!role || !email) {
    return NextResponse.json({ error: "Unauthorized: Missing authentication details" }, { status: 401 });
  }

  const invoice = getInvoiceById(id);
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // IDOR Protection: client can only download their own invoice PDF
  if (role === "client" && invoice.clientEmail.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ error: "Forbidden: You do not own this resource" }, { status: 403 });
  }

  if (role !== "admin" && invoice.clientEmail.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Generate a valid PDF stream in-memory without third-party dependencies
  const escapedClientName = invoice.clientName.replace(/[()]/g, "");
  const escapedRef = invoice.id.replace(/[()]/g, "");
  const escapedDate = invoice.issueDate.replace(/[()]/g, "");
  const escapedDueDate = invoice.dueDate.replace(/[()]/g, "");
  const escapedAmount = `$${invoice.amount.toLocaleString()} USD`;
  const escapedStatus = invoice.status.toUpperCase();

  let itemLines = "";
  invoice.items.forEach((item, index) => {
    const desc = item.description.replace(/[()]/g, "");
    const line = `0 -15 Td (${index + 1}. ${desc} | Qty: ${item.quantity} x $${item.rate} = $${item.quantity * item.rate}) Tj`;
    itemLines += `\n${line}`;
  });

  const stamp = invoice.status === "Paid" 
    ? `\n/F1 16 Tf\n0 -35 Td (RECEIVED WITH THANKS - PAYMENT STATUS: PAID) Tj`
    : `\n/F1 16 Tf\n0 -35 Td (PAYMENT STATUS: OUTSTANDING) Tj`;

  const streamContent = `BT
/F1 16 Tf
50 780 Td
(NEXUS CORPORATE SERVICES) Tj
/F1 10 Tf
0 -25 Td
(Invoice Reference: ${escapedRef}) Tj
0 -15 Td
(Client: ${escapedClientName}) Tj
0 -15 Td
(Billing Email: ${invoice.clientEmail}) Tj
0 -15 Td
(Date of Issue: ${escapedDate}) Tj
0 -15 Td
(Due Date: ${escapedDueDate}) Tj
0 -15 Td
(Amount: ${escapedAmount}) Tj
0 -15 Td
(Status: ${escapedStatus}) Tj
0 -25 Td
(Line Items:) Tj${itemLines}${stamp}
ET`;

  const streamLength = Buffer.byteLength(streamContent, "utf-8");

  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
endobj
5 0 obj
<< /Length ${streamLength} >>
stream
${streamContent}
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000242 00000 n 
0000000314 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${314 + 15 + streamLength}
%%EOF`;

  const buffer = Buffer.from(pdf, "utf-8");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=invoice_${invoice.id.toLowerCase()}.pdf`,
      "Content-Length": buffer.length.toString(),
    },
  });
}
