"use client";

import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Search, Phone, Gift, Tag, Sparkles, Filter, Info, Eye } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  imageUrl?: string;
  imageUrls: string[];
  lowStockThreshold?: number;
  discountPrice?: number;
  size?: string;
  videoUrl?: string;
}

export default function PublicStore() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [whatsappNumber, setWhatsappNumber] = useState("919999999999"); // default number
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Fetch products and settings
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch products
        const productsCol = collection(db, "products");
        const querySnapshot = await getDocs(productsCol);
        const productsList: Product[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          productsList.push({
            id: doc.id,
            name: data.name || "",
            description: data.description || "",
            price: Number(data.price) || 0,
            discountPrice: data.discountPrice ? Number(data.discountPrice) : undefined,
            stock: Number(data.stock) || 0,
            category: data.category || "Other",
            imageUrl: data.imageUrl || "",
            imageUrls: data.imageUrls || (data.imageUrl ? [data.imageUrl] : ["https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&auto=format&fit=crop&q=60"]),
            size: data.size || "",
            videoUrl: data.videoUrl || "",
          });
        });
        setProducts(productsList);

        // Fetch settings (WhatsApp number)
        const settingsCol = collection(db, "settings");
        const settingsSnapshot = await getDocs(settingsCol);
        settingsSnapshot.forEach((doc) => {
          if (doc.id === "contact" && doc.data().whatsapp) {
            setWhatsappNumber(doc.data().whatsapp);
          }
        });
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const categories = ["All", "Rings", "Necklaces", "Earrings", "Bangles", "Other"];

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getWhatsAppLink = (product: Product) => {
    const displayPrice = product.discountPrice ? product.discountPrice : product.price;
    const text = `Hello JSK Art Jewellery, I am interested in this product:\n\n*Name:* ${product.name}\n*Price:* ₹${displayPrice.toLocaleString("en-IN")}\n*Category:* ${product.category}\n*Product ID:* ${product.id}\n\nPlease share more details.`;
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAF8F5] to-[#F3EFE9] text-[#2C2620] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#E6DEC9] px-4 py-4 md:px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-amber-700 flex items-center justify-center shadow-md">
            <span className="text-white font-serif font-bold text-xl">J</span>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-serif font-bold tracking-wide text-amber-900 leading-none">
              JSK Art Jewellery
            </h1>
            <span className="text-[10px] tracking-widest uppercase text-amber-700 font-semibold">
              Premium Collection
            </span>
          </div>
        </div>

        <a
          href="/login"
          className="text-xs md:text-sm font-semibold text-amber-800 hover:text-amber-950 border border-amber-800/20 hover:border-amber-950/40 rounded-full px-4 py-1.5 transition-all duration-300"
        >
          Admin Login
        </a>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-12 md:py-20 px-4 text-center">
        <div className="max-w-3xl mx-auto space-y-6 relative z-10">
          <div className="inline-flex items-center space-x-2 bg-amber-100/60 border border-amber-200 rounded-full px-4 py-1.5 text-xs text-amber-800 font-semibold animate-pulse">
            <Sparkles size={14} className="text-amber-600" />
            <span>Exquisite Handcrafted Art Jewellery</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-serif font-black tracking-tight text-amber-950 leading-tight">
            Elevate Your Elegance with <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-amber-800">JSK</span>
          </h2>
          <p className="text-sm md:text-lg text-amber-900/80 max-w-2xl mx-auto leading-relaxed">
            Browse our unique collection of rings, necklaces, earrings, and bangles. Message us on WhatsApp to order or customize.
          </p>

          {/* Search bar */}
          <div className="max-w-md mx-auto relative mt-8">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search size={18} className="text-amber-700/60" />
            </div>
            <input
              type="text"
              placeholder="Search design name or keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 md:py-3.5 rounded-full border border-amber-200 bg-white/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-md text-sm md:text-base placeholder-amber-700/40 transition-all duration-300"
            />
          </div>
        </div>

        {/* Decorative background gradients */}
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-amber-200/30 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-amber-300/20 blur-3xl" />
      </section>

      {/* Main Catalog Section */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 pb-20">
        {/* Categories Bar */}
        <div className="flex space-x-2 overflow-x-auto pb-4 mb-8 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`flex items-center space-x-1 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 border whitespace-nowrap cursor-pointer ${
                selectedCategory === category
                  ? "bg-amber-800 text-white border-amber-900 shadow-lg shadow-amber-800/20 scale-105"
                  : "bg-white/60 text-amber-900 border-amber-200/60 hover:bg-amber-100/50"
              }`}
            >
              <span>{category}</span>
            </button>
          ))}
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-800"></div>
            <p className="mt-4 text-amber-800/80 font-medium">Loading collection...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white/60 border border-amber-200/40 rounded-2xl p-12 text-center max-w-lg mx-auto shadow-sm">
            <Info size={40} className="mx-auto text-amber-700/50 mb-3" />
            <p className="text-amber-900 font-bold text-lg">No products found</p>
            <p className="text-amber-800/70 text-sm mt-1">Try changing your search terms or category selection.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-2xl overflow-hidden border border-amber-100 hover:border-amber-300 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col group"
              >
                {/* Product Image */}
                <div className="relative aspect-square overflow-hidden bg-amber-50/50">
                  <img
                    src={product.imageUrls?.[0] || product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  {product.stock <= 0 && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center">
                      <span className="bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                        Out Of Stock
                      </span>
                    </div>
                  )}
                  {product.stock > 0 && product.stock <= 5 && (
                    <span className="absolute top-3 left-3 bg-amber-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
                      Only {product.stock} Left
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setSelectedProduct(product);
                      setActiveImageIndex(0);
                    }}
                    className="absolute bottom-3 right-3 p-2 bg-white/90 hover:bg-white text-amber-900 rounded-full shadow-md hover:scale-110 transition-all duration-300 cursor-pointer"
                  >
                    <Eye size={16} />
                  </button>
                </div>

                {/* Info */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                      {product.category}
                    </span>
                    <h3 className="font-serif font-bold text-lg text-amber-950 line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-xs text-amber-900/70 line-clamp-2 min-h-[2rem]">
                      {product.description}
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-baseline justify-between border-t border-amber-50 pt-3">
                      <span className="text-xs text-amber-700/60 font-semibold">Inquiry Price</span>
                      <div className="flex flex-col items-end">
                        {product.discountPrice ? (
                          <>
                            <span className="text-[10px] text-amber-900/50 line-through">₹{product.price.toLocaleString("en-IN")}</span>
                            <span className="text-xl font-bold text-amber-900">₹{product.discountPrice.toLocaleString("en-IN")}</span>
                          </>
                        ) : (
                          <span className="text-xl font-bold text-amber-900">₹{product.price.toLocaleString("en-IN")}</span>
                        )}
                      </div>
                    </div>

                    <a
                      href={getWhatsAppLink(product)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all duration-300 ${
                        product.stock <= 0
                          ? "bg-amber-100 text-amber-800/40 cursor-not-allowed pointer-events-none"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg shadow-emerald-600/10 cursor-pointer"
                      }`}
                    >
                      <Phone size={14} className="fill-current" />
                      <span>Inquire on WhatsApp</span>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl overflow-hidden max-w-2xl w-full shadow-2xl border border-amber-100 flex flex-col md:flex-row relative">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 z-10 bg-white/80 hover:bg-white text-amber-950 p-2 rounded-full shadow-md font-bold text-sm cursor-pointer"
            >
              ✕
            </button>

            {/* Modal Image & Video Carousel */}
            <div className="w-full md:w-1/2 aspect-square md:aspect-auto md:h-full bg-amber-50 flex flex-col relative">
              <div className="flex-1 overflow-hidden relative min-h-[300px] md:min-h-full">
                {activeImageIndex === 999 && selectedProduct.videoUrl ? (
                  <video
                    src={selectedProduct.videoUrl}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-contain bg-black"
                  />
                ) : (
                  <img
                    src={selectedProduct.imageUrls?.[activeImageIndex] || selectedProduct.imageUrl}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover absolute inset-0 transition-opacity duration-300"
                  />
                )}
              </div>
              {((selectedProduct.imageUrls && selectedProduct.imageUrls.length > 1) || selectedProduct.videoUrl) && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2 px-4">
                  <div className="flex space-x-2 bg-black/45 backdrop-blur-md p-2 rounded-2xl overflow-x-auto max-w-full">
                    {selectedProduct.imageUrls?.map((url, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImageIndex(idx)}
                        className={`w-10 h-10 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                          activeImageIndex === idx ? "border-amber-400 scale-110" : "border-transparent opacity-70 hover:opacity-100"
                        }`}
                      >
                        <img src={url} className="w-full h-full object-cover" />
                      </button>
                    ))}
                    {selectedProduct.videoUrl && (
                      <button
                        onClick={() => setActiveImageIndex(999)}
                        className={`w-10 h-10 rounded-lg bg-amber-950 flex items-center justify-center shrink-0 border-2 transition-all cursor-pointer text-white font-bold text-[10px] ${
                          activeImageIndex === 999 ? "border-amber-400 scale-110" : "border-transparent opacity-70 hover:opacity-100"
                        }`}
                        title="Watch Video"
                      >
                        ▶ Video
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Details */}
            <div className="p-6 md:p-8 w-full md:w-1/2 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded">
                    {selectedProduct.category}
                  </span>
                  <h3 className="font-serif font-extrabold text-2xl text-amber-950 mt-2">
                    {selectedProduct.name}
                  </h3>
                </div>
                <p className="text-sm text-amber-900/80 leading-relaxed">
                  {selectedProduct.description}
                </p>
                <div className="flex flex-col border-t border-b border-amber-50 py-4 space-y-1">
                  <span className="text-sm text-amber-700/60 font-semibold">Special Price</span>
                  <div className="flex items-baseline space-x-3">
                    {selectedProduct.discountPrice ? (
                      <>
                        <span className="text-3xl font-black text-emerald-700">₹{selectedProduct.discountPrice.toLocaleString("en-IN")}</span>
                        <span className="text-lg font-bold text-amber-900/40 line-through">₹{selectedProduct.price.toLocaleString("en-IN")}</span>
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full ml-auto">
                          SAVE ₹{(selectedProduct.price - selectedProduct.discountPrice).toLocaleString("en-IN")}
                        </span>
                      </>
                    ) : (
                      <span className="text-3xl font-black text-amber-950">₹{selectedProduct.price.toLocaleString("en-IN")}</span>
                    )}
                  </div>
                </div>
                {selectedProduct.size && (
                  <div className="text-xs text-amber-900/80 font-bold bg-amber-100/50 border border-amber-200/40 rounded-xl px-3 py-2 flex justify-between items-center">
                    <span>Available Size:</span>
                    <span className="bg-white border border-amber-200/65 px-2 py-0.5 rounded shadow-sm">{selectedProduct.size}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <a
                  href={getWhatsAppLink(selectedProduct)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                >
                  <Phone size={16} className="fill-current" />
                  <span>Send WhatsApp Inquiry</span>
                </a>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="w-full py-2.5 bg-amber-50 hover:bg-amber-100/60 text-amber-900 rounded-xl font-bold text-xs text-center transition-all duration-300 cursor-pointer"
                >
                  Back to collection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-amber-950 text-amber-100 py-12 px-4 md:px-8 border-t border-amber-900">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0">
          <div className="text-center md:text-left space-y-2">
            <h4 className="font-serif font-bold text-lg tracking-wide text-white">JSK Art Jewellery</h4>
            <p className="text-xs text-amber-200/60">© 2026 JSK Art Jewellery. All Rights Reserved.</p>
          </div>
          <div className="flex items-center space-x-4">
            <a
              href={`https://wa.me/${whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 px-4 py-2 rounded-full text-xs font-semibold border border-emerald-500/20 transition-all duration-300"
            >
              <Phone size={14} className="fill-current" />
              <span>Contact Us</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
