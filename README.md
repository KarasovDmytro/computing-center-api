# Computing Center Database

A web-based system for managing computing center resources, tracking user sessions, and generating usage reports. Built with Node.js, PostgreSQL, Redis, and MongoDB.

## 📌 Project Overview

This project implements a database system for a Computing Center. It allows administrators to manage users and computers, tracks time spent by users on workstations, and generates detailed analytical reports.

### Key Features
- **User Management**: Role-based access control (RBAC). Roles include: `Programmer`, `DB Admin`, `User`, `Operator`, `Hardware Specialist`.
- **Resource Tracking**: Inventory of computers and their locations.
- **Session Monitoring**: Real-time tracking of user login/logout events and session duration.
- **Reporting System**: Generates a "Total Time Spent" report for a specific date, sorted by duration, with a print-friendly layout.
- **Audit Logging**: All sensitive actions are logged into MongoDB for security auditing.

## 🛠 Tech Stack

- **Backend**: Node.js, Express.js
- **Databases**:
  - **PostgreSQL**: Primary data store (Users, Computers, Sessions).
  - **Redis**: Session management and caching.
  - **MongoDB**: System audit logs.
- **ORM**: Prisma (for PostgreSQL).
- **Frontend**: EJS Templates + Bootstrap 5.
- **DevOps**: Docker.

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose installed on your machine.
- Git.

### Installation

1. **Clone the repository**
   git clone [https://github.com/YOUR_USERNAME/computing-center-api.git](https://github.com/YOUR_USERNAME/computing-center-api.git)
   cd computing-center-api