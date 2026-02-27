# CondoGate: Condo Package & Resident Room Management System

**CondoGate** is a web-based tracking and management application designed to centralize package registration, tenant-room assignments, and status history logs. It aims to reduce lost-package incidents and improve transparency between condominium staff and residents.

---

## Team Members
 
This project was developed by the following team members:
 
- **May Thu Chit (6715141)**  
  GitHub: [MThuChit](https://github.com/MThuChit)
 
- **Aung Sann Thit(6712111)**  
  GitHub: [AungSannThit2000](https://github.com/AungSannThit2000)
 
- **Aung Chan Myint (6715111)**  
  GitHub: [Gebu19](https://github.com/Gebu19)

---

## 🚀 Project Overview
### Problem Statement
Manual tracking methods like paper logs or spreadsheets often lead to missing records, unclear pickup status, and disputes. 

### The Solution
The system provides a central hub for staff to register incoming packages and for tenants to confirm their package status at any time.

### Target Users
* **Officer/Staff**: Register incoming packages, update status and notes, and search records.
* **Tenant**: View personal packages and status history.
* **Admin**: Manage buildings, rooms, and user accounts.

---

## 🛠️ Technology Stack
* **Frontend**: Next.js 
* **Backend**: Next.js REST API (API Routes) 
* **Database**: MongoDB (Self-hosted) 

---

## ✨ Core Features
* **Role-Based Access Control**: Secure login for TENANT, OFFICER, and ADMIN roles.
* **Package Management**: Record incoming packages with tracking numbers, carriers, and notes.
* **Status Tracking & Logs**: Maintain a complete audit trail of all status updates.
* **Room & Building Management**: Create and update buildings and individual room availability.
* **Search & Filter**: Find records by date, status, tenant, or tracking number.

---

## 📊 Data Models
The system implements REST API CRUD operations for the following entities:

| Entity | Primary Fields |
| :--- | :--- |
| **USER_ACCOUNT** | username, password, role, status, createdAt  |
| **TENANT** | userId, buildingId, roomNo, fullName, phone, email  |
| **STAFF** | userId, fullName, phone, email  |
| **BUILDING** | buildingCode, buildingName  |
| **ROOM** | buildingId, roomNo, floor, status  |
| **PACKAGE** | tenantId, receivedByStaffId, trackingNo, carrier, arrivedAt, currentStatus, note, pickedUpAt  |
| **PACKAGE_STATUS_LOG** | packageId, updatedByStaffId, status, note, statusTime  |

---

## Login

![](frontend/src/images/Login_page.png)

## Tenant

![](frontend/src/images/Tenant/Tenant_Dashboard.png)

![](frontend/src/images/Tenant/Tenant_Package_History.png)

![](frontend/src/images/Tenant//Tenant_Profile.png)

## Officer

![](frontend/src/images/Officer/Officer_Dashboard.png)

![](frontend/src/images/Officer/Tenant_Package_History.png)

![](frontend/src/images/Officer/Officer_RegisterNewPackage.png)

## Admin

![](frontend/src/images/Admin/Admin_Dashboard.png)

![](frontend/src/images/Admin/Admin_Packages.png)

![](frontend/src/images/Admin/Admin_Package_View.png)

![](frontend/src/images/Admin/Admin_Officer.png)

![](frontend/src/images/Admin/Admin_Building.png)

![](frontend/src/images/Admin/Admin_Room:Unit.png)

![](frontend/src/images/Admin/Admin_Tenant.png)

![](frontend/src/images/Admin/Admin_PackageLog.png)



