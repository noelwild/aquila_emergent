# Aquila S1000D-AI

## Introduction
Aquila S1000D-AI is an experimental platform that demonstrates how artificial intelligence can streamline the production of technical manuals in S1000D format. The project originated as a proof of concept for processing legacy maintenance documents by combining computer vision, natural language processing, and an interactive authoring interface. Today it has grown into a full stack prototype covering document ingestion, analysis, editing, and publishing. By integrating AI services from OpenAI and Anthropic alongside local models, the system showcases how modern language and vision models can assist with complex aerospace documentation tasks. While many features remain in an early research stage, the repository now contains a fully runnable backend API and a front-end web interface that together offer a glimpse into the future of automated technical writing.

Aquila follows the S1000D specification for data and publication modules, enabling interoperability with existing S1000D toolchains. A series of Python data models mirrors the major components of the standard, from data modules and publication modules to illustration control numbers (ICNs). These models track processing status, validation results, and security markings so that authors can monitor progress as content moves through the workflow. On the front-end side a dark themed React application built with Tailwind CSS renders uploaded documents and generated modules, providing in-browser editors and rich visualizations. LED style indicators signal validation results, while keyboard shortcuts allow power users to quickly navigate large projects. Although this is not a production ready system, it demonstrates how developers might combine AI services with open source frameworks to modernize S1000D production.


## Features

- **Document Management** – upload PDFs or images and extract text and illustrations
- **AI Processing** – classify documents, extract structured data, rewrite content to Simplified Technical English and generate captions/objects from images
- **Data Modules** – create, edit and validate S1000D data modules with STE scoring
- **Illustrations** – manage ICNs with captioning, object detection and hotspot suggestions
- **Publication Modules** – drag-and-drop builder with export options (XML, HTML, PDF)
- **Provider Switching** – dynamically select OpenAI, Anthropic or local models for text and vision tasks

## Project Scope
The goal of Aquila S1000D-AI is to provide a comprehensive reference implementation for an AI-assisted document processing pipeline. The system aims to ingest a variety of legacy formats – such as PDF, Microsoft Office files, and plain text – and transform them into structured S1000D data modules. Computer vision is used to identify and caption images, while natural language models classify document sections and rewrite text into Simplified Technical English (STE). Editors built into the web interface allow authors to review and adjust the AI output. Publication modules organize data modules into a hierarchical tree, after which the entire project can be exported as XML, HTML, or PDF packages. A key architectural feature is the AI provider factory that supports multiple vendor back ends. The current implementation can use OpenAI or Anthropic models with API keys supplied via environment variables, and it also supports local inference via Hugging Face models for environments without network access. This design ensures that organizations can adapt the system to whichever AI providers best meet their needs without altering the rest of the codebase.

Because Aquila is an experimental system, many details are simplified compared to a commercial product. Nevertheless, the code base demonstrates best practices for structuring a Python FastAPI project, writing clear Pydantic models, and building a modular React application. Developers exploring the repository will find examples of asynchronous file handling, background task management, and unified error reporting. While certain processing steps are mocked or stubbed out, these placeholders show where more advanced AI models could be plugged in. The repository also contains a robust set of automated tests managed via pytest, along with a test result log that tracks which components have been verified. In short, this project aims to serve as a springboard for future research or commercial implementations rather than a finished product.

## Architecture Overview
Aquila is divided into two major parts: a FastAPI backend that provides REST endpoints for document and module management, and a React frontend that interacts with those endpoints. The backend is written entirely in Python and relies on MongoDB for persistent storage. Mongo collections store uploaded documents, data modules, publication modules, and illustrations. Each record contains metadata such as creation timestamps, validation results, and AI processing status. The server also maintains a global settings object that tracks the currently selected AI providers and other configuration options. This settings object can be modified at runtime via an API endpoint, allowing administrators to switch providers without downtime.

