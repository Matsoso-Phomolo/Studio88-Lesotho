import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Package, ShoppingBag, Store } from "lucide-react";

import { api } from "../api/api";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

function StatCard({ title, value, subtitle, icon: Icon }) {
  return (
    <Card className="rounded-3xl border border-white/10 bg-white/[0.04] text-white shadow-xl">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-neutral-400">{title}</p>
            <h3 className="mt-2 text-3xl font-bold">{value}</h3>
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

const MANAGERS_BY_STORE_ID = {
  1: "Letlotlo Mandoza",
  2: "Nthati Rampobole",
  3: "Atlehang Hlatsi",
  4: "Ndeye Mohapi",
  5: "Limpho Moeti",
  6: "Khosi Machake",
  7: "Senate Matsoso",
};

export default function ManagerDashboard({ user, onReceipt }) {
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [stock, setStock] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      const [storesData, productsData, stockData, ordersData] = await Promise.all([
        api.getStores(),
        api.getProducts(),
        api.getManagerStock(),
        api.getOrders(),
      ]);

      setStores(storesData);
      setProducts(productsData);
      setStock(stockData);
      setOrders(ordersData);
    } catch (err) {
      console.error(err);
      setError("Failed to connect to backend API");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const branch = stores.find((store) => store.id === user?.store_id);

  const branchStock = useMemo(() => {
    return stock.map((entry) => {
        const product = products.find((item) => item.id === entry.product_id);
        return {
          ...entry,
          productName: product?.name || "Unknown Product",
          brand: product?.brand || "Unknown Brand",
          price: product?.price || 0,
        };
      });
  }, [stock, products, user?.store_id]);

  const branchOrders = orders.filter((order) => order.store_id === user?.store_id);
  const lowStock = branchStock.filter((item) => item.status === "Low Stock");
  const totalUnits = branchStock.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const branchName = branch?.name || "Assigned Branch";
  const managerName = user?.full_name || MANAGERS_BY_STORE_ID[user?.store_id] || "Branch Manager";

  async function updateStatus(orderId, status) {
    await api.updateOrderStatus(orderId, status);
    await loadData();
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-white">Loading manager dashboard...</div>;
  }

  if (error) {
    return <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-red-400">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-7xl p-4 md:p-8">
        <div className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-r from-neutral-900 via-neutral-900 to-red-950 p-6 shadow-2xl">
          <Badge className="mb-4 rounded-full border border-red-400/30 bg-red-500/10 px-4 py-1 text-red-200">
            Branch Manager Dashboard
          </Badge>
          <h1 className="text-3xl font-bold md:text-5xl">{branchName}</h1>
          <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-red-100">
            Manager: {managerName}
          </p>
          <p className="mt-2 text-neutral-300">{branch?.location || "Branch stock and order workflow"}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard title="Branch Units" value={totalUnits} subtitle="Live stock in your store" icon={Package} />
          <StatCard title="Low Stock" value={lowStock.length} subtitle="Items needing replenishment" icon={AlertTriangle} />
          <StatCard title="Branch Orders" value={branchOrders.length} subtitle="Orders for your store" icon={ShoppingBag} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <Card className="rounded-3xl border border-white/10 bg-white/[0.04] text-white">
            <CardHeader className="p-5">
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" /> Branch stock
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-5 pt-0">
              {branchStock.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold">{item.productName}</div>
                      <div className="text-sm text-neutral-400">{item.brand} - M {item.price}</div>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-sm">{item.status}</span>
                  </div>
                  <div className="mt-2 text-sm text-neutral-300">Quantity: {item.quantity}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-white/10 bg-white/[0.04] text-white">
            <CardHeader className="p-5">
              <CardTitle>Orders for this branch</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 p-5 pt-0">
              {branchOrders.map((order) => (
                <div key={order.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{order.order_number}</div>
                      <div className="text-sm text-neutral-400">{order.customer_full_name} - {order.customer_phone}</div>
                      <div className="text-sm text-neutral-400">M {order.total_amount}</div>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-sm">{order.status}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {order.status === "Confirmed" && (
                      <button
                        onClick={() => updateStatus(order.id, "Ready for Collection")}
                        className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-semibold text-black"
                      >
                        Ready for Collection
                      </button>
                    )}
                    {order.status === "Ready for Collection" && (
                      <button
                        onClick={() => updateStatus(order.id, "Collected")}
                        className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white"
                      >
                        Collected
                      </button>
                    )}
                    {["Confirmed", "Ready for Collection", "Collected"].includes(order.status) && (
                      <button
                        onClick={() => onReceipt(order.id)}
                        className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white"
                      >
                        View Receipt
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {branchOrders.length === 0 && <p className="text-sm text-neutral-400">No orders for this branch yet.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
