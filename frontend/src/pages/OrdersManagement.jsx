import React, { useEffect, useState } from "react";
import { api } from "../api/api";
import BackButton from "../components/BackButton";

const RECEIPT_STATUSES = new Set(["Confirmed", "Ready for Collection", "Collected"]);

export default function OrdersManagement({ user, onBackFallback, onReceipt }) {
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const data = query ? await api.searchOrders(query) : await api.getOrders();
      setOrders(data);
      setError("");
    } catch {
      setError("Could not load orders. Please check your access and try again.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(orderId, status) {
    try {
      await api.updateOrderStatus(orderId, status);
      await load();
    } catch {
      setError("Could not update order status.");
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 p-6 text-white">
      <BackButton onFallback={onBackFallback} />
      <h1 className="text-3xl font-bold">Orders Management</h1>
      <p className="mt-2 text-sm text-neutral-400">
        {user?.role === "MANAGER" ? "Showing orders for your branch only." : "Search and manage all branch orders."}
      </p>

      <div className="mt-6 flex gap-3">
        <input
          className="flex-1 rounded-2xl border border-white/10 bg-black/30 p-3"
          placeholder="Search order, customer, phone, status..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button onClick={load} className="rounded-2xl bg-white px-6 text-black">
          Search
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-semibold text-red-300">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-4">
        {orders.map((order) => (
          <div key={order.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">{order.order_number}</h2>
                <p>{order.customer_full_name} - {order.customer_phone}</p>
                <p className="text-neutral-400">M {order.total_amount}</p>
              </div>
              <span className="h-fit rounded-full bg-white/10 px-4 py-2">{order.status}</span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {order.status === "Confirmed" && (
                <button onClick={() => updateStatus(order.id, "Ready for Collection")} className="rounded-xl bg-yellow-500 px-4 py-2 text-black">
                  Ready for Collection
                </button>
              )}
              {order.status === "Ready for Collection" && (
                <button onClick={() => updateStatus(order.id, "Collected")} className="rounded-xl bg-green-600 px-4 py-2">
                  Collected
                </button>
              )}
              {order.status === "Pending" && (
                <button onClick={() => updateStatus(order.id, "Cancelled")} className="rounded-xl bg-red-600 px-4 py-2">
                  Cancel
                </button>
              )}
              {RECEIPT_STATUSES.has(order.status) && (
                <button onClick={() => onReceipt(order.id)} className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 hover:bg-white/20">
                  View Receipt
                </button>
              )}
            </div>

            <div className="mt-4 text-sm text-neutral-300">
              <p className="mb-2 text-red-200">
                Orders are not refundable. Warranty applies only with a valid receipt.
              </p>
              {order.items.map((item) => (
                <p key={item.id}>
                  {item.product_name} - Size {item.size_label} - {item.colour_name} - Qty {item.quantity}
                </p>
              ))}
            </div>
          </div>
        ))}
        {orders.length === 0 && !error && (
          <p className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-neutral-400">
            No orders found.
          </p>
        )}
      </div>
    </div>
  );
}
