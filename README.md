# 🌌 ReportMe

> **Debug smarter, faster.** A production-ready, AI-assisted debugging platform featuring a modern glassmorphic UI.

ReportMe is a cutting-edge web application designed to streamline your debugging process. Users can submit buggy code via text, file upload, or image (OCR), and interact with an intelligent chatbot to resolve their coding issues seamlessly.

## ✨ Features

- **Google OAuth Integration:** Secure and seamless authentication using `@react-oauth/google`.
- **Dynamic Input Methods:** Upload code via direct text paste, file selection, or image upload (powered by client-side OCR using `tesseract.js`).
- **Interactive AI Chatbot:** A responsive chat interface for debugging conversations, featuring slide-in animations.
- **Syntax Highlighting:** Persistent code viewer powered by `react-syntax-highlighter` to keep your target code in context while chatting.
- **Context System:** A right-hand panel that tracks User Profiles, Error History, and previous Conversation sessions.
- **Glassmorphism & Dark Theme:** A visually stunning, modern dark UI with backdrop blurs, neon accents, and smooth transitions built with Framer Motion.

## 🛠️ Tech Stack

- **Frontend Framework:** Next.js 16 (App Router) & React 19
- **Styling:** Tailwind CSS v4
- **Animations:** Framer Motion
- **State Management:** Zustand
- **Icons:** Lucide React
- **Authentication:** Google OAuth2
- **OCR Engine:** Tesseract.js

## 🗄️ Backend & Database Architecture

ReportMe utilizes a serverless integration model. **There is no traditional relational database (like PostgreSQL or MongoDB) managed directly within this Next.js repository.**

Instead, all backend logic, data persistence, and AI interactions are driven by **n8n automations**. 
- **Webhook 1 (`/code`):** Handles initial code ingestion, mode selection, and context setting.
- **Webhook 2 (`/chatbot`):** Handles the back-and-forth conversational history and AI response generation.

This architecture ensures maximum scalability and decouples the beautiful frontend from the complex backend AI workflows.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/radheshreddyyarram/ReportMe.git
   cd ReportMe
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory and add your credentials:
   ```env
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
   NEXT_PUBLIC_WEBHOOK_CODE_URL=https://your-n8n-instance.com/webhook/code
   NEXT_PUBLIC_WEBHOOK_CHAT_URL=https://your-n8n-instance.com/webhook/chatbot
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
