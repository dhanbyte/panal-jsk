"use client";

import React, { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  serverTimestamp,
  query,
  orderBy
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import { 
  LayoutDashboard, 
  Plus, 
  Receipt, 
  CreditCard, 
  Package, 
  Settings, 
  LogOut, 
  Trash2, 
  Edit3, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Search, 
  Share2, 
  FileText, 
  Upload,
  User,
  Phone,
  IndianRupee,
  Save
} from "lucide-react";

// Register jspdf-autotable plugins dynamically
import autoTable from "jspdf-autotable";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  imageUrl?: string;
  imageUrls: string[];
  description: string;
  lowStockThreshold?: number;
  discountPrice?: number;
  purchasePrice?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  size?: string;
  videoUrl?: string;
  soldCount?: number;
  barcode?: string;
}

interface BillItem {
  productId?: string;
  name: string;
  price: number;
  quantity: number;
  purchasePrice?: number;
  cgstRate?: number;
  sgstRate?: number;
  igstRate?: number;
}

interface Bill {
  id: string;
  billNo: string;
  customerName: string;
  customerPhone: string;
  items: BillItem[];
  subtotal: number;
  discount: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  totalCost: number;
  paymentStatus: "Paid" | "Unpaid" | "Partially Paid";
  paymentMethod: string;
  amountPaid: number;
  amountDue: number;
  dueDate?: string;
  pdfUrl?: string;
  createdAt: any;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"dashboard" | "products" | "stock" | "billing" | "ledger" | "settings">("dashboard");

  // State collections
  const [products, setProducts] = useState<Product[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [whatsappNumber, setWhatsappNumber] = useState("919999999999");
  const [upiId, setUpiId] = useState("");
  const [showUpiQrModal, setShowUpiQrModal] = useState(false);
  const [upiQrAmount, setUpiQrAmount] = useState("0");
  const [loadingData, setLoadingData] = useState(true);

  // Business Invoice Customization States
  const [businessName, setBusinessName] = useState("JSK ART JEWELLERY");
  const [businessSub, setBusinessSub] = useState("Wholesalers & Mfrs of Diamond and Gold Jewellery");
  const [businessAddress, setBusinessAddress] = useState("No. 123, 2nd Floor, Sowcarpet, CHENNAI - 600079");
  const [businessGstin, setBusinessGstin] = useState("33AAEFJ2110L1ZS");
  const [businessEmail, setBusinessEmail] = useState("jskjewellers@gmail.com");
  const [bankName, setBankName] = useState("Indian Overseas Bank");
  const [bankAccount, setBankAccount] = useState("008602000009235");
  const [bankIfsc, setBankIfsc] = useState("IOBA0000086");
  const [businessLogo, setBusinessLogo] = useState("");
  const [businessInstagram, setBusinessInstagram] = useState("@jsk_art_jewellery");
  const [customRemark, setCustomRemark] = useState("No E-Way Bill is required as the Goods covered under this Invoice are Exempted.");
  const [showBankDetails, setShowBankDetails] = useState(true);
  const [whatsappChannelUrl, setWhatsappChannelUrl] = useState("");

  // Custom Settings States
  const [customCategories, setCustomCategories] = useState<string[]>(["Rings", "Necklaces", "Earrings", "Bangles", "Other"]);
  const [defaultGst, setDefaultGst] = useState({ cgst: 1.5, sgst: 1.5, igst: 0 });

  // Product Form State
  const [productForm, setProductForm] = useState({
    id: "",
    name: "",
    price: "",
    discountPrice: "",
    purchasePrice: "",
    cgst: "",
    sgst: "",
    igst: "",
    stock: "",
    category: "Rings",
    description: "",
    lowStockThreshold: "5",
    size: "",
    videoUrl: "",
    barcode: "",
    existingImageUrls: [] as string[]
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [productSubmitLoading, setProductSubmitLoading] = useState(false);

  // Billing State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [billItems, setBillItems] = useState<BillItem[]>([{ productId: "", name: "", price: 0, quantity: 1, purchasePrice: 0, cgstRate: 1.5, sgstRate: 1.5, igstRate: 0 }]);
  const [billDiscount, setBillDiscount] = useState("0");
  const [billCgst, setBillCgst] = useState("1.5");
  const [billSgst, setBillSgst] = useState("1.5");
  const [billIgst, setBillIgst] = useState("0");
  const [paymentStatus, setPaymentStatus] = useState<"Paid" | "Unpaid" | "Partially Paid">("Paid");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [amountPaid, setAmountPaid] = useState("0");
  const [amountPaidCash, setAmountPaidCash] = useState("0");
  const [amountPaidUPI, setAmountPaidUPI] = useState("0");
  const [amountPaidCredit, setAmountPaidCredit] = useState("0");
  const [dueDate, setDueDate] = useState("");
  const [billingSubmitLoading, setBillingSubmitLoading] = useState(false);
  const [barcodeSearchInput, setBarcodeSearchInput] = useState("");

  // Restocking & Purchases State
  const [purchases, setPurchases] = useState<any[]>([]);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  
  // Barcode Tag States
  const [barcodeTagProduct, setBarcodeTagProduct] = useState<Product | null>(null);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeQuantity, setBarcodeQuantity] = useState(1);
  const [barcodeLayout, setBarcodeLayout] = useState<"single" | "a4">("single");
  const [barcodeColumns, setBarcodeColumns] = useState(3);
  const [barcodeSkipLabels, setBarcodeSkipLabels] = useState(0);
  const [barcodeShowBorder, setBarcodeShowBorder] = useState(true);
  const [barcodeTagSize, setBarcodeTagSize] = useState<"small" | "medium" | "large">("medium");
  const [restockQty, setRestockQty] = useState("");
  const [restockCost, setRestockCost] = useState("");
  const [restockSellPrice, setRestockSellPrice] = useState("");

  // E-Bill QR Modal state
  const [showQrModal, setShowQrModal] = useState(false);
  const [currentBillUrl, setCurrentBillUrl] = useState("");
  const [currentBillNo, setCurrentBillNo] = useState("");
  const [currentBillPhone, setCurrentBillPhone] = useState("");
  const [currentBillText, setCurrentBillText] = useState("");

  // Filter States
  const [productSearch, setProductSearch] = useState("");
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState("All");
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<"All" | "Sales" | "Purchases">("All");
  const [ledgerDateFilter, setLedgerDateFilter] = useState<"All" | "Today" | "Week" | "Month" | "Custom">("All");
  const [ledgerStartDate, setLedgerStartDate] = useState("");
  const [ledgerEndDate, setLedgerEndDate] = useState("");

  // Settings UI State
  const [newCategory, setNewCategory] = useState("");

  // Check auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
      } else {
        setAdminUser(user);
        fetchData();
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  // Global Barcode Scan Listener for Billing Screen
  useEffect(() => {
    if (activeTab !== "billing") return;

    let buffer = "";
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      
      // If operator is typing inside inputs (like Customer Name/Phone), ignore global scans to prevent corruption
      if (activeEl && (
        activeEl.tagName === "INPUT" || 
        activeEl.tagName === "TEXTAREA"
      )) {
        const placeholder = activeEl.getAttribute("placeholder");
        if (placeholder !== "Click here & scan barcode...") {
          return;
        }
      }

      const currentTime = Date.now();
      
      // Scanner inputs are extremely fast (typically < 30ms interval)
      // Reset buffer if delay is larger than 150ms to support clean scans
      if (currentTime - lastKeyTime > 150) {
        buffer = "";
      }

      if (e.key === "Enter") {
        if (buffer.length > 2) {
          e.preventDefault();
          handleBarcodeScan(buffer, true);
          buffer = "";
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
        lastKeyTime = currentTime;
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [activeTab, products, billItems]);

  // Fetch from Firestore
  const fetchData = async () => {
    setLoadingData(true);
    try {
      // Products
      const productsSnapshot = await getDocs(collection(db, "products"));
      const productsList: Product[] = [];
      productsSnapshot.forEach((doc) => {
        const data = doc.data();
        productsList.push({
          id: doc.id,
          name: data.name || "",
          price: Number(data.price) || 0,
          discountPrice: data.discountPrice ? Number(data.discountPrice) : undefined,
          purchasePrice: data.purchasePrice ? Number(data.purchasePrice) : undefined,
          cgst: data.cgst ? Number(data.cgst) : undefined,
          sgst: data.sgst ? Number(data.sgst) : undefined,
          igst: data.igst ? Number(data.igst) : undefined,
          stock: Number(data.stock) || 0,
          category: data.category || "Rings",
          imageUrl: data.imageUrl || "",
          imageUrls: data.imageUrls || (data.imageUrl ? [data.imageUrl] : []),
          description: data.description || "",
          lowStockThreshold: Number(data.lowStockThreshold) || 5,
          size: data.size || "",
          videoUrl: data.videoUrl || "",
          soldCount: Number(data.soldCount) || 0,
          barcode: data.barcode || ""
        });
      });
      setProducts(productsList);

      // Bills
      const billsQuery = query(collection(db, "bills"), orderBy("createdAt", "desc"));
      const billsSnapshot = await getDocs(billsQuery);
      const billsList: Bill[] = [];
      billsSnapshot.forEach((doc) => {
        const data = doc.data();
        billsList.push({
          id: doc.id,
          billNo: data.billNo || "",
          customerName: data.customerName || "",
          customerPhone: data.customerPhone || "",
          items: data.items || [],
          subtotal: Number(data.subtotal) || 0,
          discount: Number(data.discount) || 0,
          cgst: Number(data.cgst) || 0,
          sgst: Number(data.sgst) || 0,
          igst: Number(data.igst) || 0,
          total: Number(data.total) || 0,
          totalCost: Number(data.totalCost) || 0,
          paymentStatus: data.paymentStatus || "Paid",
          paymentMethod: data.paymentMethod || "Cash",
          amountPaid: Number(data.amountPaid) || 0,
          amountDue: Number(data.amountDue) || 0,
          dueDate: data.dueDate || "",
          pdfUrl: data.pdfUrl || "",
          createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
        });
      });
      setBills(billsList);

      // Purchases
      const purchasesList: any[] = [];
      try {
        const purchasesSnapshot = await getDocs(query(collection(db, "purchases"), orderBy("createdAt", "desc")));
        purchasesSnapshot.forEach((docSnap) => {
          const pdata = docSnap.data();
          purchasesList.push({
            id: docSnap.id,
            productId: pdata.productId || "",
            productName: pdata.productName || "",
            quantity: Number(pdata.quantity) || 0,
            purchasePrice: Number(pdata.purchasePrice) || 0,
            totalCost: Number(pdata.totalCost) || 0,
            createdAt: pdata.createdAt ? pdata.createdAt.toDate() : new Date()
          });
        });
      } catch (err) {
        console.error("Error loading purchases:", err);
      }
      setPurchases(purchasesList);

      // Settings
      const settingsSnapshot = await getDocs(collection(db, "settings"));
      settingsSnapshot.forEach((doc) => {
        if (doc.id === "contact") {
          if (doc.data().whatsapp) setWhatsappNumber(doc.data().whatsapp);
          if (doc.data().upiId) setUpiId(doc.data().upiId);
        }
        if (doc.id === "invoice") {
          const idata = doc.data();
          if (idata.businessName) setBusinessName(idata.businessName);
          if (idata.businessSub) setBusinessSub(idata.businessSub);
          if (idata.businessAddress) setBusinessAddress(idata.businessAddress);
          if (idata.businessGstin) setBusinessGstin(idata.businessGstin);
          if (idata.businessEmail) setBusinessEmail(idata.businessEmail);
          if (idata.bankName) setBankName(idata.bankName);
          if (idata.bankAccount) setBankAccount(idata.bankAccount);
          if (idata.bankIfsc) setBankIfsc(idata.bankIfsc);
          if (idata.businessLogo) setBusinessLogo(idata.businessLogo);
          if (idata.businessInstagram) setBusinessInstagram(idata.businessInstagram);
          if (idata.customRemark) setCustomRemark(idata.customRemark);
          if (idata.showBankDetails !== undefined) setShowBankDetails(idata.showBankDetails);
          if (idata.whatsappChannelUrl !== undefined) setWhatsappChannelUrl(idata.whatsappChannelUrl);
        }
        if (doc.id === "categories" && doc.data().list) {
          setCustomCategories(doc.data().list);
        }
        if (doc.id === "gst") {
          setDefaultGst({
            cgst: doc.data().cgst || 0,
            sgst: doc.data().sgst || 0,
            igst: doc.data().igst || 0
          });
        }
      });
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  // Create or Update Product
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProductSubmitLoading(true);

    try {
      let uploadedUrls: string[] = [...productForm.existingImageUrls];

      if (imageFiles.length > 0) {
        for (const file of imageFiles) {
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch("/api/upload", { method: "POST", body: formData });
          if (!res.ok) throw new Error("Upload failed");
          const data = await res.json();
          uploadedUrls.push(data.url);
        }
      }

      let uploadedVideoUrl = productForm.videoUrl;
      if (videoFile) {
        const formData = new FormData();
        formData.append("file", videoFile);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Video upload failed");
        const data = await res.json();
        uploadedVideoUrl = data.url;
      }

      let finalBarcode = productForm.barcode ? productForm.barcode.trim() : "";
      if (!finalBarcode) {
        finalBarcode = "JSK-" + Math.floor(100000 + Math.random() * 900000).toString();
      }

      const productPayload = {
        name: productForm.name,
        price: Number(productForm.price),
        discountPrice: productForm.discountPrice ? Number(productForm.discountPrice) : null,
        purchasePrice: productForm.purchasePrice ? Number(productForm.purchasePrice) : null,
        cgst: productForm.cgst ? Number(productForm.cgst) : defaultGst.cgst,
        sgst: productForm.sgst ? Number(productForm.sgst) : defaultGst.sgst,
        igst: productForm.igst ? Number(productForm.igst) : defaultGst.igst,
        stock: Number(productForm.stock),
        category: productForm.category,
        description: productForm.description,
        size: productForm.size,
        videoUrl: uploadedVideoUrl,
        imageUrls: uploadedUrls.length > 0 ? uploadedUrls : ["https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&auto=format&fit=crop&q=60"],
        lowStockThreshold: Number(productForm.lowStockThreshold) || 5,
        barcode: finalBarcode,
        updatedAt: serverTimestamp()
      };

      if (productForm.id) {
        // Edit existing
        await updateDoc(doc(db, "products", productForm.id), productPayload);
      } else {
        // Create new
        await addDoc(collection(db, "products"), {
          ...productPayload,
          soldCount: 0,
          createdAt: serverTimestamp()
        });
      }

      // Reset form
      setProductForm({
        id: "",
        name: "",
        price: "",
        discountPrice: "",
        purchasePrice: "",
        cgst: defaultGst.cgst.toString(),
        sgst: defaultGst.sgst.toString(),
        igst: defaultGst.igst.toString(),
        stock: "",
        category: customCategories[0] || "Rings",
        description: "",
        lowStockThreshold: "5",
        size: "",
        videoUrl: "",
        barcode: "",
        existingImageUrls: []
      });
      setImageFiles([]);
      setVideoFile(null);
      fetchData();
      alert("Product saved successfully!");
    } catch (err) {
      console.error("Error saving product:", err);
      alert("Failed to save product.");
    } finally {
      setProductSubmitLoading(false);
    }
  };

  const handleEditProduct = (product: Product) => {
    setProductForm({
      id: product.id,
      name: product.name,
      price: product.price.toString(),
      discountPrice: product.discountPrice?.toString() || "",
      purchasePrice: product.purchasePrice?.toString() || "",
      cgst: (product.cgst ?? defaultGst.cgst).toString(),
      sgst: (product.sgst ?? defaultGst.sgst).toString(),
      igst: (product.igst ?? defaultGst.igst).toString(),
      stock: product.stock.toString(),
      category: product.category,
      description: product.description,
      lowStockThreshold: (product.lowStockThreshold || 5).toString(),
      size: product.size || "",
      videoUrl: product.videoUrl || "",
      barcode: product.barcode || "",
      existingImageUrls: product.imageUrls || (product.imageUrl ? [product.imageUrl] : [])
    });
    setImageFiles([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteDoc(doc(db, "products", id));
        fetchData();
      } catch (err) {
        console.error("Error deleting product:", err);
      }
    }
  };

  const handleQuickStockUpdate = async (productId: string, newStockVal: string) => {
    const stockVal = Number(newStockVal);
    if (isNaN(stockVal) || stockVal < 0) {
      alert("Please enter a valid stock number.");
      return;
    }
    try {
      await updateDoc(doc(db, "products", productId), { stock: stockVal });
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to update stock.");
    }
  };

  const handleQuickPriceUpdate = async (productId: string, newPrice: string, newCost: string) => {
    const priceVal = Number(newPrice);
    const costVal = Number(newCost);
    if (isNaN(priceVal) || priceVal < 0) {
      alert("Please enter a valid selling price.");
      return;
    }
    try {
      const updates: any = { price: priceVal };
      if (!isNaN(costVal) && costVal >= 0) {
        updates.purchasePrice = costVal;
      }
      await updateDoc(doc(db, "products", productId), updates);
      fetchData();
      alert("Prices updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to update prices.");
    }
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockProduct || !restockQty || !restockCost) {
      alert("Please enter restocking quantity and cost price.");
      return;
    }
    const qty = Number(restockQty);
    const addedCost = Number(restockCost);
    const newSell = restockSellPrice ? Number(restockSellPrice) : restockProduct.price;

    if (isNaN(qty) || qty <= 0) {
      alert("Invalid restocking quantity.");
      return;
    }
    if (isNaN(addedCost) || addedCost < 0) {
      alert("Invalid purchase cost.");
      return;
    }

    try {
      // Calculate weighted average costing
      const currentStock = restockProduct.stock;
      const currentCost = restockProduct.purchasePrice || 0;
      const totalNewQty = currentStock + qty;

      let calculatedCost = addedCost;
      if (totalNewQty > 0) {
        calculatedCost = Number((((currentStock * currentCost) + (qty * addedCost)) / totalNewQty).toFixed(2));
      }

      // Update product
      await updateDoc(doc(db, "products", restockProduct.id), {
        stock: totalNewQty,
        purchasePrice: calculatedCost,
        price: newSell
      });

      // Log purchase transaction
      await addDoc(collection(db, "purchases"), {
        productId: restockProduct.id,
        productName: restockProduct.name,
        quantity: qty,
        purchasePrice: addedCost,
        totalCost: qty * addedCost,
        createdAt: serverTimestamp()
      });

      alert("Restocked successfully!");
      setShowRestockModal(false);
      setRestockQty("");
      setRestockCost("");
      setRestockSellPrice("");
      setRestockProduct(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to restock.");
    }
  };

  // Add sample products if empty to make UI gorgeous
  const handleAddSamples = async () => {
    setLoadingData(true);
    try {
      const sampleItems = [
        { name: "Royal Gold Kundan Necklace Set", price: 125000, stock: 3, category: "Necklaces", description: "Elegant handcrafted kundan set with ruby and emerald stone drops. Complete bridal heritage collection.", imageUrls: ["https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&auto=format&fit=crop&q=60"], lowStockThreshold: 2 },
        { name: "Vintage Diamond Gold Ring", price: 45000, stock: 12, category: "Rings", description: "18k gold engagement ring studded with certified solitaire diamonds and intricate side filigree.", imageUrls: ["https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&auto=format&fit=crop&q=60"], lowStockThreshold: 4 },
        { name: "Traditional Kundan Jhumka", price: 18500, stock: 2, category: "Earrings", description: "Traditional gold plated pearls and kundan work heavy jhumkas for weddings and festivals.", imageUrls: ["https://images.unsplash.com/photo-1635767798638-3e25273a8236?w=600&auto=format&fit=crop&q=60"], lowStockThreshold: 3 },
        { name: "Gold Filigree Bridal Bangle Set", price: 89000, stock: 6, category: "Bangles", description: "Pair of 22k premium gold bangles showcasing hand engraved traditional Indian filigree art.", imageUrls: ["https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600&auto=format&fit=crop&q=60"], lowStockThreshold: 2 },
      ];

      for (const item of sampleItems) {
        await addDoc(collection(db, "products"), {
          ...item,
          createdAt: serverTimestamp()
        });
      }
      fetchData();
      alert("Sample products added successfully!");
    } catch (err) {
      console.error(err);
      alert("Error adding sample products.");
    } finally {
      setLoadingData(false);
    }
  };

  // Billing Item Handlers
  const addBillItem = () => {
    setBillItems([...billItems, { name: "", price: 0, quantity: 1, purchasePrice: 0, cgstRate: defaultGst.cgst, sgstRate: defaultGst.sgst, igstRate: defaultGst.igst }]);
  };

  const removeBillItem = (index: number) => {
    const items = [...billItems];
    items.splice(index, 1);
    setBillItems(items);
  };

  const updateBillItem = (index: number, field: keyof BillItem, value: any) => {
    const items = [...billItems];
    if (field === "name") {
      items[index][field] = value;
    } else {
      (items[index] as any)[field] = Number(value) || 0;
    }
    setBillItems(items);
  };

  const selectProductForBill = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const items = [...billItems];
      items[index].productId = product.id;
      items[index].name = product.name;
      items[index].price = product.discountPrice || product.price;
      items[index].purchasePrice = product.purchasePrice || 0;
      items[index].cgstRate = product.cgst ?? defaultGst.cgst;
      items[index].sgstRate = product.sgst ?? defaultGst.sgst;
      items[index].igstRate = product.igst ?? defaultGst.igst;
      setBillItems(items);
    }
  };

  // Calculate Invoice Totals (per-item GST)
  const calculateInvoice = () => {
    const subtotal = billItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalCost = billItems.reduce((sum, item) => sum + ((item.purchasePrice || 0) * item.quantity), 0);
    const discount = Number(billDiscount) || 0;
    const taxableAmount = Math.max(0, subtotal - discount);
    
    // Calculate taxes using bill level values
    const totalCgst = Number((taxableAmount * (Number(billCgst) / 100)).toFixed(2));
    const totalSgst = Number((taxableAmount * (Number(billSgst) / 100)).toFixed(2));
    const totalIgst = Number((taxableAmount * (Number(billIgst) / 100)).toFixed(2));

    const total = Number((taxableAmount + totalCgst + totalSgst + totalIgst).toFixed(2));
    
    const cashVal = Number(amountPaidCash) || 0;
    const upiVal = Number(amountPaidUPI) || 0;
    const actualPaid = cashVal + upiVal;
    
    const due = Math.max(0, total - actualPaid);
    const profit = total - discount - totalCost;

    return { subtotal, discount, cgst: totalCgst, sgst: totalSgst, igst: totalIgst, total, due, totalCost, profit, actualPaid };
  };

  const { subtotal, discount: calculatedDiscount, cgst, sgst, igst, total, due, totalCost, profit: billProfit, actualPaid } = calculateInvoice();

  const handlePaymentStatusChange = (status: "Paid" | "Unpaid" | "Partially Paid") => {
    setPaymentStatus(status);
    if (status === "Paid") {
      setPaymentMethod("Cash");
      setAmountPaidCash(total.toString());
      setAmountPaidUPI("0");
    } else if (status === "Unpaid") {
      setPaymentMethod("Credit");
      setAmountPaidCash("0");
      setAmountPaidUPI("0");
    } else if (status === "Partially Paid") {
      setPaymentMethod("Split");
      setAmountPaidCash("0");
      setAmountPaidUPI("0");
    }
  };

  const handlePaymentMethodChange = (method: string) => {
    setPaymentMethod(method);
    if (method === "Cash") {
      setAmountPaidCash(total.toString());
      setAmountPaidUPI("0");
    } else if (method === "UPI") {
      setAmountPaidUPI(total.toString());
      setAmountPaidCash("0");
    } else if (method === "Split") {
      setAmountPaidCash((total / 2).toString());
      setAmountPaidUPI((total / 2).toString());
    }
  };

  // Keep payment values in sync with grand total when total changes
  React.useEffect(() => {
    if (paymentStatus === "Paid") {
      if (paymentMethod === "Cash") {
        setAmountPaidCash(total.toString());
        setAmountPaidUPI("0");
      } else if (paymentMethod === "UPI") {
        setAmountPaidUPI(total.toString());
        setAmountPaidCash("0");
      } else if (paymentMethod === "Split") {
        const cashVal = Number(amountPaidCash) || 0;
        const upiVal = Number(amountPaidUPI) || 0;
        if (cashVal + upiVal !== total) {
          setAmountPaidCash(total.toString());
          setAmountPaidUPI("0");
        }
      }
    }
  }, [total, paymentStatus, paymentMethod]);

  const numberToWords = (num: number): string => {
    const a = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convertLessThanOneThousand = (n: number): string => {
      if (n < 20) return a[n];
      const digit = n % 10;
      if (n < 100) return b[Math.floor(n / 10)] + (digit ? ' ' + a[digit] : '');
      return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 === 0 ? '' : ' and ' + convertLessThanOneThousand(n % 100));
    };

    const convert = (n: number): string => {
      if (n === 0) return 'Zero';
      let words = '';
      
      // Lakhs (Indian system)
      if (Math.floor(n / 100000) > 0) {
        words += convertLessThanOneThousand(Math.floor(n / 100000)) + ' Lakh ';
        n %= 100000;
      }
      // Thousands
      if (Math.floor(n / 1000) > 0) {
        words += convertLessThanOneThousand(Math.floor(n / 1000)) + ' Thousand ';
        n %= 1000;
      }
      // Ones/Tens/Hundreds
      if (n > 0) {
        words += convertLessThanOneThousand(n);
      }
      return words.trim();
    };

    const integerPart = Math.floor(num);
    const decimalPart = Math.round((num - integerPart) * 100);

    let result = convert(integerPart) + ' Rupees';
    if (decimalPart > 0) {
      result += ' and ' + convert(decimalPart) + ' Paise';
    }
    return result + ' Only';
  };

  const playBeep = (error = false) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = "sine";
      if (error) {
        oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.15);
        
        setTimeout(() => {
          const osc2 = audioCtx.createOscillator();
          const gain2 = audioCtx.createGain();
          osc2.connect(gain2);
          gain2.connect(audioCtx.destination);
          osc2.type = "sine";
          osc2.frequency.setValueAtTime(150, audioCtx.currentTime);
          gain2.gain.setValueAtTime(0.08, audioCtx.currentTime);
          osc2.start();
          osc2.stop(audioCtx.currentTime + 0.15);
        }, 180);
      } else {
        oscillator.frequency.setValueAtTime(750, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.08);
      }
    } catch (e) {
      console.warn("Web Audio not supported:", e);
    }
  };

