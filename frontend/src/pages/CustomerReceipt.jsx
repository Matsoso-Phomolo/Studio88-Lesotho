import React, { useEffect, useRef, useState } from "react";
import { api } from "../api/api";
import BackButton from "../components/BackButton";

function pdfText(value) {
  return String(value ?? "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function createReceiptPdf(receipt) {
  const { order, payment, store, policy } = receipt;
  const lines = [
    { text: "Studio 88 Lesotho", size: 20, gap: 28 },
    { text: `${store?.name || "Store"} - ${store?.location || ""}`, size: 11, gap: 24 },
    { text: `Order: ${order.order_number}`, size: 11, gap: 18 },
    { text: `Customer: ${order.customer_full_name}`, size: 11, gap: 18 },
    { text: `Phone: ${order.customer_phone}`, size: 11, gap: 18 },
    { text: `Status: ${order.status}`, size: 11, gap: 18 },
    { text: `Payment: ${payment?.payment_method || ""}`, size: 11, gap: 18 },
    { text: `Reference: ${payment?.provider_reference || ""}`, size: 11, gap: 24 },
    { text: "Items", size: 14, gap: 22 },
    ...order.items.flatMap((item) => [
      { text: item.product_name, size: 11, gap: 17 },
      { text: `Size: ${item.size_label} - Colour: ${item.colour_name}`, size: 10, gap: 15 },
      { text: `Qty: ${item.quantity} x M ${item.unit_price} = M ${item.subtotal}`, size: 10, gap: 20 },
    ]),
    { text: `Total: M ${order.total_amount}`, size: 16, gap: 26 },
    { text: policy, size: 10, gap: 16 },
  ];

  let y = 752;
  const content = [
    "BT",
    ...lines.flatMap((line, index) => {
      const commands = [
        `/F1 ${line.size} Tf`,
        index === 0 ? `40 ${y} Td` : `0 -${line.gap} Td`,
        `(${pdfText(line.text)}) Tj`,
      ];
      y -= line.gap;
      return commands;
    }),
    "ET",
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

export default function CustomerReceipt({ orderId, onBackFallback }) {
  const [receipt, setReceipt] = useState(null);
  const printRef = useRef();

  useEffect(() => {
    api.getReceipt(orderId).then(setReceipt);
  }, [orderId]);

  if (!receipt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-white">
        Loading receipt...
      </div>
    );
  }

  const { order, payment, store, policy } = receipt;

  function downloadReceipt() {
    const blob = createReceiptPdf(receipt);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `studio88-receipt-${order.order_number}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-neutral-950 p-6 text-white">
      <div className="mx-auto max-w-xl">
        <BackButton onFallback={onBackFallback} />
      </div>

      <div ref={printRef} className="mx-auto max-w-xl rounded-3xl bg-white p-6 text-black">
        <h1 className="text-3xl font-bold">Studio 88 Lesotho</h1>
        <p>{store?.name} - {store?.location}</p>

        <hr className="my-4" />

        <p><b>Order:</b> {order.order_number}</p>
        <p><b>Customer:</b> {order.customer_full_name}</p>
        <p><b>Phone:</b> {order.customer_phone}</p>
        <p><b>Status:</b> {order.status}</p>
        <p><b>Payment:</b> {payment?.payment_method}</p>
        <p><b>Reference:</b> {payment?.provider_reference}</p>

        <hr className="my-4" />

        {order.items.map((item) => (
          <div key={item.id} className="mb-3">
            <p><b>{item.product_name}</b></p>
            <p>Size: {item.size_label} - Colour: {item.colour_name}</p>
            <p>Qty: {item.quantity} x M {item.unit_price} = M {item.subtotal}</p>
          </div>
        ))}

        <hr className="my-4" />

        <h2 className="text-2xl font-bold">Total: M {order.total_amount}</h2>
        <p className="mt-4 text-sm font-bold">{policy}</p>
      </div>

      <div className="mx-auto mt-4 max-w-xl">
        <button onClick={downloadReceipt} className="w-full rounded-2xl bg-red-600 py-3 font-bold">
          Download Receipt
        </button>
      </div>
    </div>
  );
}
