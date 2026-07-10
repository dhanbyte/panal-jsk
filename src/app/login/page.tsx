"use client";

import React, { useState, useEffect } from "react";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Lock, Mail, AlertCircle, ArrowLeft } from "lucide-react";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/admin");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/admin");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/invalid-email" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setError("Invalid email or password. Please try again.");
      } else {
        setError("Login failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAF8F5] to-[#F3EFE9] text-[#2C2620] font-sans flex items-center justify-center p-4">
      <div className="absolute top-4 left-4 md:top-8 md:left-8">
        <a
          href="/"
          className="flex items-center space-x-2 text-xs font-bold text-amber-900/70 hover:text-amber-900 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Store</span>
        </a>
      </div>

      <div className="max-w-md w-full bg-white rounded-3xl p-8 md:p-10 border border-amber-100 shadow-xl space-y-8 relative overflow-hidden">
        {/* Top gold bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-amber-700 to-amber-500" />

        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-100 mx-auto flex items-center justify-center shadow-inner">
            <Lock className="text-amber-800" size={24} />
          </div>
          <h2 className="text-2xl font-serif font-bold text-amber-950">Admin Workspace</h2>
          <p className="text-xs text-amber-900/60 font-medium">
            Sign in to manage JSK Art Jewellery
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-xs font-semibold rounded-xl p-3 flex items-center space-x-2">
            <AlertCircle size={16} className="shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-amber-900/70 block">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-700/60">
                <Mail size={16} />
              </div>
              <input
                type="email"
                required
                placeholder="admin@jskjewellery.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-amber-200/80 bg-amber-50/20 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm placeholder-amber-700/30 transition-all duration-300"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-amber-900/70 block">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-700/60">
                <Lock size={16} />
              </div>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-amber-200/80 bg-amber-50/20 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm placeholder-amber-700/30 transition-all duration-300"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all duration-300 disabled:bg-amber-800/50 flex items-center justify-center cursor-pointer"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
            ) : (
              "Sign In to Account"
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-[10px] text-amber-900/40">
            Secure admin space. Unauthorized access is restricted.
          </p>
        </div>
      </div>
    </div>
  );
}
