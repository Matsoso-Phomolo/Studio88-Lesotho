import React, { useEffect, useState } from "react";
import { api } from "../api/api";
import BackButton from "../components/BackButton";

export default function WarrantyClaims({ onBackFallback }) {
  const [claims, setClaims] = useState([]);

  async function load() {
    setClaims(await api.getWarranty());
  }

  useEffect(() => {
    load();
  }, []);

  async function update(id, status) {
    await api.updateWarrantyStatus(id, status);
    load();
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6">
      <BackButton onFallback={onBackFallback} />
      <h1 className="text-3xl font-bold">Warranty Claims</h1>

      <div className="grid gap-4 mt-6">
        {claims.map((claim) => (
          <div key={claim.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="font-bold">{claim.customer_full_name}</h2>
            <p>{claim.customer_phone}</p>
            <p className="text-neutral-300 mt-2">{claim.reason}</p>
            <p className="mt-2">Status: {claim.status}</p>

            <div className="flex gap-2 mt-4">
              <button onClick={() => update(claim.id, "Approved")} className="bg-green-600 rounded-xl px-4 py-2">Approve</button>
              <button onClick={() => update(claim.id, "Rejected")} className="bg-red-600 rounded-xl px-4 py-2">Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
