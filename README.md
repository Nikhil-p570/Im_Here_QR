# I'M HERE — Smart QR Tagging System

> **Reuniting belongings with their owners. Securely, instantly, and beautifully.**

**I'M HERE** is a premium web-based QR utility platform designed to bridge physical items (keys, backpacks, wallets, laptops, pets) with a secure digital dashboard. It allows owners to claim smart tags and enables finders to quickly and safely return lost items with a single scan — no app downloads required.

---

## 🌟 Core Features

### 👤 Customer Scan & Item Recovery Flow
* **Unregistered Tag Activation**: When a brand-new physical tag is scanned for the first time, it prompts the finder (or buyer) to claim the tag, link their contact details (Name, Phone number, and Social Profiles), and set a secure edit password.
* **Branded Recovery Profiles**: Scans on already registered tags show a glassmorphic profile card displaying the owner's name and contact shortcuts.
* **📍 GPS Drop Location**: Finders can share their current GPS coordinates with a single tap. The system leverages the browser's Geolocation API to construct a precise Google Maps coordinate link and opens a WhatsApp conversation to drop the location directly to the owner.
* **📞 Premium Phone Formatting**: Display numbers automatically format country codes and mobile digits (`+91 XXXXX-XXXXX`) for maximum readability, with direct international calling hooks.

---

## 🛠️ Technology Stack

* **Frontend Framework**: [React](https://react.dev/) + [Vite](https://vite.dev/) (fast HMR client environment)
* **Icons & UI Accents**: [Lucide React](https://lucide.dev/)
* **Database**: [Firebase Firestore](https://firebase.google.com/docs/firestore) (real-time tag registration and profile storage)
* **Hosting**: [Vercel](https://vercel.com/) (optimal cloud deployments)
* **Styling**: Premium custom Vanilla CSS (glassmorphic theme, smooth micro-animations, and responsive layouts)

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Nikhil-p570/Im_Here_QR.git
   cd Im_Here_QR
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env` file in the root directory and add your Firebase configuration parameters:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```

5. **Build for production:**
   ```bash
   npm run build
   ```

---

## 🎨 Asset Guidelines

The project uses the following optimized assets located in the `/public` directory:
* `full logo.png` — Main horizontal brand logo.
* `logo icon.png` — Compact brand icon (also used as favicon in `index.html`).
* `customised.png` & `ordinary_qr.png` — Comparison graphics shown in marketing contexts.
