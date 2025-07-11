# Aquila S1000D-AI

Aquila is a production-ready platform that converts legacy manuals and drawings into S1000D compliant content with the help of modern AI models.  It is composed of a **FastAPI** backend, a **React** front-end and a **MongoDB** database.

This guide explains in simple terms how to install, run and use every part of the system.

---

## 1. Installation

### 1.1 Prerequisites

* **Python 3.10+** - available from <https://python.org>
* **Node.js 18+** - download from <https://nodejs.org>
* **MongoDB** - install locally or run a container with `docker run -p 27017:27017 mongo`

### 1.2 Clone the repository

Open a terminal and run:

```bash
git clone <repository-url>
cd aquila
```

### 1.3 Backend setup

Install Python dependencies:

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file inside the `backend` directory and provide the following variables:

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=aquila
TEXT_PROVIDER=local       # local, openai or anthropic
VISION_PROVIDER=local     # local, openai or anthropic
# Optional when using cloud providers
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
```

Start the API server:

```bash
uvicorn backend.server:app --reload --port 8001
```

### 1.4 Frontend setup

Open a second terminal, install the React dependencies and launch the UI:

```bash
cd frontend
npm install
npm start
```

The web app will be running on <http://localhost:3000> and will communicate with the backend on port `8001`.

---

## 2. Using Aquila

Once both servers are running, open your browser to `http://localhost:3000`.

### 2.1 Uploading and processing documents

1. Click **Upload** in the top toolbar and choose one or more files (`.pdf`, `.docx`, `.pptx`, `.xlsx`, `.txt` or image formats).
2. Uploaded files appear under **Documents** in the sidebar.
3. Select a document and click **Process** to create data modules.  The backend extracts text and images, classifies the content and generates realistic Data Module Codes.

### 2.2 Viewing data modules

* Newly created modules appear under **Data Modules**. Click one to view it in the main workspace.
* The **Verbatim DM** panel shows the original text and the **STE DM** panel shows the simplified ASD‑STE100 version when available.
* Use the XML editors at the bottom to view or tweak the XML representations. Click **Validate** to run XML schema checks.

### 2.3 S1000D compliance

* Aquila automatically constructs a full Data Module Code for each module using
  fields returned by the AI classifiers.
* A minimal S1000D XML file is generated alongside the text and validated
  against the included schema. The validation status is shown by coloured LEDs.
* The DMC generation follows the official structure so modules can be organised
  and referenced just like any other S1000D project.

### 2.4 Managing illustrations (ICNs)

* Images extracted from PDFs or uploaded directly show up under **ICNs**.
* Selecting an ICN displays its caption, detected objects and suggested hotspots.
* You can modify the hotspots at any time from the Illustration Manager and the
  changes will be stored with that ICN.

Data modules list the ICNs they reference. The XML output contains `<icnRef>`
elements that point to the processed images by ID, allowing the same image to be
reused in multiple modules via its LCN.

Whenever a data module mentions another DMC in its text, Aquila automatically
adds a `<dmRef>` entry so modules become interlinked according to the S1000D
specification.

### 2.5 AI provider configuration

* Click **AI Providers** in the toolbar to open the configuration modal.
* Choose between the **local**, **OpenAI** or **Anthropic** providers.
* For each provider you can select the specific text and vision model from a drop-down list.
* The local options include **Josiefied‑Qwen3‑30B** for text and **Qwen‑VL‑Chat** for captioning.
* You can test the selected models directly in the modal before saving your choice.

### 2.6 Building and publishing publication modules

1. Choose **PM Builder** from the toolbar.
2. Drag data modules into the desired order to define the publication structure.
3. Press **Publish**, then pick the output variants (verbatim or STE) and formats (XML, HTML, PDF, DOCX).
4. A ZIP package containing the publication is generated and can be downloaded from the publication module list.

### 2.7 Additional tools

* **Applicability Matrix** – manage applicability data in a spreadsheet-style view.
* **Illustration Manager** – edit ICN metadata, captions and hotspots.
* **BREX Designer** – define business rules in YAML and validate modules in real time.

---

## 3. Testing

A simple integration script is available in `backend_test.py`:

```bash
python backend_test.py
```

You can also run the automated tests with `pytest`:

```bash
pytest -q
```

---

## 4. Development notes

* Uploaded files are stored under `/tmp/aquila_uploads` by default.
* All data modules, ICNs and publication modules are persisted in MongoDB.
* The modular design allows different AI providers to be swapped with minimal changes.

---

## License

MIT
