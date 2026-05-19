import React, { useEffect, useMemo, useState } from "react";
import { MapPin, Search, ShoppingBag, Store } from "lucide-react";
import { motion } from "framer-motion";

import { api } from "../api/api";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";

const fallbackImage =
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80";

const productImages = {
  "Adidas Samba":
    "https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=900&q=80",
  "Adidas Ultraboost":
    "https://images.unsplash.com/photo-1543508282-6319a3e2621f?auto=format&fit=crop&w=900&q=80",
  "Nike Air Max 90":
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
  "Nike Air Force 1":
    "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=900&q=80",
  "Puma RS-X":
    "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=900&q=80",
  "Puma Suede Classic":
    "https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=900&q=80",
  "New Balance 550":
    "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=900&q=80",
  "Vans Old Skool": "/images/vans_old_skool.jpg",
  "CAT Excavator Boot": "/images/cat_boot.jpg",
};

function resolveProductImage(product) {
  return productImages[product?.name] || product?.image_url || fallbackImage;
}

export default function CustomerDashboard({ onCheckout }) {
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [stock, setStock] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedStore, setSelectedStore] = useState("");
  const [welcomeStore, setWelcomeStore] = useState(null);
  const [brandFilter, setBrandFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [storesData, productsData, stockData, promotionsData] = await Promise.all([
          api.getStores(),
          api.getProducts(),
          api.getStock(),
          api.getPromotions(),
        ]);
        setStores(storesData);
        setProducts(productsData);
        setStock(stockData);
        setPromotions(promotionsData);
      } catch (err) {
        console.error(err);
        setError("Failed to connect to backend API");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const enriched = useMemo(() => {
    return stock.map((entry) => {
      const product = products.find((item) => item.id === entry.product_id);
      const store = stores.find((item) => item.id === entry.store_id);
      const promo = promotions.find(
        (item) => item.product_id === entry.product_id && item.store_id === entry.store_id && item.is_active
      );

      return {
        ...entry,
        ...product,
        productId: entry.product_id,
        storeId: entry.store_id,
        storeName: store?.name || "Unknown Store",
        location: store?.location || "Unknown Location",
        qty: entry.quantity,
        sale: promo?.discount_percent || 0,
        image: resolveProductImage(product),
      };
    });
  }, [stock, products, stores, promotions]);

  const brands = [...new Set(products.map((product) => product.brand).filter(Boolean))];
  const chosenStore = stores.find((store) => String(store.id) === selectedStore);
  const filtered = enriched.filter((item) => {
    const storeMatch = String(item.storeId) === selectedStore;
    const brandMatch = brandFilter === "all" || item.brand === brandFilter;
    const textMatch = `${item.name || ""} ${item.brand || ""}`
      .toLowerCase()
      .includes(search.toLowerCase());

    return storeMatch && brandMatch && textMatch;
  });

  function chooseStore(store) {
    setSelectedStore(String(store.id));
    setWelcomeStore(store);
    setSearch("");
    setBrandFilter("all");
  }

  function changeShop() {
    setSelectedStore("");
    setWelcomeStore(null);
    setSearch("");
    setBrandFilter("all");
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-white">Loading shops...</div>;
  }

  if (error) {
    return <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-red-400">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-7xl p-4 md:p-8">
        {!selectedStore ? (
          <>
            <div className="mb-8">
              <Badge className="mb-4 rounded-full border border-red-400/30 bg-red-500/10 px-4 py-1 text-red-200">
                Choose Your Studio 88 Shop
              </Badge>
              <h1 className="text-3xl font-bold md:text-5xl">Select a branch to shop from</h1>
              <p className="mt-3 max-w-2xl text-neutral-400">
                Pick the Studio 88 branch you want to visit, then browse products available at that shop.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {stores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => chooseStore(store)}
                  className="group rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-left text-white shadow-xl transition hover:-translate-y-1 hover:border-red-400/50 hover:bg-white/[0.07]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold">{store.name}</h2>
                      <p className="mt-2 flex items-center gap-2 text-sm text-neutral-400">
                        <MapPin className="h-4 w-4" />
                        {store.location}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-red-600/20 p-3 text-red-200 group-hover:bg-red-600 group-hover:text-white">
                      <Store className="h-6 w-6" />
                    </div>
                  </div>
                  <p className="mt-5 text-sm text-neutral-400">Enter this shop</p>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="mb-6">
              <Badge className="mb-4 rounded-full border border-red-400/30 bg-red-500/10 px-4 py-1 text-red-200">
                Customer Dashboard
              </Badge>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold md:text-5xl">{chosenStore?.name}</h1>
                  <p className="mt-3 max-w-2xl text-neutral-400">
                    Browse products available at {chosenStore?.name}.
                  </p>
                </div>
                <button
                  onClick={changeShop}
                  className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
                >
                  Change shop
                </button>
              </div>
            </div>

            <Card className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] text-white">
              <CardContent className="grid gap-3 p-5 md:grid-cols-[1.5fr_1fr]">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search product or brand..."
                    className="w-full rounded-2xl border border-white/10 bg-black/20 pl-10"
                  />
                </div>
                <select
                  value={brandFilter}
                  onChange={(event) => setBrandFilter(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-white"
                >
                  <option value="all">All brands</option>
                  {brands.map((brand) => (
                    <option key={brand} value={brand} className="text-black">
                      {brand}
                    </option>
                  ))}
                </select>
              </CardContent>
            </Card>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((item) => (
                <motion.div key={`${item.storeId}-${item.productId}`} whileHover={{ y: -4 }}>
                  <Card className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] text-white shadow-xl">
                    <div className="relative h-60 overflow-hidden">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.src = fallbackImage;
                        }}
                      />
                      <div className="absolute left-3 top-3 flex gap-2">
                        {item.is_new && <Badge className="rounded-full bg-green-500/90 px-3 py-1">New</Badge>}
                        {Number(item.sale) > 0 && (
                          <Badge className="rounded-full bg-red-500/90 px-3 py-1">-{item.sale}%</Badge>
                        )}
                      </div>
                    </div>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold">{item.name}</h3>
                          <p className="text-sm text-neutral-400">{item.brand}</p>
                        </div>
                        <ShoppingBag className="h-5 w-5 text-neutral-400" />
                      </div>
                      <div className="mt-4 flex items-center gap-2 text-sm text-neutral-300">
                        <MapPin className="h-4 w-4" />
                        {item.storeName}, {item.location}
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-sm text-neutral-300">
                        <Store className="h-4 w-4" />
                        Status: {item.status}
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-4">
                        <div>
                          <div className="text-xl font-bold">M {item.price}</div>
                          <div className="text-xs text-neutral-400">Qty: {item.qty}</div>
                        </div>
                        <button
                          onClick={() => onCheckout(item)}
                          className="inline-flex items-center rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-950/30 transition hover:bg-red-700"
                        >
                          <ShoppingBag className="mr-2 h-4 w-4" /> Order
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
              {filtered.length === 0 && (
                <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-neutral-400">
                  No products match your search in this shop.
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {welcomeStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-neutral-950 p-6 text-center text-white shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600/20 text-red-200">
              <Store className="h-7 w-7" />
            </div>
            <h2 className="text-3xl font-bold">Welcome to {welcomeStore.name}</h2>
            <p className="mt-3 text-neutral-400">
              You can now browse products available at this Studio 88 branch.
            </p>
            <button
              onClick={() => setWelcomeStore(null)}
              className="mt-6 w-full rounded-2xl bg-red-600 px-4 py-3 font-bold text-white hover:bg-red-700"
            >
              Start shopping
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