All AI functionality is abstracted behind a provider factory. For text-related tasks, the system can classify documents, extract structured data, and rewrite paragraphs to STE. For vision tasks, it can generate captions, identify objects, and propose interactive hotspots on images. The factory exposes common interfaces so that the rest of the code does not need to know which provider implementation is active. The OpenAI provider uses the GPT family for text tasks and the vision API for image tasks, while the Anthropic provider wraps the Claude models. The local provider now loads open-source models from Hugging Face—`Goekdeniz-Guelmez/Josiefied-Qwen3-30B-A3B-abliterated-v2` for text and `Qwen/Qwen-VL-Chat` for captions—so developers can run the system without external API keys. New providers can be added by implementing the same base classes and registering them with the factory.

The front-end application mirrors this architecture through a collection of React components. A toolbar across the top of the screen offers quick access to document upload, provider configuration, and publishing actions. A sidebar lists all data modules, source documents, and ICNs in the project. The main workspace uses a 3x2 grid layout: one area shows the original document, another displays the verbatim data module, a third area hosts the STE version, and additional panes contain XML editors for direct markup editing. When authors edit text or metadata, changes are saved back to the backend via REST calls. The entire interface is optimized for keyboard navigation so that power users can keep their hands on the keyboard while reviewing large documents.

## Backend Services
The backend resides under the `backend` directory. The entry point is `server.py`, which defines the FastAPI application, configures CORS, sets up logging, and registers an `/api` router with numerous endpoints. On startup the server loads environment variables from `.env`, establishes a connection to MongoDB via Motor, and initializes the `DocumentService`. Endpoints include:

* `/api/health` – simple health check that also returns provider configuration
* `/api/settings` – get or update global system settings
* `/api/providers` – retrieve available providers and the current selection
* `/api/providers/set` – change the active text and vision providers
* `/api/documents` – list all uploaded documents
* `/api/documents/upload` – upload a new file for processing
* `/api/documents/{id}/process` – run AI analysis to create data modules
* `/api/data-modules` – CRUD operations for S1000D data modules
* `/api/icns` – manage illustrations with captioning and hotspot data
* `/api/publication-modules` – create and publish compiled manuals

Each endpoint is fully asynchronous and returns pydantic models for type safety. Errors are logged and surfaced as standard HTTP exceptions. The document service handles file storage under `/tmp/aquila_uploads` by default, performing SHA256 checks and capturing basic metadata. When processing a file, it extracts text based on the MIME type, splitting PDF pages or scanning PowerPoint slides as needed. The text is then passed through the selected AI provider for classification and extraction. If the provider successfully rewrites the text into STE, the service creates both a verbatim data module and an STE variant. Images, whether uploaded directly or extracted from PDFs, are processed through the vision provider for captions, objects, and hotspot suggestions. The results are stored in the ICN collection.

Validation is another key feature. The `/validate/{dmc}` endpoint performs basic checks on a data module’s fields and content. The validation status is stored in the module record as green, amber, or red based on the number of issues found. In a production system this would be expanded to include XSD and BREX validation as well as security classification rules. Publication modules gather lists of data modules and define a structure tree, after which they can be published to various formats. The current implementation of the publish endpoint is a stub that simply returns success along with the chosen formats and variants. Nonetheless, the interface demonstrates how a real S1000D publishing pipeline might be triggered.

## Frontend Application
The React-based frontend can be found in the `frontend` directory. It uses Create React App with Craco for custom configuration, though some of the build scripts are intentionally minimal in this proof of concept. Tailwind CSS provides the dark themed styling, while a small set of custom components implements the Aquila design language. The root component sets up routing and a global context to manage provider settings, open documents, and workspace layout. Keyboard shortcuts leverage the `react-hotkeys-hook` library, allowing actions like `Alt+Left` and `Alt+Right` to switch tabs. The toolbar component handles uploading files, opening the provider configuration modal, triggering publication, and displaying status indicators. The sidebar uses a virtual list to efficiently render large numbers of data modules or images.

