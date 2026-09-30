# Military Asset Management System (MAMS) - Project Report

## 1. Project Overview
The Military Asset Management System (MAMS) is a secure, responsive, and robust web application designed for military commanders and logistics personnel to efficiently track, transfer, and manage critical assets such as weapons, vehicles, and medical supplies across multiple military bases. 

**Assumptions & Limitations:**
- **Assumptions:** Personnel assigned to equipment are recorded as string names for simplicity rather than a dedicated personnel table. The system assumes a continuous internet connection for database synchronization.
- **Limitations:** Real-time push notifications for transfers are not currently implemented; the dashboard updates dynamically on page load. 

## 2. Tech Stack & Architecture
- **Frontend (Client-Side):** React.js, Vite, Tailwind CSS, React Router, Axios. 
  - *Why:* React provides a fast, component-driven UI. Tailwind CSS allows for rapid, premium styling without writing heavy custom CSS. Vite offers lightning-fast builds.
- **Backend (Server-Side):** Node.js, Express.js, JSONWebToken (JWT), bcryptjs.
  - *Why:* Express is lightweight and perfect for RESTful APIs. JWT allows stateless, secure authentication.
- **Database:** MySQL.
  - *Why:* A relational database is strictly required for this project to maintain ACID compliance for critical military inventory transactions. Strict foreign keys ensure data integrity across bases and equipment.

## 3. Data Models / Schema
The core schema relies on a ledger-style architecture to ensure accurate tracking:
- `bases`: Stores base names and locations.
- `users`: Stores login credentials and RBAC roles, linked to a specific base.
- `equipment_categories` & `equipment`: Master catalog of assets.
- `purchases`: Logs incoming assets to a specific base.
- `transfers`: Logs movement between `from_base_id` and `to_base_id`.
- `assignments`: Tracks assets issued to personnel, with statuses (`Assigned`, `Returned`, `Expended`).
- `api_logs`: An immutable audit trail of all transactions.

## 4. RBAC Explanation
Role-Based Access Control is enforced via the `requireRole` middleware in Node.js:
- **Admin:** Full access to all bases, can create any transaction.
- **Base Commander:** Can only view and manage assets belonging to their assigned `base_id`.
- **Logistics Officer:** Can record purchases and initiate transfers, but cannot arbitrarily expend items.

## 5. API Logging
Transaction logging is handled via a custom Express middleware (`apiLogger.js`). It intercepts all `POST`, `PUT`, and `DELETE` requests. Upon successful execution, it asynchronously writes the method, endpoint, user ID, and JSON payload to the `api_logs` table. This provides a transparent audit trail of "who did what and when".

## 6. Setup Instructions
### Database Setup:
1. Ensure MySQL is running.
2. Import the provided `database_schema.sql` script into your MySQL server to create the schema and seed data.

### Backend Setup:
1. Navigate to the `backend` folder: `cd backend`
2. Install dependencies: `npm install`
3. Configure the `.env` file (ensure your DB credentials match, e.g., `DB_PASSWORD=Shweta@26`).
4. Run the seed script to create the admin user: `node seed.js`
5. Start the server: `node server.js` - runs on port 5000.

### Frontend Setup:
1. Navigate to the `frontend` folder: `cd frontend`
2. Install dependencies: `npm install`
3. Start the dev server: `npm run dev`

## 7. API Endpoints
- **POST `/api/auth/login`**: Authenticates user and returns JWT.
- **GET `/api/v1/dashboard`**: Returns aggregated Net Movement, Closing Balance, Assigned, and Expended counts.
- **POST `/api/v1/purchases`**: Records a new equipment purchase.
- **POST `/api/v1/transfers`**: Moves inventory from one base to another.
- **PUT `/api/v1/assignments/:id`**: Updates assignment status (e.g., to "Expended").

## 8. Login Credentials
You can log in to the system immediately using the seeded administrator account:
- **Username:** `admin`
- **Password:** `admin123`