  const handleBarcodeScan = (code: string, force = false) => {
    if (!code) return;
    const cleanCode = code.trim().toLowerCase();
    const product = products.find(p => p.barcode && p.barcode.trim().toLowerCase() === cleanCode);
    
    if (product) {
      const existingIndex = billItems.findIndex(item => item.productId === product.id);
      
      if (existingIndex > -1) {
        const updated = [...billItems];
        updated[existingIndex].quantity += 1;
        setBillItems(updated);
      } else {
        const newItem: BillItem = {
          productId: product.id,
          name: product.name,
          price: product.discountPrice || product.price,
          quantity: 1,
          purchasePrice: product.purchasePrice || 0,
          cgstRate: product.cgst ?? defaultGst.cgst,
          sgstRate: product.sgst ?? defaultGst.sgst,
          igstRate: product.igst ?? defaultGst.igst
        };
        
        if (billItems.length === 1 && !billItems[0].productId && !billItems[0].name) {
          setBillItems([newItem]);
        } else {
          setBillItems([...billItems, newItem]);
        }
      }
      
      playBeep(false);
      setBarcodeSearchInput("");
    } else if (force) {
      playBeep(true);
      alert(`Product with barcode "${code}" not found.`);
      setBarcodeSearchInput("");
    }
  };