A key feature of the interface is the 3x2 main workspace grid. Each cell is resizable and can host different types of content. When a user selects a document or module, the appropriate viewers load in the grid. The document viewer uses PDF.js for PDF rendering and a custom image viewer for other formats. The data module viewers show either the verbatim or STE content with formatting and validation messages. For editing raw XML, the Monaco editor is embedded with syntax highlighting, line numbers, and linting. The illustration manager presents a grid of thumbnails with caption fields, object detection results, and a hotspot editor. All of these components communicate with the backend using the Fetch API, keeping the interface responsive through asynchronous calls.

The front-end also exposes an AI provider modal where users can test the currently configured provider. They can send sample text to be classified or extracted, or upload an image to see captioning results in real time. This helps validate API keys and provider availability without running a full document through the pipeline. Because the provider configuration is stored in the backend settings model, changing providers in the modal affects both the front-end and subsequent backend requests immediately.

## AI Provider System
Under `backend/ai_providers` you will find the implementation for provider switching. A base module defines abstract classes for text and vision providers, along with simple data transfer objects for requests and responses. The `provider_factory.py` file reads environment variables to determine which provider is active and returns instances of the corresponding class. The OpenAI provider uses the GPT family for text tasks and the vision API for image tasks, while the Anthropic provider wraps the Claude models. The local provider loads Hugging Face models (`Goekdeniz-Guelmez/Josiefied-Qwen3-30B-A3B-abliterated-v2` for text and `Qwen/Qwen-VL-Chat` for captions) so that developers can run the system entirely offline. Switching providers is as simple as calling the `/api/providers/set` endpoint or using the provider modal in the UI.

Each provider supports three text tasks: classification, structured data extraction, and rewriting to STE. Classification identifies the document type (for example, maintenance procedure or parts list) and extracts a title. Extraction attempts to pull structured fields, though in this prototype it returns example data. Rewriting to STE sends the text through a specialized prompt that enforces the simplified English rules defined in ASD-STE100. For images, the vision provider can generate captions, list objects, and create hotspot coordinates. The implementations handle authentication, API calls, and basic error management, returning consistent data structures regardless of which provider is in use. This modular approach makes it straightforward to experiment with new models or local inference servers.

## Document Processing Workflow
Aquila’s workflow begins with uploading a document via the `/api/documents/upload` endpoint or the “Upload” button in the toolbar. The backend stores the file and records metadata such as size, MIME type, and a SHA256 checksum. Once uploaded, the document appears in the sidebar under “Documents.” The author can then trigger processing, which runs text extraction and AI analysis. For PDFs the system reads each page and concatenates the text, while for images the document service simply captures the file path. The extracted text goes to the text provider for classification and data extraction. Based on the classification result, the service generates a simplified Data Module Code (DMC) following S1000D conventions. Before processing begins, the user selects an operational structure—Water, Air, Land, or Other—that defines the default functional or physical breakdown for code generation. The document service merges these defaults with the AI classification to autonomously create a fully compliant DMC. A verbatim data module is created with the raw text, and if rewriting succeeds, an STE data module is produced as well. Each module references the source document and is saved to the database with an initial red validation state.

Images are handled similarly. When a PDF contains embedded images or when an image file is uploaded directly, the document service processes each image with the vision provider. Captions, detected objects, and hotspot suggestions are stored in the ICN collection alongside the image dimensions and security classification. These ICNs can then be linked within data modules to illustrate procedures or component references. Because the AI providers operate asynchronously, large documents may take several seconds to process. During this time the processing status of the document and modules updates in the database, allowing the UI to display a progress indicator.

Once a document has been processed, authors can edit the generated modules directly in the web interface. They may add metadata, fix classification errors, or rewrite text that the AI misunderstood. When satisfied, they run validation via the backend endpoint, which performs basic checks for required fields and minimum STE score. If all checks pass the module status turns green. Multiple modules can then be organized into a publication module. The drag-and-drop builder lets authors arrange chapters, sections, and subtopics in a tree view. When it comes time to deliver the manual, the publish action exports all modules and assets into the selected formats. In a full implementation this would bundle XML, HTML, and PDF representations along with an index and any required style sheets.

