import React, { useState } from "react";
import { api } from "../api/api";

export default function Login({ onLogin, onCustomer }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    try {
      const data = await api.login({ email, password });
      onLogin({ ...data, email });
    } catch {
      setError("Invalid email or password");
    }
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black p-6 text-white"
      style={{
        boxShadow:
          "inset 0 0 0 2px rgba(239, 0, 16, 0.5), inset 0 0 80px rgba(239, 0, 16, 0.22)",
      }}
    >
      <div
        className="absolute inset-y-0 left-1/2 w-[min(74vw,1380px)] -translate-x-1/2 border-x-[18px] border-y-[56px] border-black bg-neutral-950 shadow-[0_0_70px_rgba(0,0,0,0.95)]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(5, 5, 5, 0.68), rgba(5, 5, 5, 0.82)), url('/images/logo.png')",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
        }}
      />
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" />
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-red-700/55 bg-neutral-950/85 p-6 shadow-2xl shadow-red-950/35 backdrop-blur-md">
        <h1 className="text-3xl font-bold">Studio 88 Lesotho</h1>
        <p className="text-neutral-400 mt-2">Secure stakeholder login</p>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">

          {/* Email */}
          <div className="relative">
            <input
              aria-label="Email"
              className="w-full rounded-2xl bg-black/30 border border-white/10 p-3 text-white outline-none"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {!email && (
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                <span className="block text-xs font-semibold uppercase tracking-wide text-white">
                  Email
                </span>
                <span className="mt-1 block text-[10px] leading-none text-neutral-500">
                  e.g. matsoso.dev@studio88.co.ls
                </span>
              </div>
            )}
          </div>

          {/* Password with toggle */}
          <div className="relative">
            <input
              className="w-full rounded-2xl bg-black/30 border border-white/10 p-3 pr-12"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />

            {/* Toggle Button */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 hover:text-white"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button className="w-full rounded-2xl bg-white text-black py-3 font-bold">
            Login
          </button>
        </form>

        <button
          onClick={onCustomer}
          className="mt-4 w-full rounded-2xl bg-red-600 py-3 font-bold"
        >
          Continue as Customer
        </button>
      </div>
    </div>
  );
}
