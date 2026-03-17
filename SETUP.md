# 🛠️ Setup Guide

Follow these steps to get **Hey Dad** running on your local machine.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js:** Version 18.x or higher.
- **npm:** Usually comes with Node.js.
- **Git:** To clone the repository.

## 🔑 API Key Setup

1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Create a new API Key.
3. Copy the key; you'll need it for your environment variables.

## 🚀 Installation

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/mrbrightsides/hey-dad.git
   cd hey-dad
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   *Note: See `.env.example` for all available configuration options.*

## 💻 Development

Start the development server with hot-reload:
```bash
npm run dev
```
The app will be available at `http://localhost:3000`.

## 🏗️ Production Build

To create a production-ready build:
```bash
npm run build
```
The optimized files will be generated in the `dist/` directory.

## 🚢 Deployment

### Vercel (Recommended)
You can easily deploy the frontend to Vercel. Make sure to add your `GEMINI_API_KEY` to the Vercel project environment variables.
Live Demo: [https://halo-ayah.vercel.app/](https://halo-ayah.vercel.app/)

### Manual Server
To start the production server:
```bash
npm start
```

---

**Need help?** Contact us at [support@elpeef.com](mailto:support@elpeef.com) or join our [Discord](https://discord.com/channels/@khudri_61362).