## Data Modules Explained
At the heart of S1000D is the concept of the data module, a self-contained unit of information identified by a Data Module Code. Aquila’s `DataModule` model captures the essential parts of this specification: a DMC string, a descriptive title, the module type, an information variant, and the main content body. In addition it tracks references to other modules and illustrations, validation status, and processing logs. The module type might be a maintenance procedure, descriptive chapter, or troubleshooting guide. The information variant indicates whether the text is verbatim from the original document or has been rewritten into STE.

Because AI processing is not perfect, the model stores a list of validation errors and a numeric STE score. The document service assigns initial values during processing, and the validation endpoint updates them when the user requests a check. Each time a module is modified the updated timestamp ensures that changes are easily tracked. The user interface provides both a formatted view and a raw XML editor for each data module. This allows authors to work in whichever mode they prefer, either dragging components with the mouse or editing the structured markup directly.

## Illustration Control Numbers (ICNs)
Illustrations play a critical role in technical manuals. In this repository an `ICN` model stores information about each image, including width and height, caption text, object labels, and optional hotspot coordinates for interactive content. When an image is uploaded, the system generates a unique ICN identifier with an “ICN-” prefix. If the vision provider is configured it will analyze the image and return a suggested caption and list of detected objects. The hotspot generation routine produces bounding boxes or polygon coordinates that can later be transformed into clickable regions in an HTML document. The frontend includes an illustration manager where authors can adjust captions, add or remove hotspots, and view security classifications. The backend can serve the original image file through an endpoint so that the UI can display it directly without additional hosting.

## Publication Modules
Publication modules bring everything together by grouping data modules into structured manuals. The `PublicationModule` model references a list of DMCs and stores a tree structure representing chapters and sections. When authors use the drag-and-drop interface to organize modules, this structure is updated in real time via REST calls. Metadata such as a title and cover information can also be stored. When the author clicks the “Publish” button, the backend currently returns a success message with the requested formats (e.g., XML or PDF) and variants (verbatim or STE). A production version might call an external publishing engine to generate the final package. Because the system is modular, new export formats can be added by implementing additional tasks in the backend service and exposing them through the publish endpoint. The ability to export multiple variants ensures compliance with organizations that require both the original and simplified versions of each module.

## Installation & Setup
To run Aquila locally you will need Python 3.11+, Node.js 18+, and MongoDB. Clone the repository and install the Python dependencies:

```bash
pip install -r backend/requirements.txt
```

Next, install the JavaScript packages:

```bash
cd frontend
yarn install
cd ..
```

Copy the sample environment file and supply your own API keys:

```bash
cp backend/.env.example backend/.env
# Edit `backend/.env` and provide values for `OPENAI_API_KEY`,
# `ANTHROPIC_API_KEY`, `STRIPE_API_KEY` (optional) and any database
# settings like `MONGO_URL`. Set `TEXT_MODEL` and
# `VISION_MODEL` to choose the default models. The recommended values are
# `Goekdeniz-Guelmez/Josiefied-Qwen3-30B-A3B-abliterated-v2` for `TEXT_MODEL`
# and `Qwen/Qwen-VL-Chat` for `VISION_MODEL`. These models will be downloaded
# automatically from Hugging Face on first use.
# Set `SECRET_KEY` to a random string for signing authentication tokens and
# optionally adjust `ACCESS_TOKEN_EXPIRE_MINUTES`.
# Set `ALLOWED_ORIGINS` to a comma-separated list of allowed origins for CORS.
```
The `.env` file now also supports `TEXT_MODEL` and `VISION_MODEL` variables to specify the local model paths.

Finally, start the backend and frontend servers in separate terminals:

```bash
uvicorn backend.server:app --reload
cd frontend
yarn start
```

The React application will open at `http://localhost:3000` and connect to the FastAPI backend on port `8001`. If you do not have AI provider keys you can switch to the “local” provider in the settings modal to test the user interface without real AI calls.

### Authentication
Most API routes now require a valid access token. Register a user and obtain a token using the authentication endpoints:

