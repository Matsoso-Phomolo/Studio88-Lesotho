import React, { useState } from "react";
import { api } from "../api/api";
import BackButton from "../components/BackButton";

export default function CustomerCheckout({ product, onReceipt, onBackFallback, initialError = "" }) {
  const shoeSizeRanges = {
    adult: { label: "Adult", min: 1, max: 10, defaultSize: 5 },
    child: { label: "Child", min: 1, max: 13, defaultSize: 1 },
  };
  const districts = [
    "Quthing",
    "Mohale's Hoek",
    "Mafeteng",
    "Maseru",
    "Berea",
    "Leribe",
    "Butha Bothe",
    "Thaba Tseka",
    "Mokhotlong",
    "Qacha's Nek",
  ];

  const [form, setForm] = useState({
    customer_full_name: "",
    id_number: "",
    phone_prefix: "+266",
    phone_number: "",
    payment_phone: "",
    customer_district: "",
    shoe_size_type: "adult",
    size_label: "5",
    colour_name: "Black",
    quantity: 1,
    payment_method: "M-Pesa",
  });
  const [error, setError] = useState(initialError);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update(key, value) {
    setError("");
    setForm({ ...form, [key]: value });
  }

  const activeShoeRange = shoeSizeRanges[form.shoe_size_type];

  function updateShoeSizeType(type) {
    const range = shoeSizeRanges[type];
    const currentSize = Number(form.size_label);
    const nextSize =
      currentSize >= range.min && currentSize <= range.max
        ? currentSize
        : range.defaultSize;

    setError("");
    setForm({
      ...form,
      shoe_size_type: type,
      size_label: String(nextSize),
    });
  }

  function updateShoeSize(change) {
    const nextSize = Math.min(
      activeShoeRange.max,
      Math.max(activeShoeRange.min, Number(form.size_label) + change)
    );

    update("size_label", String(nextSize));
  }

  function getPhoneNumber() {
    const digits = form.phone_number.replace(/\D/g, "");
    const prefixDigits = form.phone_prefix.replace(/\D/g, "");
    const localDigits = digits.startsWith(prefixDigits)
      ? digits.slice(prefixDigits.length)
      : digits;

    return {
      localDigits,
      fullPhoneNumber: `${form.phone_prefix}${localDigits}`,
    };
  }

  function getPaymentPhoneNumber() {
    const digits = form.payment_phone.replace(/\D/g, "");
    const localDigits = digits.startsWith("266") ? digits.slice(3) : digits;

    return {
      localDigits,
      fullPhoneNumber: `+266${localDigits}`,
    };
  }

  const idNumberDigits = form.id_number.replace(/\D/g, "");
  const hasValidIdNumber = idNumberDigits.length === 12;
  const needsPaymentPhone = form.payment_method === "M-Pesa" || form.payment_method === "EcoCash";
  const isStripePayment = form.payment_method === "Stripe";

  function validateCheckout() {
    const { localDigits } = getPhoneNumber();
    const { localDigits: paymentDigits } = getPaymentPhoneNumber();
    const requiredFields = [
      form.customer_full_name,
      form.id_number,
      form.customer_district,
      form.size_label,
      form.colour_name,
      form.payment_method,
      form.phone_prefix,
      form.phone_number,
    ];

    if (needsPaymentPhone) {
      requiredFields.push(form.payment_phone);
    }

    if (requiredFields.some((value) => !String(value || "").trim())) {
      return "Please fill in all required checkout details.";
    }

    if (!hasValidIdNumber) {
      return "ID Number must be exactly 12 digits.";
    }

    if (localDigits.length < 8) {
      return "Phone number must be at least 8 digits.";
    }

    if (needsPaymentPhone && paymentDigits.length < 8) {
      return "Payment phone number must be at least 8 digits.";
    }

    return "";
  }

  async function placeOrder() {
    const validationError = validateCheckout();

    if (validationError) {
      setError(validationError);
      return;
    }

    const { fullPhoneNumber } = getPhoneNumber();
    const { fullPhoneNumber: fullPaymentPhoneNumber } = getPaymentPhoneNumber();
    setIsSubmitting(true);
    setError("");

    try {
      const paymentPhone = needsPaymentPhone ? fullPaymentPhoneNumber : null;
      const order = await api.createOrder({
        customer_full_name: form.customer_full_name,
        customer_phone: fullPhoneNumber,
        customer_district: form.customer_district,
        store_id: product.storeId,
        payment_method: form.payment_method,
        payment_phone: paymentPhone,
        items: [
          {
            product_id: product.productId,
            product_name: product.name,
            size_label: `${activeShoeRange.label} ${form.size_label}`,
            colour_name: form.colour_name,
            quantity: Number(form.quantity),
            unit_price: Number(product.price),
          },
        ],
      });

      if (isStripePayment) {
        sessionStorage.setItem("stripeCheckoutProduct", JSON.stringify(product));
        const stripeSession = await api.createStripeCheckoutSession({ order_id: order.id });
        window.location.href = stripeSession.checkout_url;
        return;
      }

      const paidOrder = await api.confirmPayment({
        order_id: order.id,
        payment_method: form.payment_method,
        payment_phone: paymentPhone,
      });

      onReceipt(paidOrder.id);
    } catch {
      setError("Order failed. Please check details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <BackButton onFallback={onBackFallback} />
      </div>
      <div className="max-w-2xl mx-auto rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <h1 className="text-3xl font-bold">Checkout</h1>
        <p className="text-neutral-400 mt-2">{product.name} • M {product.price}</p>

        <div className="grid gap-3 mt-6">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
            <input
              className="w-full bg-transparent text-white outline-none placeholder:text-neutral-500"
              placeholder="Full Name e.g. Stephen Matsoso"
              value={form.customer_full_name}
              onChange={(e) => update("customer_full_name", e.target.value)}
            />
          </div>

          <div
            className={`rounded-2xl border p-3 transition ${
              hasValidIdNumber
                ? "border-red-500/50 bg-white/[0.05]"
                : "border-white/10 bg-black/30 opacity-60"
            }`}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-white">ID Number</span>
              <span className={hasValidIdNumber ? "text-xs text-green-400" : "text-xs text-neutral-500"}>
                {idNumberDigits.length}/12 digits
              </span>
            </div>
            <input
              className="w-full bg-transparent text-white outline-none placeholder:text-neutral-500"
              inputMode="numeric"
              maxLength={12}
              placeholder="------------"
              value={form.id_number}
              onChange={(e) => update("id_number", e.target.value.replace(/\D/g, "").slice(0, 12))}
            />
          </div>

          <select
            className="rounded-2xl bg-black/30 border border-white/10 p-3 text-white"
            value={form.customer_district}
            onChange={(e) => update("customer_district", e.target.value)}
          >
            <option value="" className="text-black">District</option>
            {districts.map((district) => (
              <option key={district} value={district} className="text-black">
                {district}
              </option>
            ))}
          </select>

          <div className="grid gap-3 sm:grid-cols-[170px_1fr]">
            <select
              className="rounded-2xl bg-black/30 border border-white/10 p-3"
              value={form.phone_prefix}
              onChange={(e) => update("phone_prefix", e.target.value)}
            >
              <option value="+266">+266 (Lesotho)</option>
              <option value="+27">+27 (South Africa)</option>
            </select>

            <input
              className="rounded-2xl bg-black/30 border border-white/10 p-3"
              placeholder="Phone e.g. 58001234"
              value={form.phone_number}
              onChange={(e) => update("phone_number", e.target.value.replace(/\D/g, ""))}
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-sm font-semibold text-white">Shoe Size</span>
                <p className="mt-1 text-xs text-neutral-400">
                  {activeShoeRange.label} sizes {activeShoeRange.min}-{activeShoeRange.max}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-black/30 p-1">
                {Object.entries(shoeSizeRanges).map(([type, range]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => updateShoeSizeType(type)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      form.shoe_size_type === type
                        ? "bg-red-600 text-white"
                        : "bg-white/10 text-neutral-300 hover:bg-white/20"
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-[48px_1fr_48px] items-center gap-3">
              <button
                type="button"
                onClick={() => updateShoeSize(-1)}
                disabled={Number(form.size_label) <= activeShoeRange.min}
                className="h-12 rounded-xl border border-white/10 bg-white/10 text-xl font-bold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                -
              </button>
              <div className="flex h-12 items-center justify-center rounded-xl border border-white/10 bg-black/30 text-lg font-bold">
                {form.size_label}
              </div>
              <button
                type="button"
                onClick={() => updateShoeSize(1)}
                disabled={Number(form.size_label) >= activeShoeRange.max}
                className="h-12 rounded-xl border border-white/10 bg-white/10 text-xl font-bold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>

          <select className="rounded-2xl bg-black/30 border border-white/10 p-3" value={form.colour_name} onChange={(e) => update("colour_name", e.target.value)}>
            <option>Black</option><option>White</option><option>Brown</option><option>Red</option><option>Blue</option>
          </select>

          <select className="rounded-2xl bg-black/30 border border-white/10 p-3" value={form.payment_method} onChange={(e) => update("payment_method", e.target.value)}>
            <option>M-Pesa</option><option>EcoCash</option><option>Bank Card</option><option>Stripe</option>
          </select>

          {needsPaymentPhone && (
            <input
              className="rounded-2xl bg-black/30 border border-white/10 p-3"
              placeholder="+266 58000000"
              value={form.payment_phone}
              onChange={(e) => update("payment_phone", e.target.value.replace(/[^\d+ ]/g, ""))}
            />
          )}

          {form.payment_method === "Bank Card" && (
            <p className="rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-neutral-300">
              Card payment will be processed securely. Card details are not stored.
            </p>
          )}

          {isStripePayment && (
            <p className="rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-neutral-300">
              Stripe handles card details securely in test mode. Studio 88 does not store card numbers, CVV, PINs, or bank details.
            </p>
          )}

          <p className="text-sm text-red-300 mt-2">
            NO REFUNDS. Warranty applies according to store policy. Keep your receipt.
          </p>

          {error && (
            <p className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-semibold text-red-300">
              {error}
            </p>
          )}

          <button
            onClick={placeOrder}
            disabled={isSubmitting || !hasValidIdNumber}
            className="rounded-2xl bg-red-600 py-3 font-bold transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Processing payment..." : isStripePayment ? "Continue to Stripe" : "Pay & Place Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