  // Create Bill & Upload PDF
  const handleBillingSubmit = async (e: React.FormEvent, saveOnly = false) => {
    if (e) e.preventDefault();
    if (!customerName || !customerPhone) {
      alert("Please enter customer name and mobile number.");
      return;
    }
    setBillingSubmitLoading(true);

    try {
      const billNo = "JSK-" + Date.now().toString().slice(-6);
      let downloadUrl = "";

      const cashVal = Number(amountPaidCash) || 0;
      const upiVal = Number(amountPaidUPI) || 0;
      const creditVal = Number(amountPaidCredit) || due;
      const totalPaid = cashVal + upiVal;

      if (!saveOnly) {
        try {
          // Generate PDF doc
          const docPdf = new jsPDF();
          
          // Draw Watermark
          docPdf.setFont("helvetica", "bold");
          docPdf.setFontSize(80);
          docPdf.setTextColor(242, 238, 230); // Very light gold/gray watermark
          docPdf.text("JSK", 105, 150, { angle: 45, align: "center" });
          
          // Draw Logo
          const drawDiamondLogo = () => {
            docPdf.setDrawColor(180, 140, 60); // Gold tone
            docPdf.setLineWidth(0.5);
            docPdf.line(22, 11, 32, 11); // top horizontal
            docPdf.line(22, 11, 17, 17); // top left diagonal
            docPdf.line(32, 11, 37, 17); // top right diagonal
            docPdf.line(17, 17, 27, 27); // bottom left diagonal
            docPdf.line(37, 17, 27, 27); // bottom right diagonal
            docPdf.line(17, 17, 37, 17); // middle horizontal
            docPdf.line(27, 11, 27, 27); // vertical center
          };

          if (businessLogo) {
            try {
              docPdf.addImage(businessLogo, "PNG", 16, 10, 16, 16);
            } catch (err) {
              console.warn("Failed to render custom logo, falling back:", err);
              drawDiamondLogo();
            }
          } else {
            drawDiamondLogo();
          }
          
          // Brand Title
          docPdf.setFont("helvetica", "bold");
          docPdf.setFontSize(20);
          docPdf.setTextColor(44, 38, 32);
          docPdf.text(businessName, 43, 19);
          
          docPdf.setFont("helvetica", "normal");
          docPdf.setFontSize(8.5);
          docPdf.setTextColor(180, 140, 60);
          docPdf.text(businessSub, 43, 24);

          // Gold band decoration
          docPdf.setFillColor(180, 140, 60);
          docPdf.rect(14, 29, 182, 3, "F");

          // Document Type Title
          docPdf.setFont("helvetica", "bold");
          docPdf.setFontSize(11);
          docPdf.setTextColor(40, 40, 40);
          docPdf.text("GST INVOICE", 90, 39);
          docPdf.setFont("helvetica", "italic");
          docPdf.setFontSize(7.5);
          docPdf.setTextColor(120, 120, 120);
          docPdf.text("(ORIGINAL FOR RECIPIENT)", 84, 43);

          // --- SUPPLIER & INVOICE DETAILS ---
          docPdf.setFont("helvetica", "bold");
          docPdf.setFontSize(8.5);
          docPdf.setTextColor(40, 40, 40);
          docPdf.text(businessName, 14, 51);
          
          docPdf.setFont("helvetica", "normal");
          docPdf.setFontSize(7.5);
          docPdf.setTextColor(80, 80, 80);
          
          const addrLines = docPdf.splitTextToSize(businessAddress, 90);
          docPdf.text(addrLines, 14, 56);
          const addrHeight = addrLines.length * 4.5;
          
          docPdf.text(`GSTIN/UIN: ${businessGstin}`, 14, 56 + addrHeight);
          docPdf.text(`E-Mail: ${businessEmail}`, 14, 60.5 + addrHeight);
          if (businessInstagram) {
            docPdf.text(`Instagram: ${businessInstagram}`, 14, 65 + addrHeight);
          }

          // Invoice Details
          docPdf.setFont("helvetica", "bold");
          docPdf.text("Invoice No.", 120, 51);
          docPdf.text("Dated", 160, 51);
          docPdf.setFont("helvetica", "normal");
          docPdf.text(billNo, 120, 56);
          docPdf.text(new Date().toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }), 160, 56);
          
          docPdf.setFont("helvetica", "bold");
          docPdf.text("Place of Supply", 120, 64);
          docPdf.setFont("helvetica", "normal");
          docPdf.text("At Chennai", 120, 68);

          // Divider
          docPdf.setDrawColor(220, 220, 220);
          docPdf.line(14, 76, 196, 76);

          // --- BUYER DETAILS ---
          docPdf.setFont("helvetica", "bold");
          docPdf.text("BUYER (CUSTOMER)", 14, 82);
          docPdf.setFont("helvetica", "normal");
          docPdf.text(`Name: ${customerName}`, 14, 87);
          docPdf.text(`Mobile: ${customerPhone}`, 14, 91);
          docPdf.text("State Name: Tamil Nadu, Code: 33", 14, 95);

          // --- ITEMS TABLE ---
          const tableData = billItems.map((item, index) => [
            index + 1,
            item.name,
            item.productId ? (products.find(p => p.id === item.productId)?.size || "-") : "-",
            `Rs. ${item.price.toLocaleString("en-IN")}`,
            item.quantity,
            `Rs. ${(item.price * item.quantity).toLocaleString("en-IN")}`
          ]);

          autoTable(docPdf, {
            startY: 100,
            head: [["Sl No.", "Description of Goods", "Size/Weight", "Unit Price", "Qty", "Amount"]],
            body: tableData,
            theme: "grid",
            headStyles: { fillColor: [44, 38, 32], textColor: [250, 245, 235], fontStyle: "bold" },
            styles: { fontSize: 8, cellPadding: 2 },
            columnStyles: {
              0: { cellWidth: 12 },
              1: { cellWidth: 80 },
              2: { cellWidth: 25, halign: "center" },
              3: { cellWidth: 25, halign: "right" },
              4: { cellWidth: 12, halign: "center" },
              5: { cellWidth: 28, halign: "right" }
            }
          });

          const finalY = (docPdf as any).lastAutoTable.finalY + 8;

          // --- TAXATION SUMMARY ---
          docPdf.setFont("helvetica", "normal");
          docPdf.setFontSize(7.5);
          docPdf.setTextColor(80, 80, 80);
          
          docPdf.text(`Subtotal:`, 125, finalY);
          docPdf.text(`Rs. ${subtotal.toLocaleString("en-IN")}`, 196, finalY, { align: "right" });
          
          docPdf.text(`Output CGST @ ${billCgst}%:`, 125, finalY + 4);
          docPdf.text(`Rs. ${cgst.toLocaleString("en-IN")}`, 196, finalY + 4, { align: "right" });
          
          docPdf.text(`Output SGST @ ${billSgst}%:`, 125, finalY + 8);
          docPdf.text(`Rs. ${sgst.toLocaleString("en-IN")}`, 196, finalY + 8, { align: "right" });
          
          if (igst > 0) {
            docPdf.text(`Output IGST @ ${billIgst}%:`, 125, finalY + 12);
            docPdf.text(`Rs. ${igst.toLocaleString("en-IN")}`, 196, finalY + 12, { align: "right" });
          }

          const discountY = finalY + 12 + (igst > 0 ? 4 : 0);
          docPdf.text(`Discount & Rounding:`, 125, discountY);
          docPdf.text(`- Rs. ${calculatedDiscount.toLocaleString("en-IN")}`, 196, discountY, { align: "right" });

          const totalY = discountY + 6;
          docPdf.setFont("helvetica", "bold");
          docPdf.setTextColor(44, 38, 32);
          docPdf.text(`Grand Total:`, 125, totalY);
          docPdf.text(`Rs. ${total.toLocaleString("en-IN")}`, 196, totalY, { align: "right" });

          // Amount in Words Box
          docPdf.setFont("helvetica", "bold");
          docPdf.setFontSize(7.5);
          docPdf.text("Amount Chargeable (in words):", 14, finalY);
          docPdf.setFont("helvetica", "normal");
          const wordsLines = docPdf.splitTextToSize(numberToWords(total), 100);
          docPdf.text(wordsLines, 14, finalY + 4);

          // Tax Amount in Words Box
          const totalTaxAmount = cgst + sgst + igst;
          docPdf.setFont("helvetica", "bold");
          docPdf.text("Tax Amount (in words):", 14, finalY + 14);
          docPdf.setFont("helvetica", "normal");
          const taxWordsLines = docPdf.splitTextToSize(numberToWords(totalTaxAmount), 100);
          docPdf.text(taxWordsLines, 14, finalY + 18);

          // Divider separator
          docPdf.setDrawColor(200, 200, 200);
          docPdf.line(14, totalY + 8, 196, totalY + 8);

          // --- REMARKS & BANK DETAILS ---
          const footerY = totalY + 13;
          docPdf.setFont("helvetica", "bold");
          docPdf.text("Remarks:", 14, footerY);
          docPdf.setFont("helvetica", "normal");
          docPdf.setFontSize(6.5);
          docPdf.setTextColor(120, 120, 120);
          const remarksText = docPdf.splitTextToSize(customRemark || "No E-Way Bill is required.", 70);
          docPdf.text(remarksText, 14, footerY + 3);

          // Bank Details or WhatsApp QR Code
          if (showBankDetails) {
            docPdf.setFont("helvetica", "bold");
            docPdf.setFontSize(7.5);
            docPdf.setTextColor(40, 40, 40);
            docPdf.text("Company's Bank Details:", 90, footerY);
            docPdf.setFont("helvetica", "normal");
            docPdf.text(`Bank Name : ${bankName}`, 90, footerY + 4);
            docPdf.text(`A/c No.     : ${bankAccount}`, 90, footerY + 8);
            docPdf.text(`IFSC Code : ${bankIfsc}`, 90, footerY + 12);
          } else if (whatsappChannelUrl) {
            try {
              const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(whatsappChannelUrl)}`;
              docPdf.setFont("helvetica", "bold");
              docPdf.setFontSize(7.5);
              docPdf.setTextColor(40, 40, 40);
              docPdf.text("Join Our WhatsApp:", 90, footerY);
              docPdf.addImage(qrCodeUrl, "JPEG", 90, footerY + 2, 12, 12);
            } catch (err) {
              console.warn("Failed to render WhatsApp channel QR on PDF:", err);
            }
          }

          // Signatures
          docPdf.setFont("helvetica", "bold");
          docPdf.text(`for ${businessName}`, 150, footerY);
          docPdf.setFont("helvetica", "normal");
          docPdf.setFontSize(6.5);
          docPdf.text("Authorised Signatory", 153, footerY + 16);
          
          docPdf.text("Customer's Seal and Signature", 14, footerY + 16);

          docPdf.setDrawColor(180, 180, 180);
          docPdf.line(150, footerY + 12, 190, footerY + 12); // Auth line
          docPdf.line(14, footerY + 12, 60, footerY + 12); // Cust line

          // Convert PDF to Blob
          const pdfBlob = docPdf.output("blob");
          
          try {
            // Upload PDF to Firebase Storage
            const pdfRef = ref(storage, `invoices/${billNo}.pdf`);
            const uploadResult = await uploadBytes(pdfRef, pdfBlob);
            downloadUrl = await getDownloadURL(uploadResult.ref);
          } catch (storageErr) {
            console.error("Firebase Storage upload failed, downloading locally:", storageErr);
            docPdf.save(`${billNo}.pdf`);
            alert("Firebase Storage upload failed (Check Firebase configuration/permissions). Invoice PDF has been downloaded directly to your device.");
          }
        } catch (pdfErr) {
          console.error("PDF generation/compilation failed:", pdfErr);
          alert("Error generating PDF invoice. The transaction will still be saved to the database.");
        }
      }

      // Save Invoice to Firestore
      const billPayload: any = {
        billNo,
        customerName,
        customerPhone,
        items: billItems,
        subtotal,
        discount: calculatedDiscount,
        cgst,
        sgst,
        igst,
        total,
        totalCost,
        paymentStatus,
        paymentMethod: paymentMethod === "Split" ? "Split" : paymentMethod,
        amountPaid: totalPaid,
        amountPaidCash: cashVal,
        amountPaidUPI: upiVal,
        amountPaidCredit: creditVal,
        amountDue: due,
        dueDate: dueDate || "",
        pdfUrl: downloadUrl,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, "bills"), billPayload);

      // Update product stocks and sold counts locally/database
      for (const item of billItems) {
        let matchingProd = null;
        if (item.productId) {
          matchingProd = products.find(p => p.id === item.productId);
        } else {
          matchingProd = products.find(p => p.name.trim().toLowerCase() === item.name.trim().toLowerCase());
        }

        if (matchingProd) {
          const newStock = Math.max(0, matchingProd.stock - item.quantity);
          const newSold = (matchingProd.soldCount || 0) + item.quantity;
          await updateDoc(doc(db, "products", matchingProd.id), {
            stock: newStock,
            soldCount: newSold
          });
        }
      }

      if (!saveOnly) {
        // Populate QR Modal states
        const shareText = `*JSK Art Jewellery Invoice*\n\nDear *${customerName}*,\nThank you for shopping with us.\n\n*Invoice No:* ${billNo}\n*Grand Total:* ₹${total.toLocaleString("en-IN")}\n*Amount Paid:* ₹${totalPaid.toLocaleString("en-IN")}\n*Amount Due:* ₹${due.toLocaleString("en-IN")}\n*Status:* ${paymentStatus}\n\nYou can view and download your full GST invoice PDF here:\n${downloadUrl}`;
        
        setCurrentBillUrl(downloadUrl);
        setCurrentBillNo(billNo);
        setCurrentBillPhone(customerPhone);
        setCurrentBillText(shareText);
        setShowQrModal(true);
      } else {
        alert(`Invoice ${billNo} saved successfully without PDF generation!`);
      }

      // Reset Billing form
      setCustomerName("");
      setCustomerPhone("");
      setBillItems([{ productId: "", name: "", price: 0, quantity: 1, purchasePrice: 0, cgstRate: defaultGst.cgst, sgstRate: defaultGst.sgst, igstRate: defaultGst.igst }]);
      setBillDiscount("0");
      setBillCgst("1.5");
      setBillSgst("1.5");
      setBillIgst("0");
      setAmountPaid("0");
      setAmountPaidCash("0");
      setAmountPaidUPI("0");
      setAmountPaidCredit("0");
      setDueDate("");
      setPaymentMethod("Cash");
      
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to create bill: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setBillingSubmitLoading(false);
    }
  };

  // Update payment directly in Ledger
  const handleUpdatePayment = async (billId: string, currentPaid: number, totalAmount: number) => {
    const additionalPayment = prompt(`Enter additional amount paid for this customer (Outstanding: ₹${(totalAmount - currentPaid).toLocaleString("en-IN")}):`);
    if (additionalPayment === null) return;
    
    const paymentVal = Number(additionalPayment);
    if (isNaN(paymentVal) || paymentVal <= 0) {
      alert("Invalid payment amount.");
      return;
    }

    const newPaid = currentPaid + paymentVal;
    const newDue = Math.max(0, totalAmount - newPaid);
    const newStatus = newDue <= 0 ? "Paid" : "Partially Paid";

    try {
      await updateDoc(doc(db, "bills", billId), {
        amountPaid: newPaid,
        amountDue: newDue,
        paymentStatus: newStatus
      });
      fetchData();
      alert("Payment status updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Error updating payment.");
    }
  };

  const downloadTallyCSV = () => {
    const headers = [
      "Date",
      "Voucher No",
      "Voucher Type",
      "Party Name",
      "Mobile",
      "Gross Amount (INR)",
      "CGST Amount (INR)",
      "SGST Amount (INR)",
      "IGST Amount (INR)",
      "Remaining Due (INR)",
      "Payment Mode",
      "Items Details"
    ];

    const csvRows = [headers.join(",")];

    for (const tx of filteredLedger) {
      const formattedDate = tx.createdAt
        ? tx.createdAt.toLocaleDateString("en-IN", { day: '2-digit', month: '2-digit', year: 'numeric' })
        : "";
      
      const itemsString = tx.items.map((i: any) => `${i.name} (x${i.quantity})`).join("; ");
      
      // Escape quotes and commas in fields
      const escapeField = (val: any) => {
        const text = String(val ?? "").replace(/"/g, '""');
        return text.includes(",") || text.includes("\n") || text.includes(";") ? `"${text}"` : text;
      };

      const row = [
        formattedDate,
        tx.refNo,
        tx.type === "Sale" ? "Sales" : "Purchase",
        escapeField(tx.customerName),
        escapeField(tx.customerPhone),
        tx.totalAmount,
        tx.totalCost ? (tx.cgst || 0) : 0,
        tx.totalCost ? (tx.sgst || 0) : 0,
        tx.totalCost ? (tx.igst || 0) : 0,
        tx.amountDue || 0,
        escapeField(tx.paymentMethod),
        escapeField(itemsString)
      ];
      csvRows.push(row.join(","));
    }

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `JSK_Tally_Ledger_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, "settings", "contact"), { whatsapp: whatsappNumber, upiId: upiId });
      await setDoc(doc(db, "settings", "categories"), { list: customCategories });
      await setDoc(doc(db, "settings", "invoice"), {
        businessName,
        businessSub,
        businessAddress,
        businessGstin,
        businessEmail,
        bankName,
        bankAccount,
        bankIfsc,
        businessLogo,
        businessInstagram,
        customRemark,
        showBankDetails,
        whatsappChannelUrl
      });
      await setDoc(doc(db, "settings", "gst"), { 
        cgst: defaultGst.cgst, 
        sgst: defaultGst.sgst, 
        igst: defaultGst.igst 
      });
      alert("Settings updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save settings.");
    }
  };

  const handleAddCategory = () => {
    if (newCategory.trim() && !customCategories.includes(newCategory.trim())) {
      setCustomCategories([...customCategories, newCategory.trim()]);
      setNewCategory("");
    }
  };

  const handleRemoveCategory = (catToRemove: string) => {
    setCustomCategories(customCategories.filter(cat => cat !== catToRemove));
  };

  // Filtered Products for Inventory
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.category.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Filtered Bills for Ledger
  // Combine bills (Sales) and purchases (Purchases) into a consolidated ledger list
  const getLedgerTransactions = () => {
    const transactions: any[] = [];
    
    // Add Sales
    bills.forEach(bill => {
      transactions.push({
        id: bill.id,
        type: "Sale",
        refNo: bill.billNo,
        customerName: bill.customerName,
        customerPhone: bill.customerPhone,
        totalAmount: bill.total,
        amountPaid: bill.amountPaid,
        amountDue: bill.amountDue,
        dueDate: bill.dueDate,
        paymentStatus: bill.paymentStatus,
        paymentMethod: bill.paymentMethod || "Cash",
        pdfUrl: bill.pdfUrl,
        totalCost: bill.totalCost || 0,
        profit: bill.total - bill.discount - (bill.totalCost || 0),
        items: bill.items || [],
        createdAt: bill.createdAt
      });
    });

    // Add Purchases (Restocks)
    purchases.forEach(p => {
      transactions.push({
        id: p.id,
        type: "Purchase",
        refNo: `PO-${p.id.slice(-5).toUpperCase()}`,
        customerName: "Supplier (Restock)",
        customerPhone: "-",
        totalAmount: p.totalCost,
        amountPaid: p.totalCost,
        amountDue: 0,
        dueDate: "",
        paymentStatus: "Paid",
        paymentMethod: "Cash/Paid",
        pdfUrl: "",
        totalCost: p.totalCost,
        profit: 0,
        items: [{ productId: p.productId, name: p.productName, price: p.purchasePrice, quantity: p.quantity, purchasePrice: p.purchasePrice }],
        createdAt: p.createdAt
      });
    });

    // Sort by Date descending
    transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return transactions;
  };

  const filteredLedger = getLedgerTransactions().filter(tx => {
    // Search
    const matchesSearch = 
      tx.customerName.toLowerCase().includes(ledgerSearch.toLowerCase()) || 
      tx.customerPhone.includes(ledgerSearch) ||
      tx.refNo.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      tx.items.some((item: any) => item.name.toLowerCase().includes(ledgerSearch.toLowerCase()));

    // Type Filter
    const matchesType = 
      ledgerTypeFilter === "All" || 
      (ledgerTypeFilter === "Sales" && tx.type === "Sale") || 
      (ledgerTypeFilter === "Purchases" && tx.type === "Purchase");

    // Status Filter (only for Sales)
    const matchesStatus = 
      ledgerStatusFilter === "All" || 
      (tx.type === "Sale" && tx.paymentStatus === ledgerStatusFilter);

    // Date Filter
    let matchesDate = true;
    
    // Work on a copy of Date so we do not modify original
    const txDate = new Date(tx.createdAt);
    txDate.setHours(0,0,0,0);
    
    if (ledgerDateFilter === "Today") {
      const today = new Date();
      today.setHours(0,0,0,0);
      matchesDate = txDate.getTime() === today.getTime();
    } else if (ledgerDateFilter === "Week") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0,0,0,0);
      matchesDate = txDate.getTime() >= weekAgo.getTime();
    } else if (ledgerDateFilter === "Month") {
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      monthAgo.setHours(0,0,0,0);
      matchesDate = txDate.getTime() >= monthAgo.getTime();
    } else if (ledgerDateFilter === "Custom") {
      if (ledgerStartDate) {
        const start = new Date(ledgerStartDate);
        start.setHours(0,0,0,0);
        matchesDate = matchesDate && txDate.getTime() >= start.getTime();
      }
      if (ledgerEndDate) {
        const end = new Date(ledgerEndDate);
        end.setHours(23,59,59,999);
        matchesDate = matchesDate && txDate.getTime() <= end.getTime();
      }
    }

    return matchesSearch && matchesType && matchesStatus && matchesDate;
  });

  // Dashboard Aggregates
  const totalSales = bills.reduce((sum, b) => sum + b.total, 0);
  const totalPaidAmount = bills.reduce((sum, b) => sum + b.amountPaid, 0);
  const totalDueAmount = bills.reduce((sum, b) => sum + b.amountDue, 0);
  const totalCostOfGoods = bills.reduce((sum, b) => sum + (b.totalCost || 0), 0);
  const totalProfit = totalSales - totalCostOfGoods;
  const inventoryValue = products.reduce((sum, p) => sum + ((p.purchasePrice || 0) * p.stock), 0);
  const lowStockProducts = products.filter(p => p.stock <= (p.lowStockThreshold || 5));
  
  // Due date reminders
  const overdueBills = bills.filter(b => {
    if (b.amountDue <= 0 || !b.dueDate) return false;
    return new Date(b.dueDate) <= new Date();
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-800"></div>
      </div>
    );
  }

  if (!adminUser) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAF8F5] to-[#F3EFE9] text-[#2C2620] font-sans flex flex-col md:flex-row">
      
      {/* Sidebar for Desktop / Bottom Nav for Mobile */}
      <aside className="w-full md:w-64 bg-amber-950 text-amber-50 shrink-0 border-r border-amber-900 flex flex-col justify-between py-6 px-4 md:sticky md:top-0 md:h-screen">
        <div className="space-y-8">
          {/* Brand header */}
          <div className="flex items-center space-x-2 border-b border-amber-900 pb-4">
            <div className="w-9 h-9 rounded-full bg-amber-600 flex items-center justify-center">
              <span className="text-white font-serif font-black text-lg">J</span>
            </div>
            <div>
              <h2 className="font-serif font-bold text-sm tracking-wide text-white">JSK Art</h2>
              <span className="text-[9px] tracking-wider uppercase text-amber-400 font-bold">Admin Panel</span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible space-x-2 md:space-x-0 md:space-y-1.5 scrollbar-hide py-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center space-x-2.5 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-300 whitespace-nowrap cursor-pointer ${
                activeTab === "dashboard" ? "bg-amber-800 text-white shadow-md" : "hover:bg-amber-900/40 text-amber-200"
              }`}
            >
              <LayoutDashboard size={16} />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab("products")}
              className={`flex items-center space-x-2.5 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-300 whitespace-nowrap cursor-pointer ${
                activeTab === "products" ? "bg-amber-800 text-white shadow-md" : "hover:bg-amber-900/40 text-amber-200"
              }`}
            >
              <Package size={16} />
              <span>Products</span>
            </button>

            <button
              onClick={() => setActiveTab("stock")}
              className={`flex items-center space-x-2.5 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-300 whitespace-nowrap cursor-pointer ${
                activeTab === "stock" ? "bg-amber-800 text-white shadow-md" : "hover:bg-amber-900/40 text-amber-200"
              }`}
            >
              <Package size={16} />
              <span>Stock Section</span>
            </button>

            <button
              onClick={() => setActiveTab("billing")}
              className={`flex items-center space-x-2.5 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-300 whitespace-nowrap cursor-pointer ${
                activeTab === "billing" ? "bg-amber-800 text-white shadow-md" : "hover:bg-amber-900/40 text-amber-200"
              }`}
            >
              <Receipt size={16} />
              <span>Create Bill</span>
            </button>

            <button
              onClick={() => setActiveTab("ledger")}
              className={`flex items-center space-x-2.5 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-300 whitespace-nowrap cursor-pointer ${
                activeTab === "ledger" ? "bg-amber-800 text-white shadow-md" : "hover:bg-amber-900/40 text-amber-200"
              }`}
            >
              <CreditCard size={16} />
              <span>Hisab (Ledger)</span>
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center space-x-2.5 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-300 whitespace-nowrap cursor-pointer ${
                activeTab === "settings" ? "bg-amber-800 text-white shadow-md" : "hover:bg-amber-900/40 text-amber-200"
              }`}
            >
              <Settings size={16} />
              <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* Footer Logout */}
        <div className="border-t border-amber-900 pt-4 mt-6 md:mt-0 flex items-center justify-between">
          <span className="text-[10px] text-amber-300/60 font-semibold truncate max-w-[120px]">
            {adminUser.email}
          </span>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-amber-900/60 rounded-lg text-amber-300 hover:text-white transition-colors cursor-pointer"
            title="Log Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-6xl mx-auto w-full">
        {loadingData ? (
          <div className="flex flex-col items-center justify-center py-20 h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-800"></div>
            <p className="mt-4 text-amber-800/80 font-medium">Fetching details...</p>
          </div>
        ) : (
          <>
            {/* TAB: DASHBOARD */}
            {activeTab === "dashboard" && (
              <div className="space-y-8 animate-fade-in">
                <div className="flex justify-between items-center">
                  <h2 className="font-serif font-black text-2xl md:text-3xl text-amber-950">Overview Dashboard</h2>
                  <button 
                    onClick={handleAddSamples}
                    className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-200 px-3.5 py-1.5 rounded-full font-bold transition-all cursor-pointer"
                  >
                    + Load Demo Products
                  </button>
                </div>

                {/* Grid cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-amber-100/60 shadow-sm">
                    <span className="text-[10px] font-bold text-amber-900/50 block">Total Revenue</span>
                    <span className="text-lg font-black text-amber-950">₹{totalSales.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-amber-100/60 shadow-sm">
                    <span className="text-[10px] font-bold text-amber-900/50 block">Total Cost</span>
                    <span className="text-lg font-black text-amber-950">₹{totalCostOfGoods.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-emerald-100/60 shadow-sm">
                    <span className="text-[10px] font-bold text-emerald-900/50 block">Net Profit</span>
                    <span className={`text-lg font-black ${totalProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>₹{totalProfit.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-amber-100/60 shadow-sm">
                    <span className="text-[10px] font-bold text-amber-900/50 block">Received</span>
                    <span className="text-lg font-black text-emerald-950">₹{totalPaidAmount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-rose-100/60 shadow-sm">
                    <span className="text-[10px] font-bold text-amber-900/50 block">Outstanding</span>
                    <span className="text-lg font-black text-rose-700">₹{totalDueAmount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-amber-100/60 shadow-sm">
                    <span className="text-[10px] font-bold text-amber-900/50 block">Inventory Value</span>
                    <span className="text-lg font-black text-amber-950">₹{inventoryValue.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                {/* Overdue Reminders */}
                {overdueBills.length > 0 && (
                  <div className="bg-rose-50 rounded-2xl border border-rose-200 p-6 shadow-sm space-y-4">
                    <div className="flex items-center space-x-2 text-rose-800">
                      <AlertTriangle size={20} className="text-rose-600 animate-pulse" />
                      <h3 className="font-serif font-bold text-lg text-rose-950">⚠️ Payment Overdue Reminders ({overdueBills.length})</h3>
                    </div>
                    <div className="overflow-x-auto border border-rose-100 rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-rose-100/50 text-rose-900 uppercase font-bold border-b border-rose-200">
                          <tr>
                            <th className="p-3">Customer</th>
                            <th className="p-3">Bill No</th>
                            <th className="p-3">Due Amount</th>
                            <th className="p-3">Due Date</th>
                            <th className="p-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-rose-50">
                          {overdueBills.map(bill => (
                            <tr key={bill.id} className="hover:bg-rose-50/30">
                              <td className="p-3 font-bold text-rose-950">{bill.customerName}</td>
                              <td className="p-3 font-mono text-rose-900">{bill.billNo}</td>
                              <td className="p-3 font-bold text-rose-700">₹{bill.amountDue.toLocaleString("en-IN")}</td>
                              <td className="p-3 text-rose-800">{new Date(bill.dueDate!).toLocaleDateString("en-IN")}</td>
                              <td className="p-3 text-right">
                                <button 
                                  onClick={() => handleUpdatePayment(bill.id, bill.amountPaid, bill.total)}
                                  className="text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1.5 rounded transition-all cursor-pointer"
                                >
                                  Collect Payment
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Low Stock Alerts */}
                <div className="bg-white rounded-2xl border border-amber-100/60 p-6 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2 text-amber-800">
                    <AlertTriangle size={20} className="text-amber-600 animate-bounce" />
                    <h3 className="font-serif font-bold text-lg text-amber-950">Low Stock Warnings</h3>
                  </div>

                  {lowStockProducts.length === 0 ? (
                    <p className="text-xs text-amber-900/60 bg-amber-50/40 p-4 rounded-xl font-medium border border-dashed border-amber-200">
                      ✓ All products are sufficiently stocked.
                    </p>
                  ) : (
                    <div className="overflow-x-auto border border-amber-100/40 rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-amber-50/50 text-amber-900 uppercase font-bold border-b border-amber-100">
                          <tr>
                            <th className="p-3">Product Name</th>
                            <th className="p-3 text-center">Current Stock</th>
                            <th className="p-3 text-center">Alert Limit</th>
                            <th className="p-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-50">
                          {lowStockProducts.map(prod => (
                            <tr key={prod.id} className="hover:bg-amber-50/30">
                              <td className="p-3 font-semibold text-amber-950">{prod.name}</td>
                              <td className="p-3 text-center font-bold text-rose-600 bg-rose-50/30">{prod.stock}</td>
                              <td className="p-3 text-center text-amber-900/60">{prod.lowStockThreshold || 5}</td>
                              <td className="p-3 text-right">
                                <button 
                                  onClick={() => handleEditProduct(prod)}
                                  className="text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded transition-all cursor-pointer"
                                >
                                  Update Stock
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: PRODUCTS */}
            {activeTab === "products" && (
              <div className="space-y-8 animate-fade-in">
                <h2 className="font-serif font-black text-2xl md:text-3xl text-amber-950">Product Inventory</h2>

                {/* Add/Edit Product Form */}
                <form onSubmit={handleProductSubmit} className="bg-white p-6 rounded-2xl border border-amber-100/60 shadow-sm space-y-6">
                  <h3 className="font-serif font-bold text-lg text-amber-950 border-b border-amber-50 pb-2">
                    {productForm.id ? "Edit Product Details" : "Add New Jewelry Design"}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-amber-900/70">Design Name</label>
                      <input
                        type="text"
                        required
                        value={productForm.name}
                        onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                        className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-amber-50/10 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        placeholder="e.g. Diamond Studded Gold Ring"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-amber-900/70">Selling Price (₹)</label>
                      <input
                        type="number"
                        required
                        value={productForm.price}
                        onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                        className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-amber-50/10 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        placeholder="Customer selling price"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-emerald-900/70">Purchase Price (₹) <span className="text-[9px] text-amber-900/40">(Your Cost - Private)</span></label>
                      <input
                        type="number"
                        value={productForm.purchasePrice}
                        onChange={(e) => setProductForm({ ...productForm, purchasePrice: e.target.value })}
                        className="w-full border border-emerald-200/80 rounded-xl px-3 py-2 text-sm bg-emerald-50/10 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="Kitne me padha (Your cost)"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-amber-900/70">Discount Price (₹) (Optional)</label>
                      <input
                        type="number"
                        value={productForm.discountPrice}
                        onChange={(e) => setProductForm({ ...productForm, discountPrice: e.target.value })}
                        className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-amber-50/10 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        placeholder="Discounted selling price"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-amber-900/70">Stock Quantity</label>
                      <input
                        type="number"
                        required
                        value={productForm.stock}
                        onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                        className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-amber-50/10 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        placeholder="Available Stock"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-amber-900/70">Category</label>
                      <select
                        value={productForm.category}
                        onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                        className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-amber-50/10 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      >
                        {customCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-amber-900/70">CGST (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={productForm.cgst}
                        onChange={(e) => setProductForm({ ...productForm, cgst: e.target.value })}
                        className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-amber-50/10 focus:outline-none"
                        placeholder="CGST %"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-amber-900/70">SGST (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={productForm.sgst}
                        onChange={(e) => setProductForm({ ...productForm, sgst: e.target.value })}
                        className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-amber-50/10 focus:outline-none"
                        placeholder="SGST %"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-amber-900/70">Low Stock Limit Alert</label>
                      <input
                        type="number"
                        value={productForm.lowStockThreshold}
                        onChange={(e) => setProductForm({ ...productForm, lowStockThreshold: e.target.value })}
                        className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-amber-50/10 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        placeholder="Alert stock value"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-amber-900/70">Size (e.g. 12, 14 or Adjustable)</label>
                      <input
                        type="text"
                        value={productForm.size}
                        onChange={(e) => setProductForm({ ...productForm, size: e.target.value })}
                        className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-amber-50/10 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        placeholder="e.g. Ring size: 14"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-amber-900/70">Barcode (Leave blank to auto-generate)</label>
                      <input
                        type="text"
                        value={productForm.barcode}
                        onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
                        className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-amber-50/10 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        placeholder="Scan or type barcode"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-amber-900/70">Video Link / URL (Optional)</label>
                      <input
                        type="text"
                        value={productForm.videoUrl}
                        onChange={(e) => setProductForm({ ...productForm, videoUrl: e.target.value })}
                        className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-amber-50/10 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        placeholder="Direct mp4 / Video URL"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-amber-900/70">Upload Product Video (Optional)</label>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setVideoFile(e.target.files[0]);
                          }
                        }}
                        className="w-full text-xs text-amber-800 file:mr-4 file:py-1.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-amber-900 hover:file:bg-amber-200 cursor-pointer"
                      />
                      {videoFile && <p className="text-[10px] text-emerald-700 font-semibold truncate">Selected: {videoFile.name}</p>}
                    </div>

                    <div className="space-y-1 md:col-span-3">
                      <label className="text-xs font-bold text-amber-900/70 flex items-center space-x-1">
                        <Upload size={14} />
                        <span>Product Images (Multiple allowed)</span>
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          if (e.target.files) {
                            setImageFiles(Array.from(e.target.files));
                          }
                        }}
                        className="w-full text-xs text-amber-800 file:mr-4 file:py-1.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-amber-900 hover:file:bg-amber-200 cursor-pointer"
                      />
                      
                      {/* Image Preview Area */}
                      {(productForm.existingImageUrls.length > 0 || imageFiles.length > 0) && (
                        <div className="flex flex-wrap gap-3 mt-3">
                          {productForm.existingImageUrls.map((url, i) => (
                            <div key={`existing-${i}`} className="relative group">
                              <img src={url} alt={`Preview ${i}`} className="w-16 h-16 object-cover rounded-lg border border-amber-200" />
                              <button
                                type="button"
                                onClick={() => setProductForm({
                                  ...productForm,
                                  existingImageUrls: productForm.existingImageUrls.filter((_, idx) => idx !== i)
                                })}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                          {imageFiles.map((file, i) => (
                            <div key={`new-${i}`} className="relative group">
                              <img src={URL.createObjectURL(file)} alt={`Preview ${i}`} className="w-16 h-16 object-cover rounded-lg border border-amber-200" />
                              <button
                                type="button"
                                onClick={() => setImageFiles(imageFiles.filter((_, idx) => idx !== i))}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-amber-900/70">Description / Details</label>
                    <textarea
                      value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                      className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-amber-50/10 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      rows={2}
                      placeholder="Add metal type, weight, dimensions or purity..."
                    />
                  </div>

                  <div className="flex space-x-3 pt-2">
                    <button
                      type="submit"
                      disabled={productSubmitLoading}
                      className="bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs px-6 py-2.5 rounded-xl flex items-center space-x-2 transition-all cursor-pointer"
                    >
                      {productSubmitLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      ) : (
                        <span>{productForm.id ? "Update Product" : "Publish & Save"}</span>
                      )}
                    </button>
                    {productForm.id && (
                      <button
                        type="button"
                        onClick={() => {
                          setProductForm({
                            id: "",
                            name: "",
                            price: "",
                            discountPrice: "",
                            purchasePrice: "",
                            cgst: defaultGst.cgst.toString(),
                            sgst: defaultGst.sgst.toString(),
                            igst: defaultGst.igst.toString(),
                            stock: "",
                            category: customCategories[0] || "Rings",
                            description: "",
                            lowStockThreshold: "5",
                            size: "",
                            videoUrl: "",
                            barcode: "",
                            existingImageUrls: []
                          });
                          setImageFiles([]);
                        }}
                        className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>

                {/* Inventory Table with search */}
                <div className="bg-white rounded-2xl border border-amber-100/60 p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
                    <h3 className="font-serif font-bold text-lg text-amber-950">Active Catalog</h3>
                    
                    <div className="relative w-full sm:w-64">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-amber-700/60">
                        <Search size={14} />
                      </div>
                      <input
                        type="text"
                        placeholder="Search product..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-1.5 rounded-full border border-amber-200 text-xs bg-amber-50/10 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  {filteredProducts.length === 0 ? (
                    <p className="text-xs text-amber-900/60 text-center py-6">No products available. Add one above.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-amber-50/50 text-amber-900 uppercase font-bold border-b border-amber-100">
                          <tr>
                            <th className="p-3">Design</th>
                            <th className="p-3">Category</th>
                            <th className="p-3">Barcode</th>
                            <th className="p-3">Size</th>
                            <th className="p-3">Price</th>
                            <th className="p-3">Cost</th>
                            <th className="p-3 text-center">Sold</th>
                            <th className="p-3 text-center">Stock</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-50">
                          {filteredProducts.map(prod => (
                            <tr key={prod.id} className="hover:bg-amber-50/20">
                              <td className="p-3">
                                <div className="flex items-center space-x-3">
                                  <img src={prod.imageUrls?.[0] || prod.imageUrl} alt={prod.name} className="w-10 h-10 object-cover rounded-lg border border-amber-100" />
                                  <div>
                                    <span className="font-bold text-amber-950 block">{prod.name}</span>
                                    <span className="text-[10px] text-amber-900/60 truncate max-w-[200px] block">{prod.description || "No description"}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 font-semibold text-amber-900">{prod.category}</td>
                              <td className="p-3 text-amber-900 font-mono">
                                {prod.barcode ? (
                                  <div className="flex flex-col items-start">
                                    <span className="font-bold text-[11px] text-amber-950">{prod.barcode}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setBarcodeTagProduct(prod);
                                        setShowBarcodeModal(true);
                                      }}
                                      className="text-[9px] text-amber-600 hover:text-amber-800 font-bold underline mt-0.5 text-left cursor-pointer"
                                    >
                                      Print Tag
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-amber-900/40">-</span>
                                )}
                              </td>
                              <td className="p-3 text-amber-900">{prod.size || "-"}</td>
                              <td className="p-3 font-bold text-amber-950">
                                {prod.discountPrice ? (
                                  <div className="flex flex-col">
                                    <span className="text-[10px] text-amber-900/50 line-through">₹{prod.price.toLocaleString("en-IN")}</span>
                                    <span>₹{prod.discountPrice.toLocaleString("en-IN")}</span>
                                  </div>
                                ) : (
                                  <span>₹{prod.price.toLocaleString("en-IN")}</span>
                                )}
                              </td>
                              <td className="p-3 font-medium text-emerald-800">
                                {prod.purchasePrice ? `₹${prod.purchasePrice.toLocaleString("en-IN")}` : "-"}
                              </td>
                              <td className="p-3 text-center font-semibold text-amber-950">
                                {prod.soldCount || 0}
                              </td>
                              <td className="p-3 text-center">
                                <span className={`font-bold px-2.5 py-1 rounded-full ${
                                  prod.stock <= 0
                                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                                    : prod.stock <= (prod.lowStockThreshold || 5)
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                }`}>
                                  {prod.stock <= 0 ? "Out of Stock" : `${prod.stock} Units`}
                                </span>
                              </td>
                              <td className="p-3 text-right space-x-1.5">
                                <button
                                  onClick={() => handleEditProduct(prod)}
                                  className="p-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-amber-800 cursor-pointer"
                                  title="Edit"
                                >
                                  <Edit3 size={12} />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(prod.id)}
                                  className="p-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-rose-800 cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: STOCK SECTION */}
            {activeTab === "stock" && (
              <div className="space-y-8 animate-fade-in">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h2 className="font-serif font-black text-2xl md:text-3xl text-amber-950">Stock & Inventory Report</h2>
                  
                  {/* Search and filters */}
                  <div className="relative w-full sm:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-amber-700/60">
                      <Search size={14} />
                    </div>
                    <input
                      type="text"
                      placeholder="Search stock catalog..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-full border border-amber-200 text-xs bg-amber-50/10 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Stock Warning & Status Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-amber-100/60 shadow-sm">
                    <span className="text-xs font-bold text-amber-900/50 block">Total Designs</span>
                    <span className="text-xl font-black text-amber-950">{products.length} Items</span>
                  </div>
                  
                  <div className="bg-white p-5 rounded-2xl border border-amber-100/60 shadow-sm">
                    <span className="text-xs font-bold text-amber-900/50 block">Out Of Stock</span>
                    <span className={`text-xl font-black ${products.filter(p => p.stock <= 0).length > 0 ? "text-rose-600 animate-pulse" : "text-amber-950"}`}>
                      {products.filter(p => p.stock <= 0).length} Designs
                    </span>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-amber-100/60 shadow-sm">
                    <span className="text-xs font-bold text-amber-900/50 block">Low Stock Alerts</span>
                    <span className={`text-xl font-black ${products.filter(p => p.stock > 0 && p.stock <= (p.lowStockThreshold || 5)).length > 0 ? "text-amber-600" : "text-amber-950"}`}>
                      {products.filter(p => p.stock > 0 && p.stock <= (p.lowStockThreshold || 5)).length} Designs
                    </span>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-amber-100/60 shadow-sm">
                    <span className="text-xs font-bold text-amber-900/50 block">Total Inventory Value</span>
                    <span className="text-xl font-black text-emerald-800">
                      ₹{products.reduce((sum, p) => sum + ((p.purchasePrice || 0) * p.stock), 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Stock Table */}
                <div className="bg-white rounded-2xl border border-amber-100/60 p-6 shadow-sm">
                  {filteredProducts.length === 0 ? (
                    <p className="text-xs text-amber-900/60 text-center py-6">No products found.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-amber-50/50 text-amber-900 uppercase font-bold border-b border-amber-100">
                          <tr>
                            <th className="p-3">Design Name</th>
                            <th className="p-3">Category</th>
                            <th className="p-3 text-center">Purchase Cost (₹)</th>
                            <th className="p-3 text-center">Selling Price (₹)</th>
                            <th className="p-3 text-center">Stock Level</th>
                            <th className="p-3 text-center">Sold</th>
                            <th className="p-3 text-center">Save Edit</th>
                            <th className="p-3 text-center">Restock Tool</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-50">
                          {filteredProducts.map(prod => (
                            <tr key={prod.id} className="hover:bg-amber-50/20">
                              <td className="p-3">
                                <div className="flex items-center space-x-3">
                                  <img src={prod.imageUrls?.[0] || prod.imageUrl} alt={prod.name} className="w-10 h-10 object-cover rounded-lg border border-amber-100" />
                                  <div>
                                    <span className="font-bold text-amber-950 block">{prod.name}</span>
                                    {prod.size && <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded mt-1 inline-block">Size: {prod.size}</span>}
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 font-semibold text-amber-900">{prod.category}</td>
                              
                              {/* Cost Price Input */}
                              <td className="p-3 text-center">
                                <input
                                  type="number"
                                  defaultValue={prod.purchasePrice || 0}
                                  id={`cost-input-${prod.id}`}
                                  className="w-24 text-center border border-amber-200/85 rounded-lg py-1 px-1.5 font-bold text-emerald-800 focus:ring-1 focus:ring-amber-500 bg-amber-50/10 focus:outline-none"
                                />
                              </td>

                              {/* Selling Price Input */}
                              <td className="p-3 text-center">
                                <input
                                  type="number"
                                  defaultValue={prod.price}
                                  id={`price-input-${prod.id}`}
                                  className="w-24 text-center border border-amber-200/85 rounded-lg py-1 px-1.5 font-bold text-amber-950 focus:ring-1 focus:ring-amber-500 bg-amber-50/10 focus:outline-none"
                                />
                              </td>

                              {/* Stock Input */}
                              <td className="p-3 text-center">
                                <div className="flex flex-col items-center space-y-1">
                                  <input
                                    type="number"
                                    defaultValue={prod.stock}
                                    id={`stock-input-${prod.id}`}
                                    className="w-16 border border-amber-200/85 rounded-lg py-1 text-center font-bold text-amber-900 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                                  />
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                    prod.stock <= 0
                                      ? "bg-rose-50 text-rose-700"
                                      : prod.stock <= (prod.lowStockThreshold || 5)
                                      ? "bg-amber-50 text-amber-700"
                                      : "bg-emerald-50 text-emerald-700"
                                  }`}>
                                    {prod.stock <= 0 ? "Out of Stock" : `${prod.stock} left`}
                                  </span>
                                </div>
                              </td>

                              <td className="p-3 text-center font-bold text-amber-950">
                                {prod.soldCount || 0} units
                              </td>

                              {/* Save Edit Button */}
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => {
                                    const stockEl = document.getElementById(`stock-input-${prod.id}`) as HTMLInputElement;
                                    const costEl = document.getElementById(`cost-input-${prod.id}`) as HTMLInputElement;
                                    const priceEl = document.getElementById(`price-input-${prod.id}`) as HTMLInputElement;
                                    if (stockEl) handleQuickStockUpdate(prod.id, stockEl.value);
                                    if (costEl && priceEl) handleQuickPriceUpdate(prod.id, priceEl.value, costEl.value);
                                  }}
                                  className="bg-amber-800 hover:bg-amber-900 text-white font-bold px-3 py-1.5 rounded-xl text-[10px] cursor-pointer shadow-sm flex items-center justify-center space-x-1"
                                >
                                  <Save size={10} />
                                  <span>Save</span>
                                </button>
                              </td>

                              {/* Restock Modal Trigger */}
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => {
                                    setRestockProduct(prod);
                                    setRestockCost(prod.purchasePrice?.toString() || "");
                                    setRestockQty("");
                                    setRestockSellPrice("");
                                    setShowRestockModal(true);
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl text-[10px] cursor-pointer shadow-sm"
                                >
                                  Restock +
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: BILLING */}
            {activeTab === "billing" && (
              <div className="space-y-8 animate-fade-in">
                <h2 className="font-serif font-black text-2xl md:text-3xl text-amber-950">Create Customer Bill</h2>

                <form onSubmit={handleBillingSubmit} className="bg-white p-6 rounded-2xl border border-amber-100/60 shadow-sm space-y-6">
                  
                  {/* Barcode Laser Scan Input */}
                  <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-amber-100 rounded-lg text-amber-800">
                        <Package size={20} className="animate-pulse" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-amber-950 block">USB Barcode Laser Scanner Active</span>
                        <span className="text-[10px] text-amber-900/60 font-medium">Click on the input field and scan a tag barcode to add it automatically.</span>
                      </div>
                    </div>
                    
                    <div className="relative w-full md:w-80">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-amber-700/60">
                        <Search size={14} />
                      </div>
                      <input
                        type="text"
                        placeholder="Click here & scan barcode..."
                        value={barcodeSearchInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBarcodeSearchInput(val);
                          handleBarcodeScan(val);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleBarcodeScan(barcodeSearchInput, true);
                          }
                        }}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-amber-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono font-bold"
                      />
                    </div>
                  </div>
                  
                  {/* Customer Information */}
                  <div className="space-y-4">
                    <h3 className="font-serif font-bold text-base text-amber-950 border-b border-amber-50 pb-1.5 flex items-center space-x-2">
                      <User size={18} className="text-amber-800" />
                      <span>Customer Details</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-amber-900/70">Customer Name</label>
                        <input
                          type="text"
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-amber-50/10 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          placeholder="Full Name"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-amber-900/70">Mobile Number (WhatsApp Enabled)</label>
                        <input
                          type="tel"
                          required
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-amber-50/10 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          placeholder="e.g. 9876543210 (without country code)"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bill Items (Manual and Selector) */}
                  <div className="space-y-4 pt-2">
                    <div className="flex justify-between items-center border-b border-amber-50 pb-1.5">
                      <h3 className="font-serif font-bold text-base text-amber-950 flex items-center space-x-2">
                        <Receipt size={18} className="text-amber-800" />
                        <span>Bill Items (Add Manual Details)</span>
                      </h3>
                      <button
                        type="button"
                        onClick={addBillItem}
                        className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 px-3.5 py-1.5 rounded-full font-bold cursor-pointer"
                      >
                        + Add Item Row
                      </button>
                    </div>

                    <div className="space-y-3">
                      {billItems.map((item, index) => (
                        <div key={index} className="flex flex-col md:flex-row items-end gap-3 bg-amber-50/15 p-4 rounded-xl border border-amber-100/40">
                          
                          {/* Autofill helper */}
                          <div className="w-full md:w-1/4 space-y-1">
                            <label className="text-[10px] font-bold text-amber-900/50 block">Autofill from Catalog</label>
                            <div className="flex items-center space-x-2">
                              {item.productId && (
                                <img
                                  src={products.find(p => p.id === item.productId)?.imageUrls?.[0] || products.find(p => p.id === item.productId)?.imageUrl || "/placeholder-jewel.jpg"}
                                  alt=""
                                  className="w-8 h-8 object-cover rounded-lg border border-amber-200/60 shrink-0 shadow-sm"
                                />
                              )}
                              <select
                                onChange={(e) => selectProductForBill(index, e.target.value)}
                                value={item.productId || ""}
                                className="w-full border border-amber-200/50 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none"
                              >
                                <option value="">-- Choose (Optional) --</option>
                                {products.filter(p => p.stock > 0).map(p => (
                                  <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="w-full md:flex-1 space-y-1">
                            <label className="text-[10px] font-bold text-amber-900/70">Item Name / Description</label>
                            <input
                              type="text"
                              required
                              value={item.name}
                              onChange={(e) => updateBillItem(index, "name", e.target.value)}
                              className="w-full border border-amber-200/80 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                              placeholder="e.g. Custom Gold Ring or Selected Design"
                            />
                          </div>

                          <div className="w-full md:w-28 space-y-1">
                            <label className="text-[10px] font-bold text-amber-900/70">Price (₹)</label>
                            <input
                              type="number"
                              required
                              value={item.price || ""}
                              onChange={(e) => updateBillItem(index, "price", e.target.value)}
                              className="w-full border border-amber-200/80 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                              placeholder="Amount"
                            />
                          </div>

                          <div className="w-full md:w-20 space-y-1">
                            <label className="text-[10px] font-bold text-amber-900/70">Qty</label>
                            <input
                              type="number"
                              required
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateBillItem(index, "quantity", e.target.value)}
                              className="w-full border border-amber-200/80 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </div>

                          {billItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeBillItem(index)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg cursor-pointer mb-0.5"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Discount, Tax and Status */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-amber-900/70">Flat Discount (₹)</label>
                      <input
                        type="number"
                        value={billDiscount}
                        onChange={(e) => setBillDiscount(e.target.value)}
                        className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-amber-50/10 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-amber-900/70">CGST (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={billCgst}
                        onChange={(e) => setBillCgst(e.target.value)}
                        className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-amber-50/10 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-amber-900/70">SGST (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={billSgst}
                        onChange={(e) => setBillSgst(e.target.value)}
                        className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-amber-50/10 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-amber-900/70">IGST (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={billIgst}
                        onChange={(e) => setBillIgst(e.target.value)}
                        className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-amber-50/10 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 border-t border-amber-50 pt-6">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-amber-900/70">Payment Status</label>
                      <select
                        value={paymentStatus}
                        onChange={(e: any) => handlePaymentStatusChange(e.target.value)}
                        className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-amber-50/10 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      >
                        <option value="Paid">Fully Paid</option>
                        <option value="Partially Paid">Partially Paid</option>
                        <option value="Unpaid">Unpaid / Credit (Udar)</option>
                      </select>
                    </div>

                    {paymentStatus === "Paid" ? (
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-amber-900/70">Payment Method</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => handlePaymentMethodChange(e.target.value)}
                          className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-amber-50/10 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        >
                          <option value="Cash">100% Cash</option>
                          <option value="UPI">100% UPI / QR Code</option>
                          <option value="Split">Split Payment (Cash + UPI)</option>
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-amber-900/70">Payment Type</label>
                        <input
                          type="text"
                          disabled
                          value={paymentStatus === "Unpaid" ? "Udar / Credit" : "Split / Mix Payment"}
                          className="w-full border border-amber-200/40 rounded-xl px-3 py-2 text-sm bg-amber-50/30 text-amber-900/60 focus:outline-none"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-amber-900/70">Cash Paid (₹)</label>
                      <input
                        type="number"
                        disabled={paymentStatus === "Unpaid" || (paymentStatus === "Paid" && paymentMethod === "UPI")}
                        value={amountPaidCash}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAmountPaidCash(val);
                          if (paymentStatus === "Paid" && paymentMethod === "Split") {
                            setAmountPaidUPI(Math.max(0, total - Number(val)).toString());
                          }
                        }}
                        className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-amber-50/10 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
                        placeholder="Cash amount"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-amber-900/70">UPI / Bank Paid (₹)</label>
                      <div className="flex flex-col space-y-1.5">
                        <input
                          type="number"
                          disabled={paymentStatus === "Unpaid" || (paymentStatus === "Paid" && paymentMethod === "Cash")}
                          value={amountPaidUPI}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAmountPaidUPI(val);
                            if (paymentStatus === "Paid" && paymentMethod === "Split") {
                              setAmountPaidCash(Math.max(0, total - Number(val)).toString());
                            }
                          }}
                          className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-amber-50/10 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
                          placeholder="UPI amount"
                        />
                        {Number(amountPaidUPI) > 0 && upiId && (
                          <button
                            type="button"
                            onClick={() => {
                              setUpiQrAmount(amountPaidUPI);
                              setShowUpiQrModal(true);
                            }}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] py-1.5 rounded-lg flex items-center justify-center space-x-1 cursor-pointer transition-all shadow-sm"
                          >
                            <CreditCard size={10} />
                            <span>Scan ₹{Number(amountPaidUPI).toLocaleString("en-IN")} UPI QR</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-amber-900/70">Udar / Credit (₹)</label>
                      <input
                        type="number"
                        value={due > 0 ? due : 0}
                        disabled
                        className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-amber-100/50 text-amber-900/70 focus:outline-none"
                        placeholder="Auto calculated due"
                      />
                    </div>
                  </div>

                  {due > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-amber-900/70">Due Date (Udar Date Limit)</label>
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-amber-50/10 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Calculated Invoice Summary Card */}
                  <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-100 mt-6">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs font-semibold text-amber-900">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-amber-900/50 uppercase">Subtotal</span>
                        <span className="text-sm font-bold">₹{subtotal.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex flex-col text-emerald-700">
                        <span className="text-[10px] text-emerald-700/50 uppercase">Discount</span>
                        <span className="text-sm font-bold">- ₹{calculatedDiscount.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex flex-col text-amber-800">
                        <span className="text-[10px] text-amber-800/50 uppercase">Taxes (GST/IGST)</span>
                        <span className="text-sm font-bold">₹{(cgst + sgst + igst).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex flex-col text-amber-950 font-black">
                        <span className="text-[10px] text-amber-950/50 uppercase">Grand Total</span>
                        <span className="text-sm font-black">₹{total.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex flex-col text-rose-700">
                        <span className="text-[10px] text-rose-700/50 uppercase">Remaining Due</span>
                        <span className="text-sm font-bold">₹{due.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-6">
                    <button
                      type="submit"
                      disabled={billingSubmitLoading}
                      onClick={(e) => handleBillingSubmit(e, false)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-3.5 rounded-xl flex items-center justify-center space-x-2 shadow-lg transition-all cursor-pointer"
                    >
                      {billingSubmitLoading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <Share2 size={16} />
                          <span>Generate PDF & Share on WhatsApp</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={billingSubmitLoading}
                      onClick={(e) => handleBillingSubmit(e, true)}
                      className="flex-1 bg-amber-800 hover:bg-amber-900 text-white font-bold text-sm py-3.5 rounded-xl flex items-center justify-center space-x-2 shadow-lg transition-all cursor-pointer"
                    >
                      {billingSubmitLoading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <Save size={16} />
                          <span>Save Invoice Only (Update Stock)</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB: LEDGER / HISAB */}
            {activeTab === "ledger" && (
              <div className="space-y-8 animate-fade-in">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <h2 className="font-serif font-black text-2xl md:text-3xl text-amber-950">Hisab & Ledger Reports</h2>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={downloadTallyCSV}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <FileText size={14} />
                      <span>Export Excel (Tally CSV)</span>
                    </button>
                    <div className="bg-amber-100/40 border border-amber-200/50 rounded-2xl px-4 py-2.5 text-xs font-bold text-amber-950 font-sans">
                      Net Profit: <span className="text-emerald-800 font-extrabold text-sm">₹{filteredLedger.reduce((sum, tx) => sum + (tx.profit || 0), 0).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>

                {/* Ledger Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-amber-100/60 shadow-sm flex flex-col justify-between">
                    <span className="text-xs font-bold text-amber-900/50 block">Period Total Sales</span>
                    <span className="text-xl font-black text-amber-950 mt-1">
                      ₹{filteredLedger.filter(tx => tx.type === "Sale").reduce((sum, tx) => sum + tx.totalAmount, 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-amber-100/60 shadow-sm flex flex-col justify-between">
                    <span className="text-xs font-bold text-amber-900/50 block">Period Stock Purchases</span>
                    <span className="text-xl font-black text-rose-800 mt-1">
                      ₹{filteredLedger.filter(tx => tx.type === "Purchase").reduce((sum, tx) => sum + tx.totalAmount, 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-amber-100/60 shadow-sm flex flex-col justify-between">
                    <span className="text-xs font-bold text-amber-900/50 block">Period Net profit</span>
                    <span className={`text-xl font-black mt-1 ${filteredLedger.filter(tx => tx.type === "Sale").reduce((sum, tx) => sum + (tx.profit || 0), 0) >= 0 ? "text-emerald-800" : "text-rose-700"}`}>
                      ₹{filteredLedger.filter(tx => tx.type === "Sale").reduce((sum, tx) => sum + (tx.profit || 0), 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-amber-100/60 p-6 shadow-sm space-y-6">
                  
                  {/* Filters bar */}
                  <div className="grid grid-cols-1 gap-6 border-b border-amber-50 pb-6">
                    
                    {/* Search & Type Filters */}
                    <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
                      {/* Search */}
                      <div className="relative flex-1 max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-amber-700/60">
                          <Search size={14} />
                        </div>
                        <input
                          type="text"
                          placeholder="Search customer, bill no, product name..."
                          value={ledgerSearch}
                          onChange={(e) => setLedgerSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-amber-200 text-xs bg-amber-50/10 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      {/* Ledger Type Filter */}
                      <div className="flex space-x-2 bg-amber-50/50 p-1 rounded-xl border border-amber-100 self-start md:self-auto">
                        {(["All", "Sales", "Purchases"] as const).map(type => (
                          <button
                            key={type}
                            onClick={() => setLedgerTypeFilter(type)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              ledgerTypeFilter === type
                                ? "bg-amber-800 text-white shadow-sm"
                                : "text-amber-900/70 hover:text-amber-900"
                            }`}
                          >
                            {type === "All" ? "Consolidated" : type === "Sales" ? "Sales (Bills)" : "Stock Purchases"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Date Filters & Status Filters */}
                    <div className="flex flex-col lg:flex-row justify-between gap-4">
                      {/* Date Filter Tabs */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-amber-900/60 mr-1">Time Period:</span>
                        {(["All", "Today", "Week", "Month", "Custom"] as const).map(period => (
                          <button
                            key={period}
                            onClick={() => setLedgerDateFilter(period)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                              ledgerDateFilter === period
                                ? "bg-amber-950 text-white border-amber-950"
                                : "bg-white text-amber-900 border-amber-200 hover:bg-amber-50/40"
                            }`}
                          >
                            {period === "All" ? "All Time" : period === "Today" ? "Daily" : period === "Week" ? "Weekly" : period === "Month" ? "Monthly" : "Custom Range"}
                          </button>
                        ))}
                      </div>

                      {/* Status Filter (Active for Sales) */}
                      {ledgerTypeFilter !== "Purchases" && (
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-amber-900/60">Status:</span>
                          <div className="flex bg-amber-50/50 p-1 rounded-xl border border-amber-100">
                            {["All", "Paid", "Partially Paid", "Unpaid"].map(status => (
                              <button
                                key={status}
                                onClick={() => setLedgerStatusFilter(status)}
                                className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                  ledgerStatusFilter === status
                                    ? "bg-amber-800 text-white shadow-sm"
                                    : "text-amber-900/70 hover:text-amber-900"
                                }`}
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Custom Date Inputs */}
                    {ledgerDateFilter === "Custom" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md p-4 bg-amber-50/40 border border-amber-100 rounded-xl animate-fade-in">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-amber-900/70">From Date</label>
                          <input
                            type="date"
                            value={ledgerStartDate}
                            onChange={(e) => setLedgerStartDate(e.target.value)}
                            className="w-full border border-amber-200/80 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-amber-900/70">To Date</label>
                          <input
                            type="date"
                            value={ledgerEndDate}
                            onChange={(e) => setLedgerEndDate(e.target.value)}
                            className="w-full border border-amber-200/80 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Ledger Table */}
                  {filteredLedger.length === 0 ? (
                    <p className="text-xs text-amber-900/60 text-center py-6">No matching transactions found.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-amber-50/50 text-amber-900 uppercase font-bold border-b border-amber-100">
                          <tr>
                            <th className="p-3">Date & Time</th>
                            <th className="p-3">Ref No</th>
                            <th className="p-3">Type</th>
                            <th className="p-3">Customer / Partner</th>
                            <th className="p-3 text-right">Amount (₹)</th>
                            <th className="p-3 text-center">Payment Status</th>
                            <th className="p-3">Items / Profit Breakdown</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-50">
                          {filteredLedger.map(tx => (
                            <tr key={tx.id} className="hover:bg-amber-50/20">
                              {/* Timestamp */}
                              <td className="p-3 text-amber-900/80">
                                {tx.createdAt ? (
                                  <div className="flex flex-col">
                                    <span className="font-bold">{tx.createdAt.toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                    <span className="text-[10px] text-amber-900/50">{tx.createdAt.toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                ) : "-"}
                              </td>

                              {/* Ref No */}
                              <td className="p-3 font-mono font-bold text-amber-950">{tx.refNo}</td>

                              {/* Type */}
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  tx.type === "Sale"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                    : "bg-amber-50 text-amber-800 border border-amber-100"
                                }`}>
                                  {tx.type === "Sale" ? "Customer Sale" : "Stock Purchase"}
                                </span>
                              </td>

                              {/* Partner details */}
                              <td className="p-3">
                                <div className="space-y-0.5">
                                  <span className="font-bold text-amber-950 block">{tx.customerName}</span>
                                  {tx.customerPhone !== "-" && (
                                    <span className="text-[10px] text-amber-900/60 flex items-center space-x-1">
                                      <Phone size={10} />
                                      <span>{tx.customerPhone}</span>
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Total and remaining due */}
                              <td className="p-3 text-right">
                                <div className="font-semibold text-amber-950">₹{tx.totalAmount.toLocaleString("en-IN")}</div>
                                {tx.amountDue > 0 && (
                                  <div className="text-[10px] text-rose-600 font-bold">Due: ₹{tx.amountDue.toLocaleString("en-IN")}</div>
                                )}
                              </td>

                              {/* Payment status */}
                              <td className="p-3 text-center">
                                <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold ${
                                  tx.paymentStatus === "Paid"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : tx.paymentStatus === "Partially Paid"
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                }`}>
                                  {tx.paymentStatus}
                                </span>
                              </td>

                              {/* Items / Profit Details */}
                              <td className="p-3">
                                <div className="space-y-1 max-w-xs overflow-hidden text-ellipsis whitespace-normal">
                                  {tx.items.map((item: any, idx: number) => {
                                    const profitAmount = tx.type === "Sale" ? (item.price - (item.purchasePrice || 0)) * item.quantity : 0;
                                    return (
                                      <div key={idx} className="text-[10px] text-amber-900 leading-tight">
                                        <strong className="text-amber-950">{item.name}</strong> x{item.quantity} 
                                        {tx.type === "Sale" && (
                                          <span className="block text-[9px] text-emerald-700 font-medium">
                                            ₹{profitAmount.toLocaleString("en-IN")} Profit (Bought @ ₹{item.purchasePrice || 0}, Sold @ ₹{item.price})
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>

                              {/* Actions */}
                              <td className="p-3 text-right space-x-2">
                                {tx.type === "Sale" && tx.amountDue > 0 && (
                                  <button
                                    onClick={() => handleUpdatePayment(tx.id, tx.amountPaid, tx.totalAmount)}
                                    className="text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1.5 rounded transition-all cursor-pointer"
                                  >
                                    Add Payment
                                  </button>
                                )}
                                {tx.type === "Sale" && tx.pdfUrl && (
                                  <a
                                    href={tx.pdfUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded transition-all cursor-pointer"
                                  >
                                    <FileText size={10} />
                                    <span>View PDF</span>
                                  </a>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: SETTINGS */}
            {activeTab === "settings" && (
              <div className="space-y-8 animate-fade-in">
                <h2 className="font-serif font-black text-2xl md:text-3xl text-amber-950">System Settings</h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                  
                  {/* Left Column: Form Controls */}
                  <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-2xl border border-amber-100/60 shadow-sm space-y-8">
                  
                  {/* Shop Contact */}
                  <div className="space-y-4">
                    <h3 className="font-serif font-bold text-lg text-amber-950 border-b border-amber-50 pb-2">
                      Shop Contact & Payment Settings
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-amber-900/70">Shop WhatsApp Number (For customer inquiries)</label>
                        <input
                          type="text"
                          required
                          value={whatsappNumber}
                          onChange={(e) => setWhatsappNumber(e.target.value)}
                          className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-amber-50/10 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          placeholder="e.g. 919999999999 (include country code '91' without '+')"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-amber-900/70">Merchant UPI ID (For dynamic QR codes)</label>
                        <input
                          type="text"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-amber-50/10 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          placeholder="e.g. jskjewellers@okaxis"
                        />
                      </div>
                    </div>
                  </div>

                  {/* GST Defaults */}
                  <div className="space-y-4">
                    <h3 className="font-serif font-bold text-lg text-amber-950 border-b border-amber-50 pb-2">
                      Default GST Configuration
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-amber-900/70">Default CGST (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={defaultGst.cgst}
                          onChange={(e) => setDefaultGst({...defaultGst, cgst: Number(e.target.value)})}
                          className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-amber-50/10 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-amber-900/70">Default SGST (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={defaultGst.sgst}
                          onChange={(e) => setDefaultGst({...defaultGst, sgst: Number(e.target.value)})}
                          className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-amber-50/10 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-amber-900/70">Default IGST (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={defaultGst.igst}
                          onChange={(e) => setDefaultGst({...defaultGst, igst: Number(e.target.value)})}
                          className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-amber-50/10 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Invoice Template Customization */}
                  <div className="space-y-4">
                    <h3 className="font-serif font-bold text-lg text-amber-950 border-b border-amber-50 pb-2">
                      Invoice & Bill Template Settings
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-amber-900/70">Business Name (On Invoice Header)</label>
                        <input
                          type="text"
                          required
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-amber-50/10 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-amber-900/70">Tagline / Subtitle</label>
                        <input
                          type="text"
                          value={businessSub}
                          onChange={(e) => setBusinessSub(e.target.value)}
                          className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-amber-50/10 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-amber-900/70">Business GSTIN / UIN</label>
                        <input
                          type="text"
                          value={businessGstin}
                          onChange={(e) => setBusinessGstin(e.target.value)}
                          className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-amber-50/10 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-amber-900/70">Contact Email</label>
                        <input
                          type="email"
                          value={businessEmail}
                          onChange={(e) => setBusinessEmail(e.target.value)}
                          className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-amber-50/10 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-amber-900/70">Instagram Username / Link</label>
                        <input
                          type="text"
                          value={businessInstagram}
                          onChange={(e) => setBusinessInstagram(e.target.value)}
                          className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-amber-50/10 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          placeholder="e.g. @jsk_art_jewellery"
                        />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-bold text-amber-900/70">Custom Remarks / Invoice Bottom Footer Note</label>
                        <textarea
                          rows={2}
                          value={customRemark}
                          onChange={(e) => setCustomRemark(e.target.value)}
                          className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-amber-50/10 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          placeholder="e.g. No E-Way Bill is required as the Goods covered under this Invoice are Exempted."
                        />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-bold text-amber-900/70">Business Address (Shown on Invoice)</label>
                        <textarea
                          rows={2}
                          value={businessAddress}
                          onChange={(e) => setBusinessAddress(e.target.value)}
                          className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-amber-50/10 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-bold text-amber-900/70">Business Logo (PNG/JPG File)</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setBusinessLogo(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="w-full text-xs text-amber-900 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-950 hover:file:bg-amber-200 cursor-pointer"
                        />
                        {businessLogo && (
                          <div className="mt-2 flex items-center space-x-3 bg-amber-50/30 p-2.5 rounded-xl border border-amber-100 max-w-sm">
                            <img src={businessLogo} alt="Logo Preview" className="w-12 h-12 object-contain rounded border border-amber-100 p-1 bg-white" />
                            <div>
                              <span className="text-[10px] text-amber-950 font-bold block">Custom Logo Loaded</span>
                              <button
                                type="button"
                                onClick={() => setBusinessLogo("")}
                                className="text-[10px] font-bold text-rose-600 hover:text-rose-800"
                              >
                                Remove Custom Logo
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4 bg-amber-50/20 p-4 rounded-xl border border-amber-100/50">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="showBankDetails"
                          checked={showBankDetails}
                          onChange={(e) => setShowBankDetails(e.target.checked)}
                          className="rounded text-amber-800 focus:ring-amber-800 w-4 h-4 border-amber-200"
                        />
                        <label htmlFor="showBankDetails" className="text-xs font-bold text-amber-900/80 cursor-pointer">
                          Show Bank Details on Invoice
                        </label>
                      </div>

                      {showBankDetails ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-amber-900/70">Bank Name</label>
                            <input
                              type="text"
                              value={bankName}
                              onChange={(e) => setBankName(e.target.value)}
                              className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-amber-900/70">Account Number</label>
                            <input
                              type="text"
                              value={bankAccount}
                              onChange={(e) => setBankAccount(e.target.value)}
                              className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-amber-900/70">Bank IFSC Code</label>
                            <input
                              type="text"
                              value={bankIfsc}
                              onChange={(e) => setBankIfsc(e.target.value)}
                              className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-amber-800 font-medium bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                          ℹ️ Bank details are hidden. The WhatsApp Channel QR code will be displayed in the footer instead.
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 bg-amber-50/20 p-4 rounded-xl border border-amber-100/50">
                      <label className="text-xs font-bold text-amber-900/70 block">WhatsApp Group/Channel Link (for Invoice QR Code)</label>
                      <input
                        type="text"
                        value={whatsappChannelUrl}
                        onChange={(e) => setWhatsappChannelUrl(e.target.value)}
                        placeholder="https://chat.whatsapp.com/... or https://whatsapp.com/channel/..."
                        className="w-full border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none"
                      />
                      <p className="text-[10px] text-amber-900/60 font-medium">If set, a QR code will be printed on the invoice allowing customers to scan and join your WhatsApp group or channel.</p>
                    </div>
                  </div>

                  {/* Custom Categories */}
                  <div className="space-y-4">
                    <h3 className="font-serif font-bold text-lg text-amber-950 border-b border-amber-50 pb-2">
                      Product Categories
                    </h3>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="Add new category..."
                        className="flex-1 border border-amber-200/80 rounded-xl px-3 py-2 text-sm bg-amber-50/10 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); } }}
                      />
                      <button
                        type="button"
                        onClick={handleAddCategory}
                        className="bg-amber-100 text-amber-900 px-4 py-2 rounded-xl font-bold text-sm cursor-pointer hover:bg-amber-200"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {customCategories.map(cat => (
                        <div key={cat} className="flex items-center space-x-1 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full text-xs font-bold text-amber-900">
                          <span>{cat}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCategory(cat)}
                            className="text-amber-900/50 hover:text-rose-600 focus:outline-none cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-amber-50">
                    <button
                      type="submit"
                      className="bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all cursor-pointer w-full md:w-auto"
                    >
                      Save All Settings
                    </button>
                  </div>
                </form>

                {/* Right Column: Live Invoice Preview */}
                <div className="space-y-4 lg:sticky lg:top-6">
                  <h3 className="font-serif font-bold text-lg text-amber-950 flex items-center space-x-2">
                    <span>Live Invoice Print Preview</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-sans font-bold px-2.5 py-0.5 rounded-full">
                      Updates Live
                    </span>
                  </h3>
                  
                  {/* A4 sheet mock container */}
                  <div className="bg-white border border-amber-200/60 rounded-2xl shadow-md p-6 font-sans text-[10px] text-amber-950/90 relative overflow-hidden select-none max-w-lg mx-auto space-y-4">
                    
                    {/* Brand Header */}
                    <div className="flex justify-between items-start pb-3 border-b-4 border-amber-700/80">
                      <div className="flex items-center space-x-3">
                        {businessLogo ? (
                          <img src={businessLogo} alt="Logo" className="w-10 h-10 object-contain rounded border border-amber-100 p-0.5 bg-white" />
                        ) : (
                          <div className="w-10 h-10 border border-amber-500 rounded flex items-center justify-center font-serif text-[10px] font-bold text-amber-600 bg-amber-50">
                            Logo
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-black tracking-tight text-amber-950">{businessName || "JSK ART JEWELLERY"}</div>
                          <div className="text-[8px] text-amber-700/70 font-semibold">{businessSub || "Wholesalers & Mfrs of Diamond and Gold Jewellery"}</div>
                        </div>
                      </div>
                    </div>

                    {/* GST Invoice Header Banner */}
                    <div className="text-center my-3 bg-amber-50/40 py-1.5 border border-amber-100 rounded">
                      <div className="font-black text-xs text-amber-950/80">GST INVOICE</div>
                      <div className="text-[7px] text-amber-900/60 italic font-medium">(ORIGINAL FOR RECIPIENT)</div>
                    </div>

                    {/* Details block */}
                    <div className="grid grid-cols-2 gap-4 pb-3 border-b border-amber-100 text-[8px] leading-tight">
                      <div>
                        <div className="font-bold text-amber-900/80 mb-0.5 uppercase">SUPPLIER</div>
                        <div className="font-black">{businessName}</div>
                        <div className="text-amber-950/70 whitespace-pre-line leading-tight">{businessAddress}</div>
                        <div className="mt-1.5"><span className="font-semibold text-amber-950">GSTIN:</span> {businessGstin}</div>
                        <div><span className="font-semibold text-amber-950">Email:</span> {businessEmail}</div>
                        {businessInstagram && <div><span className="font-semibold text-amber-950">Instagram:</span> {businessInstagram}</div>}
                      </div>
                      <div>
                        <div className="font-bold text-amber-900/80 mb-0.5 uppercase">INVOICE METADATA</div>
                        <table className="w-full text-[8px] text-left">
                          <tbody>
                            <tr>
                              <td className="font-semibold py-0.5">Invoice No:</td>
                              <td className="text-amber-950/70 py-0.5">JSK-XXXXXX</td>
                            </tr>
                            <tr>
                              <td className="font-semibold py-0.5">Date:</td>
                              <td className="text-amber-950/70 py-0.5">{new Date().toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                            </tr>
                            <tr>
                              <td className="font-semibold py-0.5">Place of Supply:</td>
                              <td className="text-amber-950/70 py-0.5">At Chennai</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Buyer Details Mock */}
                    <div className="py-2 border-b border-amber-100 text-[8px]">
                      <div className="font-bold text-amber-900/80 mb-0.5 uppercase">BUYER (CUSTOMER)</div>
                      <div>Name: Ram Kumar</div>
                      <div>Mobile: 9876543210</div>
                      <div>State Name: Tamil Nadu, Code: 33</div>
                    </div>

                    {/* Items Grid Mock */}
                    <table className="w-full text-left text-[8px] my-3 border-collapse">
                      <thead>
                        <tr className="bg-amber-950 text-white font-bold">
                          <th className="p-1 rounded-l text-[7px]">Sl</th>
                          <th className="p-1 text-[7px]">Description</th>
                          <th className="p-1 text-center text-[7px]">Weight</th>
                          <th className="p-1 text-right text-[7px]">Price</th>
                          <th className="p-1 text-center text-[7px]">Qty</th>
                          <th className="p-1 text-right rounded-r text-[7px]">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-amber-50">
                          <td className="p-1">1</td>
                          <td className="p-1 font-medium">Gold Diamond Ring (Sample)</td>
                          <td className="p-1 text-center">4.2g</td>
                          <td className="p-1 text-right">₹50,000</td>
                          <td className="p-1 text-center">1</td>
                          <td className="p-1 text-right font-medium">₹50,000</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Taxation calculation Mock */}
                    <div className="grid grid-cols-2 gap-4 text-[8px] pt-1">
                      <div>
                        <div className="font-bold text-amber-900/70">Amount Chargeable (in words):</div>
                        <div className="text-[7.5px] italic text-amber-950/70 mt-0.5 leading-tight">
                          Fifty One Thousand Five Hundred Rupees Only
                        </div>
                      </div>
                      <div className="text-right space-y-1 text-amber-950/70 text-[7.5px]">
                        <div>Subtotal: <span className="font-medium text-amber-950">₹50,000</span></div>
                        <div>Output CGST @ 1.5%: <span className="font-medium text-amber-950">₹750</span></div>
                        <div>Output SGST @ 1.5%: <span className="font-medium text-amber-950">₹750</span></div>
                        <div className="border-t border-dashed border-amber-200 pt-1 text-[9px] font-bold text-amber-950">
                          Grand Total: <span className="font-extrabold text-amber-950 text-xs">₹51,500</span>
                        </div>
                      </div>
                    </div>

                    {/* Bank Details & remarks */}
                    <div className="grid grid-cols-2 gap-4 border-t border-amber-100 pt-3 mt-3 text-[7.5px] leading-relaxed">
                      <div>
                        <div className="font-bold text-amber-900">Remarks:</div>
                        <div className="text-amber-950/60 leading-tight mt-0.5 max-w-[180px]">{customRemark || "No E-Way Bill is required."}</div>
                      </div>
                      <div className="bg-amber-50/30 p-2 rounded border border-amber-100/50">
                        <div className="font-bold text-amber-900 mb-0.5">Company Bank Details:</div>
                        <div>Bank: {bankName}</div>
                        <div>A/c No: {bankAccount}</div>
                        <div>IFSC: {bankIfsc}</div>
                      </div>
                    </div>

                    {/* Footer Signatures */}
                    <div className="flex justify-between items-end pt-4 text-[7.5px] font-medium text-amber-950/80">
                      <div>
                        <div className="border-b border-amber-300 w-24 mb-1"></div>
                        <div>Customer's Signature</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[6.5px] text-amber-950/60 font-bold mb-6">for {businessName}</div>
                        <div className="border-b border-amber-300 w-28 ml-auto mb-1"></div>
                        <div>Authorised Signatory</div>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </div>
            )}
          </>
        )}
      </main>

      {/* QR Code Modal for E-Bill */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-amber-100 flex flex-col items-center text-center space-y-6 relative">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 bg-amber-50 hover:bg-amber-100 text-amber-950 p-2 rounded-full font-bold text-xs cursor-pointer"
            >
              ✕
            </button>
            <h3 className="font-serif font-black text-xl text-amber-950">E-Bill QR Code</h3>
            <p className="text-xs text-amber-900/70 leading-relaxed">
              Show this QR code to the customer. They can scan it with their phone's camera to download the digital GST bill (Invoice No: <span className="font-mono font-bold text-amber-950">{currentBillNo}</span>).
            </p>

            <div className="w-48 h-48 bg-amber-50 border border-amber-100 p-2 rounded-2xl flex items-center justify-center shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(currentBillUrl)}`}
                alt="E-Bill QR Code"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>

            <div className="w-full space-y-2 pt-2">
              <button
                onClick={() => {
                  const waUrl = `https://wa.me/91${currentBillPhone}?text=${encodeURIComponent(currentBillText)}`;
                  window.open(waUrl, "_blank");
                  setShowQrModal(false);
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-2 shadow-md transition-all cursor-pointer"
              >
                <Share2 size={14} />
                <span>Share & Open WhatsApp</span>
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(currentBillUrl);
                  alert("Invoice PDF URL copied to clipboard!");
                }}
                className="w-full py-2.5 bg-amber-50 hover:bg-amber-100/60 text-amber-900 rounded-xl font-bold text-xs transition-all cursor-pointer border border-amber-100"
              >
                Copy Bill PDF Link
              </button>
              <button
                onClick={() => setShowQrModal(false)}
                className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl font-bold text-xs transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {showRestockModal && restockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-amber-950/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-amber-100 p-6 w-full max-w-md shadow-2xl animate-scale-in relative">
            <button
              onClick={() => {
                setShowRestockModal(false);
                setRestockProduct(null);
              }}
              className="absolute top-4 right-4 bg-amber-50 hover:bg-amber-100 text-amber-950 p-2 rounded-full font-bold text-xs cursor-pointer"
            >
              ✕
            </button>
            <h3 className="font-serif font-black text-xl text-amber-950 mb-2">Restock Product</h3>
            <p className="text-xs text-amber-900/60 mb-6">
              Adding stock for <strong className="text-amber-900">{restockProduct.name}</strong>.
              Weighted average purchase price will be calculated.
            </p>

            <form onSubmit={handleRestockSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-amber-900/70 block mb-1">Current Stock / Price</label>
                <input
                  type="text"
                  disabled
                  value={`${restockProduct.stock} Units (Avg Cost: ₹${restockProduct.purchasePrice || 0})`}
                  className="w-full bg-amber-50/50 border border-amber-200/50 rounded-xl px-3 py-2 text-sm text-amber-900/60"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-amber-900/70 block mb-1">Added Quantity *</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 5"
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-amber-900/70 block mb-1">New Purchase Cost Rate (Per Unit) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="e.g. 42000"
                  value={restockCost}
                  onChange={(e) => setRestockCost(e.target.value)}
                  className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-amber-900/70 block mb-1">New Selling Price (Optional)</label>
                <input
                  type="number"
                  placeholder={`Leave blank to keep ₹${restockProduct.price}`}
                  value={restockSellPrice}
                  onChange={(e) => setRestockSellPrice(e.target.value)}
                  className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-amber-800 hover:bg-amber-900 text-white font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                >
                  Submit Restock
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRestockModal(false);
                    setRestockProduct(null);
                  }}
                  className="flex-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPI Payment QR Code Modal */}
      {showUpiQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-amber-100 flex flex-col items-center text-center space-y-6 relative">
            <button
              onClick={() => setShowUpiQrModal(false)}
              className="absolute top-4 right-4 bg-amber-50 hover:bg-amber-100 text-amber-950 p-2 rounded-full font-bold text-xs cursor-pointer"
            >
              ✕
            </button>
            <h3 className="font-serif font-black text-xl text-amber-950">Scan to Pay via UPI</h3>
            <p className="text-xs text-amber-900/70 leading-relaxed">
              Scan this QR code with any UPI app (GPay, PhonePe, Paytm, BHIM) to pay the exact amount.
            </p>

            <div className="bg-amber-50/50 p-3 rounded-2xl border border-amber-100 flex flex-col items-center space-y-1 w-full">
              <span className="text-base font-black text-emerald-800">₹{Number(upiQrAmount).toLocaleString("en-IN")}</span>
              <span className="text-[10px] text-amber-900/60 font-mono select-all">UPI ID: {upiId}</span>
            </div>

            <div className="w-52 h-52 bg-white border border-amber-100 p-2.5 rounded-2xl flex items-center justify-center shadow-md">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  `upi://pay?pa=${upiId}&pn=${encodeURIComponent("JSK Jewellers")}&am=${upiQrAmount}&cu=INR`
                )}`}
                alt="UPI Payment QR Code"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="w-full pt-2">
              <button
                onClick={() => setShowUpiQrModal(false)}
                className="w-full py-3 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Barcode Tag Modal */}
      {showBarcodeModal && barcodeTagProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in print:bg-white print:p-0">
          <div className="bg-white rounded-3xl p-6 max-w-4xl w-full shadow-2xl border border-amber-100 flex flex-col md:flex-row space-y-6 md:space-y-0 md:space-x-8 relative print:shadow-none print:border-none print:p-0 print:m-0 print:rounded-none">
            
            {/* Close Button - hidden in print */}
            <button
              onClick={() => {
                setShowBarcodeModal(false);
                setBarcodeTagProduct(null);
                setBarcodeQuantity(1);
                setBarcodeLayout("single");
                setBarcodeColumns(3);
                setBarcodeSkipLabels(0);
                setBarcodeShowBorder(true);
                setBarcodeTagSize("medium");
              }}
              className="absolute top-4 right-4 bg-amber-50 hover:bg-amber-100 text-amber-950 p-2 rounded-full font-bold text-xs cursor-pointer print:hidden z-10"
            >
              ✕
            </button>

            {/* Left Panel: Settings */}
            <div className="w-full md:w-5/12 flex flex-col justify-between text-left space-y-4 print:hidden">
              <div>
                <h3 className="font-serif font-black text-xl text-amber-950 pb-2 border-b border-amber-100">Barcode Print Settings</h3>
                
                <div className="space-y-4 mt-4">
                  {/* Layout Type Selection */}
                  <div>
                    <label className="text-[11px] font-bold text-amber-900/70 block mb-1.5">Print Layout Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setBarcodeLayout("single");
                          setBarcodeColumns(3);
                        }}
                        className={`py-2 px-3 rounded-xl font-bold text-xs border text-center transition-all cursor-pointer ${
                          barcodeLayout === "single"
                            ? "bg-amber-800 border-amber-800 text-white shadow-sm"
                            : "bg-white border-amber-100 text-amber-900 hover:bg-amber-50"
                        }`}
                      >
                        Single (Thermal)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBarcodeLayout("a4");
                        }}
                        className={`py-2 px-3 rounded-xl font-bold text-xs border text-center transition-all cursor-pointer ${
                          barcodeLayout === "a4"
                            ? "bg-amber-800 border-amber-800 text-white shadow-sm"
                            : "bg-white border-amber-100 text-amber-900 hover:bg-amber-50"
                        }`}
                      >
                        A4 Sticker Sheet
                      </button>
                    </div>
                  </div>

                  {/* Quantity Input */}
                  <div>
                    <label className="text-[11px] font-bold text-amber-900/70 block mb-1">Total Copies to Print</label>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={barcodeQuantity}
                      onChange={(e) => setBarcodeQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 bg-amber-50/30 rounded-xl border border-amber-100 text-amber-950 font-bold text-xs outline-none focus:border-amber-800 transition-all"
                    />
                  </div>

                  {/* Tag Size Selection */}
                  <div>
                    <label className="text-[11px] font-bold text-amber-900/70 block mb-1">Tag Size</label>
                    <div className="grid grid-cols-3 gap-1">
                      {(["small", "medium", "large"] as const).map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => {
                            setBarcodeTagSize(sz);
                            if (barcodeLayout === "a4") {
                              if (sz === "small") setBarcodeColumns(4);
                              else if (sz === "large") setBarcodeColumns(2);
                              else setBarcodeColumns(3);
                            }
                          }}
                          className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border text-center transition-all capitalize cursor-pointer ${
                            barcodeTagSize === sz
                              ? "bg-amber-100 border-amber-800 text-amber-950"
                              : "bg-white border-amber-100 text-amber-800 hover:bg-amber-50"
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* A4 Specific Options */}
                  {barcodeLayout === "a4" && (
                    <div className="space-y-3 p-3 bg-amber-50/30 rounded-xl border border-amber-100/50 animate-fade-in">
                      <div className="text-[10px] font-extrabold text-amber-950 uppercase tracking-wider mb-1">A4 Layout Details</div>
                      
                      {/* Columns Select */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold text-amber-900/70">Grid Columns</label>
                          <span className="text-[9px] text-amber-900/50">Rec: {barcodeTagSize === 'small' ? '4-5' : barcodeTagSize === 'large' ? '2' : '3'}</span>
                        </div>
                        <select
                          value={barcodeColumns}
                          onChange={(e) => setBarcodeColumns(parseInt(e.target.value))}
                          className="w-full px-2 py-1.5 bg-white rounded-lg border border-amber-100 text-amber-950 font-bold text-xs outline-none focus:border-amber-800 transition-all"
                        >
                          {[2, 3, 4, 5].map((col) => (
                            <option key={col} value={col}>
                              {col} Columns
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Skip Labels Input */}
                      <div>
                        <label className="text-[10px] font-bold text-amber-900/70 block mb-1">Skip Used Slots (to reuse sheet)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={barcodeSkipLabels}
                          onChange={(e) => setBarcodeSkipLabels(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full px-2.5 py-1 bg-white rounded-lg border border-amber-100 text-amber-950 font-semibold text-xs outline-none focus:border-amber-800 transition-all"
                        />
                      </div>

                      {/* Show Borders Checkbox */}
                      <label className="flex items-center space-x-2 text-[10px] font-bold text-amber-900/70 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={barcodeShowBorder}
                          onChange={(e) => setBarcodeShowBorder(e.target.checked)}
                          className="rounded text-amber-800 focus:ring-amber-800 w-3.5 h-3.5 border-amber-200"
                        />
                        <span>Show cut borders (dashed lines)</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-4">
                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="w-full py-3 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  <FileText size={14} />
                  <span>Print Barcode Tag</span>
                </button>
                <button
                  onClick={() => {
                    setShowBarcodeModal(false);
                    setBarcodeTagProduct(null);
                    setBarcodeQuantity(1);
                    setBarcodeLayout("single");
                    setBarcodeColumns(3);
                    setBarcodeSkipLabels(0);
                    setBarcodeShowBorder(true);
                    setBarcodeTagSize("medium");
                  }}
                  className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl font-bold text-xs transition-all cursor-pointer text-center"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Right Panel: Live Preview */}
            <div className="w-full md:w-7/12 bg-amber-50/10 rounded-2xl p-4 flex flex-col items-center justify-between border border-amber-100/50 print:hidden min-h-[300px] md:min-h-[450px]">
              <div className="w-full flex items-center justify-between pb-2 border-b border-amber-100/60 mb-4">
                <span className="text-xs font-bold text-amber-950">Live Layout Preview</span>
                <span className="text-[10px] font-semibold bg-amber-100 text-amber-950 px-2 py-0.5 rounded-full capitalize">
                  {barcodeLayout === 'a4' ? `A4 Grid (${barcodeColumns} cols)` : `Single Tag (${barcodeTagSize})`}
                </span>
              </div>
              
              <div className="flex-1 w-full flex items-center justify-center overflow-auto max-h-[350px] p-2 bg-amber-50/5 rounded-xl border border-dashed border-amber-200">
                {barcodeLayout === 'a4' ? (
                  /* Miniature A4 Sheet */
                  <div className="bg-white shadow-lg border border-gray-200 p-3 w-[240px] aspect-[1/1.414] overflow-y-auto relative rounded">
                    <div className="text-[6px] text-gray-300 absolute top-1 right-2 select-none">A4 Sheet Simulation</div>
                    <div 
                      className="grid gap-1 mt-3"
                      style={{
                        gridTemplateColumns: `repeat(${barcodeColumns}, minmax(0, 1fr))`
                      }}
                    >
                      {/* Skip slots */}
                      {Array.from({ length: Math.min(24, barcodeSkipLabels) }).map((_, i) => (
                        <div key={`preview-skip-${i}`} className="border border-dotted border-gray-200 rounded aspect-[2/1] flex items-center justify-center text-[6px] text-gray-300 bg-gray-50/50">
                          Empty
                        </div>
                      ))}
                      
                      {/* Barcode tags */}
                      {Array.from({ length: Math.min(48, barcodeQuantity) }).map((_, i) => (
                        <div 
                          key={i} 
                          className={`bg-amber-50/5 flex flex-col items-center justify-center p-1 rounded ${
                            barcodeShowBorder ? 'border border-dashed border-amber-300/60' : 'border border-transparent'
                          }`}
                          style={{
                            aspectRatio: barcodeTagSize === 'small' ? '2.2/1' : barcodeTagSize === 'large' ? '1.7/1' : '2/1'
                          }}
                        >
                          <span className="text-[4px] font-black text-amber-950 scale-90 leading-none">{businessName.slice(0, 12)}...</span>
                          <span className="text-[3.5px] text-amber-900/80 scale-90 leading-none truncate max-w-full">{barcodeTagProduct.name}</span>
                          <div className="h-2 w-full bg-gray-200 my-0.5 rounded-sm flex items-center justify-center">
                            <span className="text-[3px] text-gray-500 scale-75 leading-none">|||||||||</span>
                          </div>
                          <div className="flex justify-between w-full text-[3.5px] scale-90 px-0.5 border-t border-dashed border-amber-200/50 leading-none">
                            <span>S: {barcodeTagProduct.size || "-"}</span>
                            <span>₹{barcodeTagProduct.price}</span>
                          </div>
                        </div>
                      ))}
                      
                      {barcodeQuantity > 48 && (
                        <div className="col-span-full text-center text-[8px] text-amber-900/60 font-bold py-1">
                          + {barcodeQuantity - 48} more labels in print output...
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Single tag / Stack preview */
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="text-[9px] text-amber-900/60 font-medium pb-1">Thermal Label Preview ({barcodeTagSize})</div>
                    <div 
                      className="border border-dashed border-amber-300 p-3 rounded-2xl bg-white flex flex-col items-center space-y-1.5 shadow-md"
                      style={{
                        width: barcodeTagSize === 'small' ? '160px' : barcodeTagSize === 'large' ? '240px' : '200px',
                        height: barcodeTagSize === 'small' ? '80px' : barcodeTagSize === 'large' ? '130px' : '105px',
                        justifyContent: 'space-between'
                      }}
                    >
                      <span className="text-[9px] font-black text-amber-950 tracking-wide uppercase leading-none">{businessName}</span>
                      <span className="text-[8px] font-bold text-amber-900/80 truncate max-w-full leading-none">{barcodeTagProduct.name}</span>
                      
                      {/* Barcode Image */}
                      <div className="bg-white p-1 rounded border border-amber-100 flex items-center justify-center h-8 w-[85%]">
                        <img
                          src={`https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(barcodeTagProduct.barcode || "")}&code=Code128&translate-esc=true`}
                          alt="Barcode"
                          className="h-full object-contain"
                        />
                      </div>
                      
                      <span className="text-[8px] font-mono font-bold tracking-widest text-amber-950 leading-none">{barcodeTagProduct.barcode}</span>
                      
                      <div className="flex justify-between w-full text-[8px] font-bold text-amber-950 px-1 pt-1 border-t border-dashed border-amber-200 leading-none">
                        <span>Size: {barcodeTagProduct.size || "-"}</span>
                        <span>MRP: ₹{barcodeTagProduct.price.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                    {barcodeQuantity > 1 && (
                      <div className="text-[9px] font-bold text-amber-950 bg-amber-100 px-3 py-1 rounded-full animate-pulse mt-2">
                        Repeats {barcodeQuantity} times (separate pages)
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="text-[10px] text-amber-900/60 font-semibold text-center mt-3 max-w-sm">
                💡 {barcodeLayout === 'a4' 
                  ? "Ensure 'Paper Size' is set to A4 and margins are set to Default/None in print dialog." 
                  : "Ensure browser print size matches your thermal roll dimensions (e.g. 50mm x 25mm)."}
              </div>
            </div>

            {/* Printable Container: Hidden on screen, shown when printing */}
            <div id="printable-barcode-area" className="hidden print:block">
              {barcodeLayout === "single" ? (
                Array.from({ length: barcodeQuantity }).map((_, i) => (
                  <div 
                    key={i} 
                    className="print-single-label-page text-center"
                    style={{
                      width: barcodeTagSize === 'small' ? '40mm' : barcodeTagSize === 'large' ? '65mm' : '50mm',
                      height: barcodeTagSize === 'small' ? '20mm' : barcodeTagSize === 'large' ? '35mm' : '25mm',
                      padding: '2px',
                      overflow: 'hidden'
                    }}
                  >
                    <div className="flex flex-col items-center justify-center w-full h-full space-y-0.5">
                      <span className="text-[8.5px] font-black text-amber-950 tracking-wide uppercase truncate max-w-full leading-tight">{businessName}</span>
                      <span className="text-[7.5px] font-bold text-amber-900/80 truncate max-w-full leading-tight">{barcodeTagProduct.name}</span>
                      
                      <div className="bg-white p-0.5 flex items-center justify-center w-full max-w-[90%]">
                        <img
                          src={`https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(barcodeTagProduct.barcode || "")}&code=Code128&translate-esc=true`}
                          alt="Barcode"
                          style={{
                            height: barcodeTagSize === 'small' ? '6mm' : barcodeTagSize === 'large' ? '12mm' : '9mm',
                            objectFit: 'contain'
                          }}
                        />
                      </div>
                      
                      <span className="text-[7.5px] font-mono font-bold tracking-wider text-amber-950 leading-none">{barcodeTagProduct.barcode}</span>
                      
                      <div className="flex justify-between w-full text-[7.5px] font-bold text-amber-950 px-1 pt-0.5 border-t border-dashed border-amber-200 leading-none">
                        <span>S: {barcodeTagProduct.size || "-"}</span>
                        <span>₹{barcodeTagProduct.price.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div 
                  className="grid"
                  style={{
                    gridTemplateColumns: `repeat(${barcodeColumns}, minmax(0, 1fr))`,
                    gap: barcodeTagSize === 'small' ? '6mm' : barcodeTagSize === 'large' ? '12mm' : '8mm',
                    width: '100%'
                  }}
                >
                  {/* Skip empty labels */}
                  {Array.from({ length: barcodeSkipLabels }).map((_, i) => (
                    <div key={`skip-${i}`} className="w-full invisible" style={{
                      height: barcodeTagSize === 'small' ? '20mm' : barcodeTagSize === 'large' ? '35mm' : '28mm',
                    }} />
                  ))}
                  
                  {/* Actual barcode labels */}
                  {Array.from({ length: barcodeQuantity }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`flex flex-col items-center justify-center text-center p-2 bg-white ${
                        barcodeShowBorder ? 'border border-dashed border-amber-300' : 'border-none'
                      }`}
                      style={{
                        height: barcodeTagSize === 'small' ? '20mm' : barcodeTagSize === 'large' ? '35mm' : '28mm',
                        boxSizing: 'border-box',
                        overflow: 'hidden'
                      }}
                    >
                      <span className="text-[8.5px] font-black text-amber-950 tracking-wide uppercase truncate max-w-full leading-tight">{businessName}</span>
                      <span className="text-[7.5px] font-bold text-amber-900/80 truncate max-w-full leading-tight">{barcodeTagProduct.name}</span>
                      
                      <div className="bg-white p-0.5 flex items-center justify-center w-full max-w-[90%] my-0.5">
                        <img
                          src={`https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(barcodeTagProduct.barcode || "")}&code=Code128&translate-esc=true`}
                          alt="Barcode"
                          style={{
                            height: barcodeTagSize === 'small' ? '6mm' : barcodeTagSize === 'large' ? '12mm' : '9mm',
                            objectFit: 'contain'
                          }}
                        />
                      </div>
                      
                      <span className="text-[7.5px] font-mono font-bold tracking-wider text-amber-950 leading-none">{barcodeTagProduct.barcode}</span>
                      
                      <div className="flex justify-between w-full text-[7.5px] font-bold text-amber-950 px-1 pt-0.5 border-t border-dashed border-amber-200 leading-none mt-0.5">
                        <span>S: {barcodeTagProduct.size || "-"}</span>
                        <span>₹{barcodeTagProduct.price.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dynamic CSS Styles for page layouts and media print overrides */}
            <style dangerouslySetInnerHTML={{__html: `
              @media print {
                body {
                  visibility: hidden !important;
                  background: white !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }
                #printable-barcode-area, #printable-barcode-area * {
                  visibility: visible !important;
                }
                #printable-barcode-area {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  display: block !important;
                }
                @page {
                  size: ${barcodeLayout === 'a4' ? 'A4 portrait' : barcodeTagSize === 'small' ? '40mm 20mm' : barcodeTagSize === 'large' ? '65mm 35mm' : '50mm 25mm'};
                  margin: ${barcodeLayout === 'a4' ? '10mm' : '0'};
                }
                .print-single-label-page {
                  page-break-after: always !important;
                  break-after: page !important;
                  display: flex !important;
                  flex-direction: column !important;
                  align-items: center !important;
                  justify-content: center !important;
                  box-sizing: border-box !important;
                }
              }
            `}} />

          </div>
        </div>
      )}
    </div>
  );
}
