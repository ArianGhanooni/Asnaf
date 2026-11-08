# 🚀 Asnaf Backend Platform (APM)

This repository contains the server-side code (Backend) for the **Asnaf (اصناف)** platform, built on top of the **Cloudland APM** (Application Platform Management) infrastructure framework.

---

## 🏗 Architecture & Design Patterns

The project utilizes modern software architecture principles:

- **Microservices Architecture:** Services decoupled by domain (Authentication, System Management, Storage, AI, Background Processing, etc.).
- **API Gateway:** Uses **Ocelot** to manage and route incoming client requests.
- **CQRS (Command Query Responsibility Segregation):** Strict separation of read and write operations using the Mediator pattern.
- **Repository Pattern:** Abstraction layer for dynamic and relational data access.
- **Domain-Driven Design (DDD):** Structured separation of Models, DTOs, and Domain Services.

---

## 🛠 Technology Stack

- **Core:** .NET 9 / .NET 10 (C#)
- **Database:** SQL Server (Entity Framework Core)
- **Caching:** Redis
- **Search Engine:** Elasticsearch
- **Background Jobs:** Hangfire
- **Logging:** Serilog (with Elasticsearch sink)
- **Identity & Access:** FusionAuth & JWT (JSON Web Tokens) with 2FA
- **Storage:** MinIO (S3 API) & NAS (SFTP)
- **AI Integration:** OpenAI & Local LLM Services (with RavenDB session store)
- **Validation:** FluentValidation
- **Object Mapping:** AutoMapper

---

## 📂 Project Structure & Services Overview

### 1️⃣ Microservices (Entry Points)

- **`Cloudland.APM.Microservices.Gateway`**
  - Central entry point for all client requests (API Gateway).
  - Manages routing and upstream reverse proxy via `ocelot.json`.
  - Enforces centralized JWT bearer token security.

- **`Cloudland.APM.Microservices.Authentication`**
  - Handles user identity, registration, login, logout, and 2FA.
  - Integrates with FusionAuth.
  - Manages User Roles and Permissions.

- **`Cloudland.APM.Microservices.AppManagement` (Base Management)**
  - System-wide constants and hierarchical categories (`Constant`, `ConstantRecursive`).
  - Data-level access permissions on constants (`UserConstantPermission`).
  - Persian/Solar and Gregorian calendar conversion and metadata (`Calendar`).
  - Elasticsearch re-indexing triggers.

- **`Cloudland.APM.Microservices.AppPermissionManagement`**
  - Role-based and claim-based permission management service (RBAC).

- **`Cloudland.APM.Microservices.Storage`**
  - Object storage service managing MinIO S3 buckets and objects.
  - NAS / SFTP storage management.

- **`Cloudland.APM.Microservices.ChatGPT` & `LocalChatGPT`**
  - AI-powered services.
  - Integrates with OpenAI APIs and local LLM endpoints.

- **`Cloudland.APM.Microservices.ReportGenerator` & `ReportViewer`**
  - Dedicated services for asynchronous report generation and dashboard delivery.

- **`Cloudland.APM.BackgroundTask`**
  - Background processing and task scheduling service using Hangfire.
  - Executes scheduled maintenance jobs (e.g., Elasticsearch search indexing).

---

### 2️⃣ Data & Infrastructure Layers

- **`Cloudland.APM.DataBaseContext`**
  - Entity Framework Core `APMDBContext` with Audit.NET integration.
  - Uses `DefaultConnection` configuration.

- **`Cloudland.APM.DatabaseConfiguration`**
  - Fluent API configurations for base database entities and views.

- **`Cloudland.APM.Repository`**
  - Dynamic SQL and stored procedure repositories (`TableRepository`, `StoredProcedureRepository`, `DatabaseRepository`).

---

### 3️⃣ Domain Objects (Models & DTOs)

- **`Cloudland.APM.Models`**
  - Domain entities: `Constant`, `ConstantRecursive`, `UserConstantPermission`, `Calendar`, base schema models.

- **`Cloudland.APM.DTO`**
  - DTOs for client-server communication, authentication, 2FA, MinIO objects, and Low-Code NodeObjects.

- **`Cloudland.APM.Mapper.Profiles`**
  - AutoMapper configuration profiles with Persian date converters.

---

### 4️⃣ Shared Libraries & Utilities

- **`Cloudland.APM.ShareObjects`**
  - Enums and system constants (`ConstantValueType`).

- **`Cloudland.APM.Utils`**
  - **DQL (Dynamic Query Language):** Persian natural language query to SQL engine.
  - **Calendar:** Persian / Gregorian date utilities.
  - **Transliteration & ErrorTransform:** Centralized text processing and error localization.

- **`Cloudland.Console.TestApp`**
  - Console test harness for the DQL query engine.

---

## 🚀 Getting Started

### Prerequisites

1. **.NET 9 / 10 SDK**.
2. **SQL Server**.
3. **Redis** (Required for distributed caching).
4. **Elasticsearch** (Required for search and logging).
5. **FusionAuth** (Required for authentication).

### Configuration & Run

1. Open `APM.sln` in your IDE.
2. Configure your connection strings in the `appsettings.json` / `appsettings.Development.json` of the microservices:
   ```json
   "ConnectionStrings": {
     "DefaultConnection": "Server=...;Database=Asnaf;..."
   }
   ```
3. Set the desired microservices (e.g., Gateway, Authentication, AppManagement) as Startup Projects and run.
