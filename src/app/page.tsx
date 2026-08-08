"use client";

import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Search, Phone, Gift, Tag, Sparkles, Filter, Info, Eye, MessageCircle } from "lucide-react";

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
  const [whatsappNumber, setWhatsappNumber] = useState("918949075688"); // updated to user provided default
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

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
            imageUrls: data.imageUrls || (data.imageUrl ? [data.imageUrl] : []),
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

  const getFormattedWaNumber = () => {
    let num = whatsappNumber.replace(/\D/g, "");
    return num.length === 10 ? "91" + num : num;
  };

  const getWhatsAppLink = (product: Product) => {
    const displayPrice = product.discountPrice ? product.discountPrice : product.price;
    const prodImage = product.imageUrls?.[0] || product.imageUrl || "";
    const text = `Hello JSK Art Jewellery, I am interested in this product:\n\n*Name:* ${product.name}\n*Price:* ₹${displayPrice.toLocaleString("en-IN")}\n*Category:* ${product.category}\n*Product ID:* ${product.id}\n*Image Link:* ${prodImage}\n\nPlease share more details.`;
    return `https://wa.me/${getFormattedWaNumber()}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAF8F5] to-[#F3EFE9] text-[#2C2620] font-sans selection:bg-amber-200">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#E6DEC9] px-4 py-4 md:px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-amber-700 flex items-center justify-center shadow-md">
            <span className="text-white font-serif font-bold text-xl">J</span>
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-serif font-bold tracking-wider text-amber-900 uppercase leading-none">
              JSK Art Jewellery
            </h1>
          </div>
        </div>

        <a
          href="#contact"
          className="text-xs md:text-sm font-semibold text-amber-800 hover:text-amber-950 uppercase tracking-wider transition-colors duration-300"
        >
          Contact
        </a>
      </header>

      {/* Hero Section */}
      <section 
        className="relative overflow-hidden py-16 md:py-24 px-4 text-center bg-cover bg-center"
        style={{ backgroundImage: "linear-gradient(to bottom, rgba(250, 248, 245, 0.2), rgba(250, 248, 245, 1)), url('/hero-bg.jpg')" }}
      >
        <div className="max-w-3xl mx-auto space-y-6 relative z-10 backdrop-blur-[2px] bg-white/30 p-8 rounded-3xl border border-white/40 shadow-xl">
          <div className="inline-flex items-center space-x-2 bg-amber-100/80 backdrop-blur-md border border-amber-200 rounded-full px-4 py-1.5 text-xs text-amber-900 font-bold animate-pulse">
            <Sparkles size={14} className="text-amber-600" />
            <span>Premium Handcrafted Jewellery</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-serif font-black tracking-tight text-amber-950 leading-tight drop-shadow-sm">
            Elevate Your Elegance with <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-700 to-amber-900">JSK</span>
          </h2>
          <p className="text-sm md:text-base text-amber-950/90 font-medium max-w-xl mx-auto leading-relaxed drop-shadow-sm">
            Discover our curated collection of fine art jewellery. Explore unique designs and connect with us on WhatsApp for inquiries.
          </p>

          {/* Search bar */}
          <div className="max-w-md mx-auto relative mt-6">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search size={16} className="text-amber-800/80" />
            </div>
            <input
              type="text"
              placeholder="Search collection..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 border border-amber-200 bg-white/90 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/50 text-sm md:text-base transition-all duration-300 rounded-full shadow-lg placeholder-amber-800/60 font-medium"
            />
          </div>
        </div>
      </section>

      {/* Main Catalog Section */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-10 pb-20 relative z-10">
        {/* Categories Bar */}
        <div className="flex space-x-3 overflow-x-auto pb-4 mb-8 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 whitespace-nowrap cursor-pointer border ${
                selectedCategory === category
                  ? "bg-amber-800 text-white border-amber-900 shadow-lg shadow-amber-800/20 scale-105"
                  : "bg-white/60 text-amber-900 border-amber-200/60 hover:bg-amber-100/50"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-800"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white/60 border border-amber-200/40 rounded-2xl p-10 text-center max-w-lg mx-auto shadow-sm">
            <p className="text-amber-900 font-bold text-lg">No products found</p>
            <p className="text-amber-800/70 text-sm mt-2">Try adjusting your search or category filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-5">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="group flex flex-col cursor-pointer bg-white rounded-xl overflow-hidden border border-amber-100 hover:border-amber-300 shadow-sm hover:shadow-md transition-all duration-300"
                onClick={() => {
                  setSelectedProduct(product);
                  setActiveImageIndex(0);
                }}
              >
                {/* Product Image */}
                <div className="relative aspect-[4/5] overflow-hidden bg-amber-50 border-b border-amber-50">
                  {product.imageUrls?.[0] || product.imageUrl ? (
                    <img
                      src={product.imageUrls?.[0] || product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-amber-800/30 space-y-2">
                      <Gift size={32} />
                      <span className="text-[10px] uppercase tracking-widest font-semibold">No Image</span>
                    </div>
                  )}
                  {product.stock <= 0 && (
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded-full">
                      Sold Out
                    </div>
                  )}
                  {product.discountPrice && product.stock > 0 && (
                    <div className="absolute top-2 right-2 bg-amber-600 text-white px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded-full shadow-sm">
                      Sale
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex flex-col space-y-1 p-3">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-amber-600">
                    {product.category}
                  </span>
                  <h3 className="font-serif font-bold text-sm text-amber-950 line-clamp-1 group-hover:text-amber-700 transition-colors">
                    {product.name}
                  </h3>
                  
                  <div className="flex items-baseline space-x-2 pt-1">
                    {product.discountPrice ? (
                      <>
                        <span className="text-sm font-bold text-amber-900">₹{product.discountPrice.toLocaleString("en-IN")}</span>
                        <span className="text-[10px] text-amber-900/50 line-through">₹{product.price.toLocaleString("en-IN")}</span>
                      </>
                    ) : (
                      <span className="text-sm font-bold text-amber-900">₹{product.price.toLocaleString("en-IN")}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating WhatsApp Button */}
      <a
        href={`https://wa.me/${getFormattedWaNumber()}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] hover:bg-[#20b858] text-white p-4 rounded-full shadow-xl hover:scale-110 transition-transform duration-300 flex items-center justify-center group"
        title="Chat on WhatsApp"
      >
        <MessageCircle size={28} className="fill-current text-white" />
        <span className="absolute right-full mr-4 bg-white text-gray-900 text-xs font-semibold px-3 py-2 rounded-lg shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300 whitespace-nowrap border border-gray-100">
          Chat with us on WhatsApp
        </span>
      </a>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 md:p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white w-full md:max-w-4xl min-h-screen md:min-h-[auto] md:rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row relative border border-amber-100">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 z-10 bg-white/90 text-amber-950 p-2 rounded-full shadow-md hover:bg-white transition-colors cursor-pointer"
            >
              ✕
            </button>

            {/* Modal Image & Video Carousel */}
            <div className="w-full md:w-1/2 bg-amber-50 flex flex-col relative aspect-square md:aspect-auto md:min-h-[550px] shrink-0">
              <div className="flex-1 overflow-hidden relative">
                {activeImageIndex === 999 && selectedProduct.videoUrl ? (
                  <video
                    src={selectedProduct.videoUrl}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-contain bg-black"
                  />
                ) : (
                  (selectedProduct.imageUrls?.[activeImageIndex] || selectedProduct.imageUrl) ? (
                    <img
                      src={selectedProduct.imageUrls?.[activeImageIndex] || selectedProduct.imageUrl}
                      alt={selectedProduct.name}
                      onClick={() => setLightboxImage(selectedProduct.imageUrls?.[activeImageIndex] || selectedProduct.imageUrl || null)}
                      className="w-full h-full object-contain absolute inset-0 transition-opacity duration-300 p-2 cursor-zoom-in"
                      title="Click to view full screen"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-amber-800/40">
                      <Gift size={48} className="mb-4 opacity-50" />
                      <p className="text-xs uppercase tracking-widest font-semibold">No Image Available</p>
                    </div>
                  )
                )}
              </div>
              {((selectedProduct.imageUrls && selectedProduct.imageUrls.length > 1) || selectedProduct.videoUrl) && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2 px-4">
                  <div className="flex space-x-2 bg-black/40 backdrop-blur-md p-1.5 rounded-xl overflow-x-auto max-w-full shadow-sm">
                    {selectedProduct.imageUrls?.map((url, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImageIndex(idx)}
                        className={`w-10 h-10 rounded-lg overflow-hidden shrink-0 transition-all cursor-pointer ${
                          activeImageIndex === idx ? "opacity-100 ring-2 ring-amber-400 ring-offset-1 ring-offset-transparent" : "opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img src={url} className="w-full h-full object-cover" />
                      </button>
                    ))}
                    {selectedProduct.videoUrl && (
                      <button
                        onClick={() => setActiveImageIndex(999)}
                        className={`w-10 h-10 rounded-lg bg-amber-950 flex items-center justify-center shrink-0 transition-all cursor-pointer text-white font-medium text-[10px] uppercase ${
                          activeImageIndex === 999 ? "opacity-100 ring-2 ring-amber-400 ring-offset-1 ring-offset-transparent" : "opacity-80 hover:opacity-100"
                        }`}
                      >
                        Video
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Details */}
            <div className="p-6 md:p-8 w-full md:w-1/2 flex flex-col overflow-y-auto">
              <div className="space-y-6">
                <div>
                  <span className="text-[10px] uppercase tracking-widest font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md mb-3 inline-block">
                    {selectedProduct.category}
                  </span>
                  <h3 className="font-serif font-black text-2xl md:text-3xl text-amber-950 leading-tight">
                    {selectedProduct.name}
                  </h3>
                  
                  <div className="flex items-baseline space-x-3 mt-4 border-b border-amber-50 pb-4">
                    {selectedProduct.discountPrice ? (
                      <>
                        <span className="text-3xl font-black text-amber-900">₹{selectedProduct.discountPrice.toLocaleString("en-IN")}</span>
                        <span className="text-lg font-bold text-amber-900/40 line-through">₹{selectedProduct.price.toLocaleString("en-IN")}</span>
                        <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-full ml-auto">
                          Sale
                        </span>
                      </>
                    ) : (
                      <span className="text-3xl font-black text-amber-900">₹{selectedProduct.price.toLocaleString("en-IN")}</span>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-sm text-amber-900/80 leading-relaxed whitespace-pre-wrap">
                    {selectedProduct.description || "No description available for this beautiful jewellery."}
                  </p>
                </div>

                {selectedProduct.size && (
                  <div className="pt-2">
                    <div className="text-xs text-amber-900/80 font-bold bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex justify-between items-center">
                      <span>Available Size:</span>
                      <span className="bg-white border border-amber-200 px-3 py-1 rounded shadow-sm">{selectedProduct.size}</span>
                    </div>
                  </div>
                )}
                
                <div className="pt-4">
                  <a
                    href={getWhatsAppLink(selectedProduct)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm uppercase tracking-widest flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transition-all cursor-pointer"
                  >
                    <Phone size={16} className="fill-current" />
                    <span>Inquire via WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer id="contact" className="bg-amber-950 text-amber-100 py-16 px-4 md:px-8 border-t border-amber-900 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start space-y-10 md:space-y-0">
          <div className="space-y-4 max-w-sm">
            <h4 className="font-serif font-bold text-xl uppercase tracking-wider text-white">Jsk art jewellery</h4>
            <div className="text-sm text-amber-200/80 leading-relaxed space-y-1">
              <p>Tripoliya bazar 1st gali kamla bazar jodhpur (Raj.)</p>
              <p>Pin code:- 342001</p>
              <p className="pt-2 text-white font-semibold">Mo.no:- 8949075688</p>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Quick Links</h4>
            <div className="flex flex-col space-y-3">
              <button onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} className="text-sm text-amber-200/80 hover:text-white text-left transition-colors">Shop Collection</button>
              <a href={`https://wa.me/${getFormattedWaNumber()}`} target="_blank" rel="noopener noreferrer" className="text-sm text-amber-200/80 hover:text-white text-left transition-colors">WhatsApp Support</a>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-amber-900/50 flex flex-col md:flex-row justify-between items-center text-xs text-amber-600">
          <p>© {new Date().getFullYear()} Jsk art jewellery. All Rights Reserved.</p>
        </div>
      </footer>
      {/* Lightbox Modal for Full Screen Image */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-6 right-6 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full font-bold text-lg cursor-pointer transition-colors"
          >
            ✕
          </button>
          <img 
            src={lightboxImage} 
            alt="Full size view" 
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
