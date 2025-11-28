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

2. **Environment Setup**
    Create a .env file in the root directory based on .env.example

3. **Run with Docker Start the entire infrastructure (App + DBs)**
    docker-compose up --build

**The application will be running at: http://localhost:3000**

### Project Structure
computing-center-api/
├── src/
│   ├── config/         # Environment variables & database connection configuration
│   ├── controllers/    # Request handlers (input validation, sending responses)
│   ├── middlewares/    # Express middlewares (authentication, logging, error handling)
│   ├── public/         # Static assets (CSS styles, images, client-side JS)
│   ├── routes/         # API route definitions & URL mapping
│   ├── services/       # Business logic & database interaction (Prisma/SQL)
│   ├── utils/          # Reusable helper functions (date formatting, etc.)
│   ├── views/          # Server-side rendered templates (EJS)
│   └── index.js        # Application entry point & server setup
├── .env.example        # Template for environment variables
├── .gitignore          # Files and folders to ignore in Git
├── docker-compose.yaml # Docker services orchestration (App, Postgres, Redis, MongoDB)
├── Dockerfile          # Instructions to build the Node.js application image
└── package.json        # Project metadata & dependencies

## 👥 Team
- **[Karasov Dmytro]** - Team Lead, Database Architect.

- **[Taran Maksym]** - Backend Logic, Auth & Sessions.

- **[Korniyenko Maksym]** - Frontend, Reporting & Visualization.