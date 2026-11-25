# PR Infinity: Lead Management & Invoicing

An Android app (iOS-ready) for PR Infinity Solutions to track customer leads, close deals and issue PDF invoices in the company's own invoice format.

| Part | Stack |
|---|---|
| `mobile/` | **The app.** React Native, Expo SDK 58, TypeScript, Expo Router, React Hook Form + Zod, TanStack Query, SQLite (on-phone database), expo-print / expo-sharing / expo-file-system |
| `backend/` | *Optional, for later.* Node.js 22, Express 5, MongoDB, JWT auth. It is the same feature set as a server API, for when you want several phones to share data. |

> **Current mode: offline.** The app stores everything (leads, invoices, settings) in a SQLite database on the phone. It needs no server and no internet, and there's no login. Use **Settings → Backup & restore** to save a backup file to Drive or WhatsApp, and to move your data to a new phone.

---

## 1. What the app does

**Dashboard.** Cards for Total Leads, Pending Leads, Deals Completed and Invoices Generated. Each card opens the matching filtered list. Below them are recent leads, recent completed deals, recent invoices, and the total invoiced and received amounts. The **+** button adds a lead from anywhere.

**Leads.** You can add, view, edit and delete leads. Each lead has a customer name, mobile number, address, email, lead date (filled in automatically and editable) and notes. You can search by name or mobile number, filter by Pending or Deal Done, and sort by newest or oldest. Pending leads show in orange and Deal Done leads in green.

- Every new lead starts as **Pending**. The server enforces this.
- **Mark as Deal Done** asks for confirmation, then saves the completion date and shows a "Deal completed on …" banner. It also unlocks **Generate Invoice**.
- A lead can move back to Pending only while it has no invoices.
- Deleting a lead keeps its invoices, because they are business records.

**Invoices** (Deal Done leads only)

- The customer details are filled in from the lead. You can edit Bill To for this invoice only, and Ship To can be "same as Bill To" or a different address.
- An invoice can have several line items. Each item has a product name, specifications (one per line, printed in small grey text like your format), warranty, quantity and rate.
- The app calculates everything as you type: Amount = Qty × Rate, Subtotal, an optional Discount, GST (0, 5, 12, 18, 28% or a custom rate) and the Grand Total, plus the amount in words (Indian numbering).
- **GST:** 0% prints a **NON GST INVOICE**. Any other rate prints a **TAX INVOICE**, with CGST and SGST each getting half the rate. IGST is available for customers in another state.
- **Payment status** can be Unpaid, Partially Paid or Paid. You can change it later, and nothing else on the invoice changes.
- **Preview** shows the exact invoice page before you save it. **Generate** then reserves a unique number such as `PRI/2026-27/0020`.
- On a saved invoice you can **Share** (WhatsApp, Gmail, Drive and so on), **Open PDF**, **Download** to a folder you choose (for example Downloads) and **Print**.
- Each customer's lead page shows their invoice history, and the Invoices tab lists every invoice with search and filters.

**Settings**

- Company profile: logo, name, business line, tagline, address, mobile, email, website, GSTIN, UDYAM number and the signature/stamp image.
- Invoice & tax: invoice prefix, the number to start from (so you can continue from your existing invoices), default GST and tax type, and the default warranty.
- Bank details and the terms and conditions bullet points.
- Backup & restore: a single file with all leads, invoices and settings.

### Business rules and where they are enforced

| Rule | How |
|---|---|
| New lead is always Pending | `leadsApi.create` always sets Pending |
| Only Deal Done leads can be invoiced | Checked in `data/localApi.ts` (`invoicesApi.create`); the app only shows the button for Deal Done leads |
| Several invoices per lead | `Invoice.leadId` is indexed and not unique |
| Unique invoice numbers | A counter per prefix and financial year; invoice saves run one at a time, and numbers are never reused |
| Customer details filled in from the lead | The invoice form loads them from the lead |
| Editing a lead never changes old invoices | Each invoice stores a **snapshot** of the customer, company, bank, terms, logo and totals |
| Invoices keep their original billing details | Only `paymentStatus` (and the stored PDF) can change after an invoice is issued |
| Required-field validation | Zod schemas in the app and on the server, with the same rules |
| Double taps can't create two invoices | The button disables while saving, and each form visit sends a `clientRequestId`, so a repeated request returns the same invoice |
| Invoices are stored for later | SQLite on the phone; the PDF is also saved in the app's documents folder |

---

## 2. Folder structure

