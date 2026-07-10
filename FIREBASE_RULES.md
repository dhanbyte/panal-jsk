# Firebase Setup & Security Rules for JSK Art Jewellery

To make the application fully functional, you need to configure **Firebase Authentication**, **Cloud Firestore**, and **Firebase Storage** in your Firebase console.

---

## 1. Firebase Authentication
1. Go to the **Firebase Console** -> **Build** -> **Authentication**.
2. Click **Get Started**.
3. In the **Sign-in method** tab, enable **Email/Password** provider.
4. Go to **Users** tab and click **Add user**.
   * Add the admin email and password (e.g., `admin@jskjewellery.com` and a strong password).
   * Use these credentials to login to your admin panel at `/login`.

---

## 2. Cloud Firestore Rules
1. Go to the **Firebase Console** -> **Build** -> **Firestore Database**.
2. Click **Create database** (choose your location).
3. Go to the **Rules** tab and paste the following security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Products: Anyone can view, only logged-in Admin can add/edit/delete
    match /products/{document} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    // Settings (WhatsApp configuration): Anyone can read, only logged-in Admin can write
    match /settings/{document} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    // Bills (Transactions & Ledger): Only logged-in Admin can access
    match /bills/{document} {
      allow read, write: if request.auth != null;
    }
    // Purchases (Supplier Restocking): Only logged-in Admin can access
    match /purchases/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```
4. Click **Publish**.

---

## 3. Firebase Storage Rules
1. Go to the **Firebase Console** -> **Build** -> **Storage**.
2. Click **Get Started** and select your location.
3. Go to the **Rules** tab and paste the following security rules (to allow customers to download their PDF invoices, and view product images while keeping write permissions secure):

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Product Images: Anyone can read, only logged-in Admin can upload/modify
    match /products/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    // Customer Invoices PDF: Anyone can read (via WhatsApp link), only logged-in Admin can upload
    match /invoices/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```
4. Click **Publish**.
