# Aquila S1000D-AI

Aquila S1000D-AI is a proof-of-concept platform for processing technical documentation using AI text and vision models. The backend exposes a FastAPI service while the frontend is a React application built with Tailwind CSS.

## Features

- **Document Management** – upload PDFs or images and extract text and illustrations
- **AI Processing** – classify documents, extract structured data, rewrite content to Simplified Technical English and generate captions/objects from images
- **Data Modules** – create, edit and validate S1000D data modules with STE scoring
- **Illustrations** – manage ICNs with captioning, object detection and hotspot suggestions
- **Publication Modules** – drag-and-drop builder with export options (XML, HTML, PDF)
- **Provider Switching** – dynamically select OpenAI, Anthropic or local models for text and vision tasks

## Getting Started

### Backend
1. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
2. Copy `backend/.env` and adjust values for your environment (MongoDB URL, API keys, provider settings).
3. Run the API server:
   ```bash
   uvicorn backend.server:app --reload
   ```

### Frontend
1. Install dependencies:
   ```bash
   cd frontend && yarn install
   ```
2. Start the development server:
   ```bash
   yarn start
   ```

The React app will open at `http://localhost:3000` and communicates with the FastAPI backend on port `8001` by default.

## Repository Layout

- `backend/` – FastAPI application and service code
- `frontend/` – React web interface
- `backend_test.py` – comprehensive API test suite
- `test_result.md` – shared testing log

## Status

This repository represents a working prototype with most functionality implemented. See `test_result.md` for detailed testing notes and current status.

