# JSK Art Jewellery - Application Development Plan

## 1. Overview
This document outlines the complete UI/UX design and feature requirements for the **JSK Art Jewellery** website. The platform will serve two main purposes: a public storefront for customers to browse and inquire about products via WhatsApp, and a secure Admin Panel for the owner to manage inventory, billing, GST, customers, and payments.

## 2. Technology Stack
*   **Frontend Framework:** Next.js (React)
*   **Backend & Database:** Firebase (Firestore for database, Firebase Storage for product images)
*   **Authentication:** Firebase Auth (Only for Admin Login)
*   **Styling:** Tailwind CSS (For a modern, responsive, and beautiful UI)
*   **PDF Generation:** `jspdf` or `@react-pdf/renderer` (For generating bills/invoices)

---

## 3. Feature Specifications

### 3.1 Admin Panel Features (Only Accessible by Owner)
*   **Secure Login:** Email/Password authentication. Only the owner can log in.
*   **Dashboard:** 
    *   Overview of total products, total customers, and recent sales.
    *   **Low Stock Warnings:** Immediate alerts for products running low on inventory.
*   **Product & Inventory Management:**
    *   Add new jewelry items with images (uploaded to Firebase Storage).
    *   Edit product details (Name, Category, Price, Stock Quantity, SKU).
    *   Set low stock threshold (e.g., alert when stock is less than 5).
    *   Enable/Disable products from showing on the public website.
*   **Billing & Invoicing (GST & Discounts):**
    *   Create a new bill by selecting products and customer details.
    *   Automatically apply GST rules based on jewelry standards.
    *   Option to apply custom discounts or promotional offers.
    *   Generate a professional PDF Invoice.
    *   **WhatsApp Integration:** Direct button to send the generated bill to the customer's WhatsApp number.
*   **Customer Management:**
    *   Maintain a database of all customers (Name, Phone Number, Address).
    *   View purchase history for each customer.
*   **Payment Tracking (Khata/Hisab):**
    *   Track full and partial payments.
    *   Record payment modes (Cash, UPI, Bank Transfer).
    *   Filter pending payments to send reminders.

### 3.2 Customer Features (Public View)
*   **No Login Required:** Anyone can visit the website and browse the jewelry collection.
*   **Product Catalog:**
    *   Beautiful grid view of all available jewelry items with high-quality images and pricing.
    *   Filter by categories (e.g., Necklaces, Rings, Earrings, Bangles).
*   **WhatsApp Inquiry (Call to Action):**
    *   Instead of a complex "Add to Cart" checkout, each product will have a **"Inquire on WhatsApp"** or **"Buy via WhatsApp"** button.
    *   Clicking this button will open WhatsApp with a pre-filled message: *"Hello JSK Art Jewellery, I am interested in buying [Product Name] - [Product ID]."*

---

## 4. UI/UX Architecture (Screens)

### 4.1 Public Website (Customer Facing)
1.  **Home Page:** Hero banner with latest collections, featured products, and categories.
2.  **Shop Page:** Full catalog with filters and search.
3.  **Product Details Modal/Page:** Larger image, detailed description, price, and the prominent "Inquire on WhatsApp" button.

### 4.2 Admin Dashboard (Owner Facing)
1.  **Login Screen:** Simple, secure login page.
2.  **Overview Dashboard:** Summary cards (Sales, Low Stock Alerts, Pending Payments).
3.  **Inventory Tab:** Table view of all products with edit/delete buttons and stock indicators (Red for low stock, Green for available).
4.  **Create Bill Tab:** A Point-of-Sale (POS) style interface to select customer, add products, apply GST/Discount, and generate/send the bill.
5.  **Customers Tab:** List of all saved customers and their total purchase value.
6.  **Ledger/Payments Tab:** Detailed history of all transactions and outstanding balances.

---

## 5. Development Phases

*   **Phase 1: Setup & Public Storefront**
    *   Initialize Next.js and Firebase.
    *   Build the UI for the public catalog.
    *   Implement WhatsApp inquiry links.
*   **Phase 2: Admin Authentication & Product Management**
    *   Set up Firebase Auth.
    *   Build forms to add, edit, and upload product images.
    *   Link inventory to the public storefront.
*   **Phase 3: Billing, GST, and Customer Management**
    *   Build the billing interface.
    *   Implement PDF generation and GST calculations.
    *   Store customer details and purchase history in Firestore.
*   **Phase 4: Payment Tracking & Final Polish**
    *   Add payment ledger.
    *   Add stock warning indicators.
    *   Final UI/UX polishing and testing.
