# 🎬 5-10 Minute Screen Recording Script & Walkthrough

Follow this step-by-step narration guide when recording your 5–10 minute submission video for the **Fundsroom Full Stack Developer Case Study**.

---

## ⏱️ Timeline Breakdown

| Time | Topic | Key Talking Points |
| :--- | :--- | :--- |
| **0:00 - 1:00** | **Introduction & Architecture** | Project overview, tech stack (Node.js, Express, TS, PostgreSQL, React, Vite), modular structure. |
| **1:00 - 2:30** | **Authentication & RBAC** | Demonstrate login for `Admin`, `Sales`, `Warehouse`, `Accounts`. Show how navigation items adapt per role. |
| **2:30 - 4:00** | **Customer CRM & Notes** | Show search, pagination, status/type filters, adding a customer, and adding follow-up notes. |
| **4:00 - 5:30** | **Product & Inventory Control** | Show SKU list, low-stock visual badges, manual `IN`/`OUT` stock adjustments, and audit log history. |
| **5:30 - 8:00** | **Sales Challan & Atomic Stock Deduction (CRITICAL)** | Show creating a draft challan, checking product stock before, confirming the challan, and verifying stock deduction & movement log. Show negative stock prevention error. |
| **8:00 - 9:00** | **Code Quality & Database Integrity** | Quick tour of VS Code: PostgreSQL `BEGIN/COMMIT` transactions, `FOR UPDATE` row locking, Express validation & error handler. |
| **9:00 - 10:00** | **Wrap Up & Submission Checklist** | Review README, Postman collection, API documentation, and test credentials. |

---

## 🎙️ Detailed Step-by-Step Script

### Part 1: Introduction & Architecture (1 Min)
> *"Hello everyone! In this video, I will demonstrate the Mini ERP + CRM Operations Portal built for the Fundsroom Full Stack Developer Case Study.*
> *For the backend, I used Node.js, Express, and TypeScript connected to a PostgreSQL database. On the frontend, I used React with Vite, TypeScript, and a modern custom CSS design system featuring dark mode aesthetics, glassmorphism, and responsive layouts.*
> *Let's start by looking at authentication and Role-Based Access Control."*

---

### Part 2: Role-Based Access Control (1.5 Mins)
1. **Show Login Screen**:
   > *"The app supports 4 distinct user roles: Admin, Sales, Warehouse, and Accounts. I have provided quick demo buttons for testing."*
2. **Log in as Sales (`sales@fundsroom.com`)**:
   > *"As a Sales user, notice that I can manage Customers and Sales Challans, but I cannot modify product prices or warehouse configuration."*
3. **Log in as Warehouse (`warehouse@fundsroom.com`)**:
   > *"Switching to a Warehouse user, the menu updates to focus on Inventory Control and Stock Adjustments."*
4. **Log in as Admin (`admin@fundsroom.com`)**:
   > *"Now logging in as Admin, we have full access across all operations."*

---

### Part 3: Customer CRM Module (1.5 Mins)
1. **Navigate to `Customers`**:
   > *"In the CRM module, we can view all clients with server-side pagination, search, and filtering."*
2. **Demonstrate Filtering**:
   > *"We can filter by Status (Lead, Active, Inactive) and Type (Retail, Wholesale, Distributor), or search by name/company."*
3. **Add Customer**:
   > *"Let's add a new customer 'Apex Industries' as a Lead."*
4. **Add Follow-Up Note**:
   > *"Opening the customer details, we can record follow-up notes with timestamping and user tracking."*

---

### Part 4: Inventory & Low-Stock Alerts (1.5 Mins)
1. **Navigate to `Inventory`**:
   > *"In the Product Inventory module, each SKU has a price, warehouse location, current stock, and a minimum stock alert threshold."*
2. **Low Stock Alerts**:
   > *"Notice SKUs with stock below the alert threshold are highlighted with a pulsing warning badge."*
3. **Stock Movement Log & Adjustment**:
   > *"Let's adjust stock for 'Industrial Valve A200'. I will add 20 units as an 'IN' movement. Opening the logs tab, we see the full timestamped audit log of all stock movements."*

---

### Part 5: Sales Challan & Stock Deduction — Core Business Logic (2.5 Mins)
1. **Create Draft Challan**:
   > *"Now let's demonstrate the core business requirement: Sales Challan creation and atomic stock deduction."*
   > *"I will create a new Challan for 'Sharma Enterprises', selecting 5 units of 'Industrial Valve A200'. The current stock for this valve is 150."*
   > *"Saving it creates a Challan in 'Draft' status. Stock is NOT reduced yet."*
2. **Confirm Challan (Atomic Stock Deduction)**:
   > *"Now, I click 'Confirm'. Behind the scenes, the backend executes a PostgreSQL database transaction with `FOR UPDATE` row locking to prevent race conditions."*
   > *"The Challan status becomes 'Confirmed'."*
3. **Verify Stock Deduction**:
   > *"Going back to the Inventory page, 'Industrial Valve A200' stock has dropped from 150 to 145! Check the Stock Movement log—an 'OUT' movement entry was automatically created referencing Challan CH-1001."*
4. **Demonstrate Negative Stock Prevention Error**:
   > *"If we attempt to confirm a challan for a quantity exceeding available stock (e.g. 500 units when only 5 exist), the API catches it within the transaction, rolls back safely, and returns a clear 400 Bad Request error listing the exact insufficient items."*

---

### Part 6: Code Quality & Closing (1 Min)
1. **Show VS Code**:
   > *"Here is a quick look at the codebase. In `challans.ts`, you can see the database transaction block (`BEGIN`, `COMMIT`, `ROLLBACK`) and `FOR UPDATE` query.*
   > *All endpoints are validated using `express-validator` and return standard JSON error structures."*
2. **Closing**:
   > *"The project includes full Postman collection, README, deployment instructions, and test credentials. Thank you!"*