```bash
curl -X POST -F "username=test" -F "password=secret" http://localhost:8001/auth/register
curl -X POST -F "username=test" -F "password=secret" http://localhost:8001/auth/token
```

Include the returned token in the `Authorization` header when calling `/api` routes:

```bash
curl -H "Authorization: Bearer <token>" http://localhost:8001/api/settings
```

## Usage Overview
Once the servers are running you can upload a document through the toolbar. The sidebar will list the uploaded file, at which point you can select it and click “Process.” The backend will extract text, analyze it with the configured provider, and generate new data modules. These modules show up in the sidebar and can be opened in the workspace. Use the data module viewer to inspect the generated content and run validation. The XML editor provides full markup access if you need to fix tags or add attributes. When you have multiple modules prepared, create a publication module from the sidebar and arrange the modules in a hierarchy. Clicking the publish button allows you to choose variants and output formats, after which a package is generated. Because this is a prototype the publishing action simply returns a success message, but the scaffolding is in place for connecting a more sophisticated export tool.

## Testing & Quality Assurance
The repository includes an automated test suite covering the backend API. Tests
reside in `backend_test.py` and use the pytest framework. Install dependencies (including `requests`) with:

```bash
pip install -r backend/requirements.txt
```

After installing, run the backend tests:

```bash
pytest -q
```

The frontend also provides a minimal set of React tests. Install deps and run them with:

```bash
cd frontend && yarn install
yarn test
```

A log of past test results is stored in `test_result.md`, which tracks working status for each major component.

## Security Considerations
Aquila now includes a basic token-based authentication layer but it should not be considered production ready. User accounts are stored in MongoDB and access tokens are signed with the `SECRET_KEY` from `.env`. Most endpoints under `/api` require a valid token. For hardened deployments you should implement additional access controls and auditing. Because the system interacts with external AI providers you should also be mindful of data privacy and API usage limits. Ensure that no sensitive data is sent to third-party services without proper consent. The local provider option exists specifically for environments where uploading data to the cloud is not permitted and now leverages Hugging Face models that run entirely on your own hardware.

## Future Plans
While Aquila demonstrates a full S1000D pipeline at a conceptual level, many features could be expanded. Improved text extraction using OCR would allow processing of scanned PDFs. Integration with a real STE checker would make the rewriting feature more reliable. The publication pipeline could connect to a layout engine to produce print-ready PDF manuals. Additionally, better user management, role-based access control, and audit logging would be required for enterprise adoption. The modular design of the provider system means other AI vendors could be added with relative ease, and there is room to integrate domain-specific models for tasks like fault isolation or predictive maintenance. Contributions and suggestions are welcome, and the repository intends to serve as a living reference for researchers exploring AI-assisted documentation.

## Contributing
If you wish to contribute to this project, please fork the repository and open a pull request. Ensure that any new Python code passes the existing tests and that you add tests for new features where practical. For front-end contributions, follow the coding style already present in the project and test your changes in multiple browsers. Update the `test_result.md` file with notes on what you added and which components require retesting. Because the system is still evolving, documentation changes are also valuable: clarifying setup instructions or expanding architectural diagrams helps others get started faster. Feel free to open issues if you encounter problems or have ideas for new functionality. All contributions are released under the same open-source license as the rest of the project.

## Contact and Acknowledgments
Aquila S1000D-AI was created as a research initiative to explore AI-assisted technical publishing. We thank the open-source community for the libraries that made this prototype possible, including FastAPI, Pydantic, React, Tailwind CSS, PDF.js, and the numerous test frameworks. If you have questions about the project or wish to collaborate, please open an issue on the GitHub repository. We welcome feedback from technical writers, software developers, and AI researchers alike. Together we can push the boundaries of what’s possible in the world of automated documentation.

## Repository Layout

- `backend/` – FastAPI application and service code
- `frontend/` – React web interface
- `backend_test.py` – comprehensive API test suite
- `test_result.md` – shared testing log

## Status

This repository represents a working prototype with most functionality implemented. See `test_result.md` for detailed testing notes and current status.

