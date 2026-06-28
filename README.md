# CORVUS AI Browser Extension

CORVUS AI is an advanced, privacy-focused browser extension designed to enhance web reading and learning experiences through artificial intelligence. It integrates real-time web content analysis with interactive learning tools, offering users a comprehensive suite for digesting and retaining information from the internet.

## Architecture

The project is divided into two main components:
1. **Frontend Extension (React/Vite)**: A Chrome extension that injects into web pages and provides a sidebar UI.
2. **Backend API (FastAPI)**: A local Python server that processes AI requests, handles embeddings via ChromaDB, and generates structured learning materials.

## Key Features

- **Automated Summary and Analysis**: Extracts and summarizes core concepts from any web article.
- **Interactive Flashcards**: Generates 3D-flippable Q&A cards based on the article's context for active recall testing.
- **Dynamic Mind Mapping**: Visualizes complex topics into structured diagrams using Mermaid.js.
- **Web Text Highlighter**: Allows users to select and persistently highlight text on web pages.
- **Native Text-to-Speech (TTS)**: Reads summaries and key points aloud using the browser's native speech synthesis API.
- **Clean Reader Mode**: Strips away advertisements and distracting elements, presenting articles in a dark-themed, distraction-free environment.
- **History Tracking**: Saves previously analyzed articles and highlights to a local ChromaDB instance for easy retrieval.
- **Notebook Export**: Exports AI analysis to PDF or TXT formats.

## Prerequisites

- Node.js (v18 or higher recommended)
- Python (3.9 or higher recommended)
- Chrome or Chromium-based browser
- GitHub Personal Access Token (for AI model access)

## Installation Guide

### 1. Backend Setup

Navigate to the backend directory and set up the Python environment:

```bash
cd backend-api
python -m venv venv
```

Activate the virtual environment:
- Windows: `.\venv\Scripts\activate`
- macOS/Linux: `source venv/bin/activate`

Install dependencies:
```bash
pip install -r requirements.txt
```

Configure environment variables:
Create a `.env` file in the `backend-api` directory and add your GitHub Personal Access Token (or preferred LLM provider key):
```env
GITHUB_TOKEN=your_token_here
```

Start the backend server:
```bash
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup

Navigate to the frontend directory and install dependencies:

```bash
cd frontend-extension
npm install
```

Build the extension:
```bash
npm run build
```

### 3. Loading the Extension in Chrome

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable "Developer mode" in the top right corner.
3. Click "Load unpacked" in the top left corner.
4. Select the `dist` directory located inside the `frontend-extension` folder (`CORVUS-extensions-/frontend-extension/dist`).

## Usage

1. Ensure the local backend server is running.
2. Navigate to any article on the web.
3. Click the CORVUS AI extension icon or use the floating action button to analyze the page.
4. Use the sidebar to toggle between Summaries, Flashcards, Mind Maps, and History.

## Technology Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Lucide React, Mermaid.js
- **Backend**: Python, FastAPI, LangChain, ChromaDB, Uvicorn
- **Browser APIs**: Chrome Extension API (Manifest V3), Web Speech API, Local Storage

## License

This project is proprietary and intended for personal use and development.
