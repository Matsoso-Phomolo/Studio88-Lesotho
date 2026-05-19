import React, { useEffect, useState } from "react";
import { Activity, Barcode, Database, Server, Users } from "lucide-react";

import { api } from "../api/api";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

function StatusCard({ title, value, subtitle, icon: Icon, ok }) {
  return (
    <Card className="rounded-3xl border border-white/10 bg-white/[0.04] text-white shadow-xl">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-neutral-400">{title}</p>
            <h3 className={`mt-2 text-2xl font-bold ${ok ? "text-green-400" : "text-red-400"}`}>{value}</h3>
            <p className="mt-2 text-xs text-neutral-500">{subtitle}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DeveloperDashboard({ user }) {
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [barcodeEdits, setBarcodeEdits] = useState({});
  const [status, setStatus] = useState({
    api: "Checking",
    database: "Checking",
    orders: 0,
  });
  const [error, setError] = useState("");

  async function loadData() {
    try {
      const [rootData, usersData, storesData, ordersData, productsData, auditLogData] = await Promise.all([
        api.root(),
        api.getUsers(),
        api.getStores(),
        api.getOrders(),
        api.getProducts(),
        api.getAuditLogs(),
      ]);

      setUsers(usersData);
      setProducts(productsData);
      setAuditLogs(auditLogData);
      setStatus({
        api: rootData?.message ? "Online" : "Unknown",
        database: storesData.length >= 0 ? "Connected" : "Unknown",
        orders: ordersData.length,
      });
      setError("");
    } catch (err) {
      console.error(err);
      setStatus((current) => ({ ...current, api: "Offline", database: "Unavailable" }));
      setError("Developer tools could not reach one or more backend services.");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const responsiblePerson = user?.full_name || "Matsoso Phomolo";

  async function saveBarcode(productId) {
    await api.updateProductBarcode(productId, barcodeEdits[productId] || "");
    await loadData();
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-7xl p-4 md:p-8">
        <div className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-r from-neutral-900 via-neutral-900 to-red-950 p-6 shadow-2xl">
          <Badge className="mb-4 rounded-full border border-red-400/30 bg-red-500/10 px-4 py-1 text-red-200">
            Developer Dashboard
          </Badge>
          <h1 className="text-3xl font-bold md:text-5xl">System administration tools</h1>
          <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-red-100">
            Responsible: {responsiblePerson}
          </p>
          <p className="mt-3 max-w-2xl text-neutral-300">
            Monitor API health, database connectivity, users, and maintenance readiness.
          </p>
        </div>

        {error && (
          <p className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-300">
            {error}
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <StatusCard title="API Status" value={status.api} subtitle="Backend root endpoint" icon={Server} ok={status.api === "Online"} />
          <StatusCard title="Database Status" value={status.database} subtitle="Validated via stores query" icon={Database} ok={status.database === "Connected"} />
          <StatusCard title="Users" value={users.length} subtitle="Registered stakeholders" icon={Users} ok />
          <StatusCard title="Orders" value={status.orders} subtitle="Operational records" icon={Activity} ok />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
          <Card className="rounded-3xl border border-white/10 bg-white/[0.04] text-white">
            <CardHeader className="p-5">
              <CardTitle>Users list</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-5 pt-0">
              {users.map((user) => (
                <div key={user.id} className="grid gap-2 rounded-2xl border border-white/10 bg-black/20 p-4 md:grid-cols-[1.2fr_1fr_.6fr_.5fr] md:items-center">
                  <div>
                    <div className="font-semibold">{user.full_name}</div>
                    <div className="text-sm text-neutral-400">{user.email}</div>
                  </div>
                  <div className="text-sm text-neutral-300">{user.role}</div>
                  <div className="text-sm text-neutral-300">Store: {user.store_id || "None"}</div>
                  <span className="w-fit rounded-full bg-white/10 px-3 py-1 text-sm">{user.is_active ? "Active" : "Inactive"}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-white/10 bg-white/[0.04] text-white">
            <CardHeader className="p-5">
              <CardTitle>Maintenance panel</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-5 pt-0">
              <button onClick={loadData} className="rounded-2xl bg-white px-4 py-3 font-semibold text-black">
                Refresh system status
              </button>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-neutral-300">
                Database backups, user provisioning, seed scripts, and API diagnostics can be managed from backend tools.
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-neutral-300">
                Current environment: {import.meta.env.VITE_API_BASE_URL || "API URL not configured"}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <Card className="rounded-3xl border border-white/10 bg-white/[0.04] text-white">
            <CardHeader className="p-5">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-red-300" /> Audit logs
              </CardTitle>
            </CardHeader>
            <CardContent className="grid max-h-[520px] gap-3 overflow-auto p-5 pt-0">
              {auditLogs.map((log) => (
                <div key={log.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="font-semibold">{log.action}</div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs">{log.user_role}</span>
                  </div>
                  <p className="mt-1 text-sm text-neutral-400">{log.description}</p>
                  <p className="mt-2 text-xs text-neutral-500">{log.user_email} - {new Date(log.created_at).toLocaleString()}</p>
                </div>
              ))}
              {auditLogs.length === 0 && <p className="text-sm text-neutral-400">No audit logs yet.</p>}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-white/10 bg-white/[0.04] text-white">
            <CardHeader className="p-5">
              <CardTitle className="flex items-center gap-2">
                <Barcode className="h-5 w-5 text-red-300" /> Barcode foundation
              </CardTitle>
            </CardHeader>
            <CardContent className="grid max-h-[520px] gap-3 overflow-auto p-5 pt-0">
              {products.map((product) => (
                <div key={product.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="font-semibold">{product.name}</div>
                  <div className="text-sm text-neutral-400">{product.brand}</div>
                  <div className="mt-3 flex gap-2">
                    <input
                      value={barcodeEdits[product.id] ?? product.barcode ?? `ST88-${product.id}`}
                      onChange={(event) =>
                        setBarcodeEdits((current) => ({ ...current, [product.id]: event.target.value }))
                      }
                      className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                    />
                    <button
                      onClick={() => saveBarcode(product.id)}
                      className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