```
pr-infinity/
├── docker-compose.yml          # MongoDB + API in one command
├── backend/
│   ├── src/
│   │   ├── server.ts           # bootstrap: DB, admin user, default settings, listen
│   │   ├── app.ts              # express app (helmet, cors, json, routes, errors)
│   │   ├── config/             # env validation (zod), db connection
│   │   ├── models/             # Lead, Invoice, Settings, Counter, User
│   │   ├── validators/         # zod request schemas
│   │   ├── services/           # business logic (lead, invoice, calculator, numbering, dashboard, settings, auth)
│   │   ├── controllers/        # thin HTTP handlers
│   │   ├── routes/index.ts     # all /api routes
│   │   ├── middleware/         # JWT auth, error handler
│   │   ├── utils/              # money (paise math, amount in words), financial year, errors
│   │   └── assets/             # default logo + stamp (from your invoice)
│   ├── tests/api.test.ts       # 18 end-to-end API tests
│   ├── .env.example
│   └── Dockerfile
└── mobile/
    ├── app.json / eas.json     # Expo + EAS build config (APK profile included)
    ├── assets/                 # app icon, splash, logo
    └── src/
        ├── app/                # screens (Expo Router, file-based)
        │   ├── _layout.tsx     # providers + auth-guarded stack
                │   ├── (tabs)/         # index (Dashboard), leads, invoices, settings
        │   ├── leads/          # new, [id]/index, [id]/edit
        │   ├── invoices/       # new, [id]
        │   └── settings/       # company, billing, bank, backup
        ├── data/               # offline database (SQLite), local API with all business rules, backup/restore
        ├── api/                # data access entry point (endpoints.ts), query keys
        ├── components/ui/      # Button, Card, TextField, FormField, Chips, StatusBadge, Fab, DateField, ImagePickerField, …
        ├── features/
        │   ├── leads/          # LeadForm, LeadCard, schema
        │   └── invoices/       # invoiceTemplate (PDF layout), calculator, pdfService, preview, form schema
        ├── hooks/              # react-query hooks, useDebounce
        ├── providers/          # Toast, Confirm dialog
        ├── theme/              # colours (navy + gold from your invoice), spacing, type
        ├── types/  utils/  config/
```

**Adding a new module later** (for example Expenses or Stock) touches only new files: a model, validator, service, controller and routes on the backend, and an `src/api` endpoint, a `features/<module>` folder, screens under `src/app/` and a tab entry in `(tabs)/_layout.tsx` in the app. Existing modules don't need changes.

---

## 3. Build the APK and install it on your phone

You don't need a server. You only need a computer with **Node.js 20+** (from nodejs.org) and a free **Expo account** (expo.dev). The APK is built in Expo's cloud, so you don't need Android Studio.

```bash
cd pr-infinity/mobile
npm install
npx eas-cli@latest login          # sign in with your Expo account
npx eas-cli@latest init           # first time only: links the project (answer "Yes")
npx eas-cli@latest build -p android --profile preview
```

After about 10–20 minutes the terminal prints a **link and a QR code** for `PR Infinity.apk`. You can also find it at expo.dev → your project → Builds.

**Install on the phone**

1. Open the link (or scan the QR code) on the Android phone and download the APK.
2. Tap the downloaded file. If Android asks, allow **Install unknown apps** for Chrome or your file manager.
3. Open **PR Infinity**. It goes straight to the Dashboard.
4. Go to **Settings → Invoice & tax** and set **Start numbering from** to continue from your current invoice number (for example 20).
5. Take a backup every few days: **Settings → Backup & restore → Create backup**, then save it to Drive or WhatsApp it to yourself.

**Updating later:** run the same `build` command again and install the new APK over the old one. Your data stays on the phone as long as you don't uninstall the app. If you uninstall, restore from your backup file.

For the Play Store, use `npx eas-cli@latest build -p android --profile production` to get an `.aab` file.

**Local build instead of the cloud (optional; needs Android Studio + JDK 17):**

```bash
npx expo prebuild -p android
cd android && ./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```

## 4. Try it on a computer during development

```bash
cd pr-infinity/mobile
npm install
npx expo start          # scan the QR code with Expo Go on your phone, or press "w" to open it in a browser
```

## 5. Optional: the server (backend/) for multiple phones later

The `backend/` folder is a complete Express + MongoDB API with the same rules (18 automated tests). The app's data functions (`mobile/src/data/localApi.ts`) have the same names and shapes as that API. To switch to a shared server later, point `mobile/src/api/endpoints.ts` at HTTP calls instead; no screen needs to change. To run the server: `cd backend && cp .env.example .env && npm install && npm run dev`, or `docker compose up -d` from the root folder. Tests: `npm test`.

## 6. Invoice layout

`mobile/src/features/invoices/invoiceTemplate.ts` reproduces `invoice-preview-new-layout.pdf`:

- an A4 page with a light grey surround and a 5px navy (`#0B1F4B`) top rule
- a header split 68/32: logo, company name, business line, address, GSTIN + mobile, email, UDYAM and website on the left; the italic tagline, navy badge, invoice number, date and "ORIGINAL FOR RECIPIENT" on the right
- Bill To / Ship To in two equal columns
- an item table with S.NO 6%, ITEMS 45%, WARRANTY 13%, RATE 13%, QTY 8% and AMOUNT 15%, a bold item name with grey spec lines, and a grey TOTAL row
- a CGST/SGST table (it switches to IGST when that is chosen) with a bold totals row
- the total amount in words. When a discount or GST applies, a small breakdown and the payment status show on the right.
- Bank Details, Terms and Conditions (bullets) and Authorized Signatory with the stamp, split 30/42/28
- "ORIGINAL FOR RECIPIENT" in the footer
- Arial / Liberation Sans, `Rs.33,000.00` money format and `dd/mm/yyyy` dates

The same HTML is used for the in-app preview, the PDF and printing, so they always match.
