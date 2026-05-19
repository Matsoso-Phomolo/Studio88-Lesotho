import React, { useEffect, useState } from "react";
import Login from "./pages/Login";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import CustomerDashboard from "./pages/CustomerDashboard";
import DeveloperDashboard from "./pages/DeveloperDashboard";
import CustomerCheckout from "./pages/CustomerCheckout";
import CustomerReceipt from "./pages/CustomerReceipt";
import OrdersManagement from "./pages/OrdersManagement";
import WarrantyClaims from "./pages/WarrantyClaims";
import { api } from "./api/api";
import NotificationBell from "./components/NotificationBell";

function App() {
  const [user, setUser] = useState(null);
  const [customerMode, setCustomerMode] = useState(false);
  const [checkoutProduct, setCheckoutProduct] = useState(null);
  const [receiptOrderId, setReceiptOrderId] = useState(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [page, setPage] = useState("dashboard");

  useEffect(() => {
    const savedUser = sessionStorage.getItem("user") || localStorage.getItem("user");
    const savedToken = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (!user && savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    }

    const params = new URLSearchParams(window.location.search);
    const stripeSuccessOrderId = params.get("stripe_success") ? params.get("order_id") : null;
    const stripeCancelOrderId = params.get("stripe_cancel") ? params.get("order_id") : null;

    if (stripeSuccessOrderId) {
      const sessionId = params.get("session_id") || "";
      api.markStripePaymentPaid(stripeSuccessOrderId, sessionId)
        .then((order) => {
          sessionStorage.removeItem("stripeCheckoutProduct");
          setReceiptOrderId(order.id);
          window.history.replaceState({ studio88Page: "receipt", orderId: order.id }, "", "/");
        })
        .catch(() => {
          setCheckoutError("Payment failed. Please try again.");
        });
    }

    if (stripeCancelOrderId) {
      const pendingProduct = sessionStorage.getItem("stripeCheckoutProduct");
      if (pendingProduct) {
        setCheckoutProduct(JSON.parse(pendingProduct));
      }
      setCustomerMode(true);
      setCheckoutError("Stripe payment was cancelled. Please choose a payment method and try again.");
      window.history.replaceState({ studio88Page: "checkout", studio88CanGoBack: true }, "", "/");
    }

    if (!window.history.state?.studio88Page) {
      window.history.replaceState({ studio88Page: "dashboard" }, "");
    }

    function handlePopState(event) {
      const nextPage = event.state?.studio88Page || "dashboard";

      if (nextPage === "receipt") {
        setReceiptOrderId(event.state?.orderId || null);
        return;
      }

      if (nextPage === "checkout" && checkoutProduct) {
        setReceiptOrderId(null);
        return;
      }

      setReceiptOrderId(null);
      setCheckoutProduct(null);
      setPage(nextPage === "orders" || nextPage === "warranty" ? nextPage : "dashboard");
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [checkoutProduct]);

  function goDashboard() {
    setReceiptOrderId(null);
    setCheckoutProduct(null);
    setCheckoutError("");
    setPage("dashboard");
  }

  function navigatePage(nextPage) {
    window.history.pushState(
      { studio88Page: nextPage, studio88CanGoBack: true },
      ""
    );
    setReceiptOrderId(null);
    setCheckoutProduct(null);
    setCheckoutError("");
    setPage(nextPage);
  }

  function openCheckout(product) {
    window.history.pushState(
      { studio88Page: "checkout", studio88CanGoBack: true },
      ""
    );
    setCheckoutError("");
    setCheckoutProduct(product);
  }

  function openReceipt(orderId) {
    window.history.pushState(
      { studio88Page: "receipt", studio88CanGoBack: true, orderId },
      ""
    );
    setCheckoutError("");
    setReceiptOrderId(orderId);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    setUser(null);
    setCustomerMode(false);
    setCheckoutProduct(null);
    setReceiptOrderId(null);
    setCheckoutError("");
    setPage("dashboard");
    window.history.replaceState({ studio88Page: "dashboard" }, "");
    window.location.href = "/";
  }

  function handleLogin(loginData) {
    const sessionUser = {
      ...loginData,
      email: loginData.email || loginData.sub,
    };
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.setItem("token", loginData.access_token);
    sessionStorage.setItem("user", JSON.stringify(sessionUser));
    setCustomerMode(false);
    setCheckoutProduct(null);
    setReceiptOrderId(null);
    setCheckoutError("");
    setPage("dashboard");
    setUser(sessionUser);
  }

  function renderDashboard() {
    const email = user?.sub || user?.email || "";

    if (customerMode) {
      return <CustomerDashboard onCheckout={openCheckout} />;
    }

    if (
      (user?.role === "ADMIN" || user?.role === "DEVELOPER") &&
      (email === "matsoso.dev@studio88.co.ls" || email === "matsoso.it@studio88.co.ls")
    ) {
      return <DeveloperDashboard user={user} />;
    }

    if (user?.role === "ADMIN" && email === "puleng.executive@studio88.co.ls") {
      return <ExecutiveDashboard />;
    }

    if (user?.role === "MANAGER") {
      return <ManagerDashboard user={user} onReceipt={openReceipt} />;
    }

    if (user?.role === "DEVELOPER") {
      return <DeveloperDashboard user={user} />;
    }

    return <ExecutiveDashboard />;
  }

  if (receiptOrderId) {
    return <CustomerReceipt orderId={receiptOrderId} onBackFallback={goDashboard} />;
  }

  if (checkoutProduct) {
    return (
      <CustomerCheckout
        product={checkoutProduct}
        onReceipt={openReceipt}
        onBackFallback={goDashboard}
        initialError={checkoutError}
      />
    );
  }

  if (!user && !customerMode) {
    return <Login onLogin={handleLogin} onCustomer={() => setCustomerMode(true)} />;
  }

  return (
    <div>
      <div className="bg-black text-white p-3 flex items-center gap-3">
        <button onClick={goDashboard}>Dashboard</button>
        {(user?.role === "ADMIN" || user?.role === "MANAGER") && (
          <button onClick={() => navigatePage("orders")}>Orders</button>
        )}
        {user?.role === "ADMIN" && (
          <button onClick={() => navigatePage("warranty")}>Warranty</button>
        )}
        {user && <NotificationBell user={user} />}
        <button
          onClick={handleLogout}
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700"
        >
          Logout
        </button>
      </div>

      {page === "orders" && <OrdersManagement user={user} onBackFallback={goDashboard} onReceipt={openReceipt} />}
      {page === "warranty" && <WarrantyClaims onBackFallback={goDashboard} />}
      {page === "dashboard" && renderDashboard()}
    </div>
  );
}

export default App;
