import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BadgePercent, Banknote, Package, ShoppingBag } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

export default function ExecutiveDashboard() {
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [stock, setStock] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [storesData, productsData, stockData, promotionsData, ordersData] =
          await Promise.all([
            api.getStores(),
            api.getProducts(),
            api.getStock(),
            api.getPromotions(),
            api.getOrders(),
          ]);

        setStores(storesData);
        setProducts(productsData);
        setStock(stockData);
        setPromotions(promotionsData);
        setOrders(ordersData);
      } catch (err) {
        console.error(err);
        setError("Failed to connect to backend API");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const enrichedStock = useMemo(() => {
    return stock.map((entry) => {
      const product = products.find((item) => item.id === entry.product_id);
      const store = stores.find((item) => item.id === entry.store_id);

      return {
        ...entry,
        productName: product?.name || "Unknown Product",
        brand: product?.brand || "Unknown Brand",
        storeName: store?.name || "Unknown Store",
        qty: entry.quantity,
      };
    });
  }, [stock, products, stores]);

  const totalUnits = enrichedStock.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const lowStockCount = enrichedStock.filter((item) => item.status === "Low Stock").length;
  const outOfStockCount = enrichedStock.filter((item) => item.status === "Out of Stock").length;
  const activePromotions = promotions.filter((item) => item.is_active).length;
  const revenueStatuses = new Set(["Confirmed", "Ready for Collection", "Collected"]);
  const totalRevenue = orders
    .filter((order) => revenueStatuses.has(order.status))
    .reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

  const branchStock = stores.map((store) => ({
    name: store.name,
    units: enrichedStock
      .filter((item) => item.store_id === store.id)
      .reduce((sum, item) => sum + Number(item.qty || 0), 0),
  }));

  const branchOrderSummary = stores.map((store) => {
    const branchOrders = orders.filter((order) => order.store_id === store.id);
    return {
      name: store.name,
      orders: branchOrders.length,
      revenue: branchOrders
        .filter((order) => revenueStatuses.has(order.status))
        .reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
    };
  });

  const stockHealth = [
    { name: "Available", value: enrichedStock.filter((item) => item.status === "Available").length },
    { name: "Low Stock", value: lowStockCount },
    { name: "Out of Stock", value: outOfStockCount },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-white">
        Loading executive dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-7xl p-4 md:p-8">
        <div className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-r from-neutral-900 via-neutral-900 to-red-950 p-6 shadow-2xl">
          <Badge className="mb-4 rounded-full border border-red-400/30 bg-red-500/10 px-4 py-1 text-red-200">
            Executive Dashboard
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
            Studio 88 Lesotho performance overview
          </h1>
          <p className="mt-4 max-w-3xl text-sm text-neutral-300 md:text-base">
            National visibility across branches, products, stock health, promotions, and orders.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard title="Total Units" value={totalUnits} subtitle="Across all branches" icon={Package} />
          <StatCard title="Low Stock Alerts" value={lowStockCount} subtitle="Needs replenishment" icon={AlertTriangle} />
          <StatCard title="Products on Promotion" value={activePromotions} subtitle="Active campaigns" icon={BadgePercent} />
          <StatCard title="Total Orders" value={orders.length} subtitle="All branch orders" icon={ShoppingBag} />
          <StatCard title="Revenue" value={`M ${totalRevenue.toFixed(2)}`} subtitle="Confirmed paid orders" icon={Banknote} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="rounded-3xl border border-white/10 bg-white/[0.04] text-white">
            <CardHeader className="p-5">
              <CardTitle>Branch stock visibility</CardTitle>
            </CardHeader>
            <CardContent className="h-80 p-5">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchStock}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" stroke="#aaa" />
                  <YAxis stroke="#aaa" />
                  <Tooltip />
                  <Bar dataKey="units" fill="#f87171" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-white/10 bg-white/[0.04] text-white">
            <CardHeader className="p-5">
              <CardTitle>Stock health overview</CardTitle>
            </CardHeader>
            <CardContent className="h-80 p-5">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stockHealth} dataKey="value" nameKey="name" outerRadius={100} innerRadius={60}>
                    {stockHealth.map((_, index) => (
                      <Cell key={index} fill={["#22c55e", "#f59e0b", "#ef4444"][index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <Card className="rounded-3xl border border-white/10 bg-white/[0.04] text-white">
            <CardHeader className="p-5">
              <CardTitle>Branches</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-5 pt-0">
              {stores.map((store) => (
                <div key={store.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="font-semibold">{store.name}</div>
                  <div className="text-sm text-neutral-400">{store.location}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-white/10 bg-white/[0.04] text-white">
            <CardHeader className="p-5">
              <CardTitle>Products</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-5 pt-0">
              {products.map((product) => (
                <div key={product.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="font-semibold">{product.name}</div>
                  <div className="text-sm text-neutral-400">{product.brand} - M {product.price}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-white/10 bg-white/[0.04] text-white">
            <CardHeader className="p-5">
              <CardTitle>Recent orders</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-5 pt-0">
              {orders.map((order) => (
                <div key={order.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="font-semibold">{order.order_number}</div>
                  <div className="text-sm text-neutral-400">{order.customer_full_name} - {order.status}</div>
                </div>
              ))}
              {orders.length === 0 && <p className="text-sm text-neutral-400">No orders yet.</p>}
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="rounded-3xl border border-white/10 bg-white/[0.04] text-white">
            <CardHeader className="p-5">
              <CardTitle>Orders by branch</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-5 pt-0">
              {branchOrderSummary.map((branch) => (
                <div key={branch.name} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold">{branch.name}</div>
                      <div className="text-sm text-neutral-400">{branch.orders} orders</div>
                    </div>
                    <div className="text-right text-sm font-semibold text-green-300">M {branch.revenue.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-white/10 bg-white/[0.04] text-white">
            <CardHeader className="p-5">
              <CardTitle>Revenue summary</CardTitle>
            </CardHeader>
            <CardContent className="h-80 p-5">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchOrderSummary}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" stroke="#aaa" />
                  <YAxis stroke="#aaa" />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#22c55e" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
