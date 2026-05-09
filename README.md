# Mindful Viscan
### Student Mental Health & Wellness Platform

![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Clerk](https://img.shields.io/badge/Clerk-6C47FF?style=for-the-badge&logo=clerk&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

> Empowering student well-being through accessible counseling, mood tracking, and curated mental health resources.

## 📖 About The Project

**Mindful Viscan** is a modern web application designed to support the mental health of the Viscan community. Built to empower students, it bridges the gap between individuals seeking help and guidance counselors providing support through a secure, digital interface.

The system features a strict **Role-Based Access Control (RBAC)** architecture, ensuring a private and distinct experience for Students and Counselors.

## ✨ Key Features

### 🛡️ Secure Authentication & RBAC
*   **Dual Portals**: Dedicated dashboards for Students and Counselors.
*   **Middleware Protection**: Edge-compatible middleware strictly guards routes.
    *   Counselors cannot access Student views.
    *   Students cannot access Counselor views.
    *   Unauthorized attempts trigger an auto-redirect.
*   **Clerk Integration**: Robust session management and user metadata handling with Supabase synchronization.

### 🎓 Student Portal
*   **Mood Tracking**: Daily mood logging with an interactive **Year in Pixels** heatmap implementation.
*   **Counseling Access**: Intuitive form to request sessions with privacy controls.
*   **Real-time Chat**: Secure, direct messaging channel with assigned counselors.
*   **Resource Library**: Access to curated mental health articles and videos.

### 👩‍⚕️ Counselor Dashboard
*   **Smart Session Management**:
    *   **One-Click Verification**: Streamlined onboarding for new counselors.
    *   **Tabbed Workflow**: Separate views for "Available Requests" and "Active Sessions".
*   **Chat Workspace**:
    *   **Context-aware sidebar** with session status indicators.
    *   **Real-time message updates** via Supabase Realtime.
*   **Resource Admin**: Full CRUD capabilities to manage the student resource library.

## 🛠️ Tech Stack

This project leverages a modern, type-safe stack for performance and reliability.

| Category | Technology | Usage |
| :--- | :--- | :--- |
| **Framework** | **Next.js 16** (App Router) | Core React framework & SSR/ISR |
| **Language** | **TypeScript** | Static typing & reliability |
| **Auth** | **Clerk** | User management & Middleware |
| **Database** | **Supabase** | PostgreSQL database, RLS policies & Realtime |
| **Styling** | **Tailwind CSS** | Responsive, "Mindful Green" themed UI |
| **Deploy** | **Vercel** | Edge runtime hosting & CI/CD |

## 🚀 Getting Started

Follow these steps to run Mindful Viscan locally.

### Prerequisites
*   Node.js 18+
*   npm

### Installation

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/your-username/mindful-viscan-web.git](https://github.com/your-username/mindful-viscan-web.git)
    cd mindful-viscan-web
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**
    Create a `.env.local` file in the root and add your keys:
    ```env
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
    CLERK_SECRET_KEY=sk_test_...
    
    NEXT_PUBLIC_SUPABASE_URL=[https://your-project.supabase.co](https://your-project.supabase.co)
    NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
    SUPABASE_SERVICE_ROLE_KEY=ey...
    ```

4.  **Run the Development Server**
    ```bash
    npm run dev
