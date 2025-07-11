import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Components
import Toolbar from './components/Toolbar';
import Sidebar from './components/Sidebar';
import MainWorkspace from './components/MainWorkspace';
import IllustrationManager from './components/IllustrationManager';
import ApplicabilityMatrix from './components/ApplicabilityMatrix';
import BREXDesigner from './components/BREXDesigner';
import PMBuilder from './components/PMBuilder';
import AIProviderModal from './components/AIProviderModal';
import PublishModal from './components/PublishModal';
import AquilaContext from './contexts/AquilaContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  return (
    <BrowserRouter>
      <AquilaProvider>
        <div className="App bg-aquila-bg text-aquila-text min-h-screen">
          <Routes>
            <Route path="/" element={<MainApp />} />
            <Route path="/illustrations" element={<IllustrationManagerPage />} />
            <Route path="/applicability" element={<ApplicabilityMatrixPage />} />
            <Route path="/brex" element={<BREXDesignerPage />} />
            <Route path="/pm-builder" element={<PMBuilderPage />} />
          </Routes>
        </div>
      </AquilaProvider>
    </BrowserRouter>
  );
}

// Main application component
function MainApp() {
  const [showAIProviderModal, setShowAIProviderModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [globalLEDStatus, setGlobalLEDStatus] = useState('green');

  return (
    <div className="flex flex-col h-screen">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <MainWorkspace />
      </div>
      
      {/* Modals */}
      {showAIProviderModal && (
        <AIProviderModal onClose={() => setShowAIProviderModal(false)} />
      )}
      
      {showPublishModal && (
        <PublishModal onClose={() => setShowPublishModal(false)} />
      )}
    </div>
  );
}

// Separate page components
function IllustrationManagerPage() {
  return (
    <div className="flex flex-col h-screen">
      <Toolbar />
      <div className="flex-1 p-4">
        <IllustrationManager />
      </div>
    </div>
  );
}

function ApplicabilityMatrixPage() {
  return (
    <div className="flex flex-col h-screen">
      <Toolbar />
      <div className="flex-1 p-4">
        <ApplicabilityMatrix />
      </div>
    </div>
  );
}

function BREXDesignerPage() {
  return (
    <div className="flex flex-col h-screen">
      <Toolbar />
      <div className="flex-1 p-4">
        <BREXDesigner />
      </div>
    </div>
  );
}

function PMBuilderPage() {
  return (
    <div className="flex flex-col h-screen">
      <Toolbar />
      <div className="flex-1 p-4">
        <PMBuilder />
      </div>
    </div>
  );
}

// Context Provider Component
function AquilaProvider({ children }) {
  const [currentDocument, setCurrentDocument] = useState(null);
  const [currentDataModule, setCurrentDataModule] = useState(null);
  const [dataModules, setDataModules] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [icns, setIcns] = useState([]);
  const [globalLEDStatus, setGlobalLEDStatus] = useState('green');
  const [showAIProviderModal, setShowAIProviderModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [aiProviders, setAIProviders] = useState({
    text: 'openai',
    vision: 'openai',
    textModel: 'gpt-4o-mini',
    visionModel: 'gpt-4o-mini'
  });

  // Load initial data
  useEffect(() => {
    loadDataModules();
    loadDocuments();
    loadICNs();
    loadAIProviders();
  }, []);

  const loadDataModules = async () => {
    try {
      const response = await axios.get(`${API}/data-modules`);
      setDataModules(response.data);
      calculateGlobalLEDStatus(response.data);
    } catch (error) {
      console.error('Error loading data modules:', error);
    }
  };

  const loadDocuments = async () => {
    try {
      const response = await axios.get(`${API}/documents`);
      setDocuments(response.data);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const loadICNs = async () => {
    try {
      const response = await axios.get(`${API}/icns`);
      setIcns(response.data);
    } catch (error) {
      console.error('Error loading ICNs:', error);
    }
  };

  const loadAIProviders = async () => {
    try {
      const response = await axios.get(`${API}/providers`);
      setAIProviders(response.data.current);
    } catch (error) {
      console.error('Error loading AI providers:', error);
    }
  };

  const calculateGlobalLEDStatus = (modules) => {
    const statusCounts = modules.reduce((acc, module) => {
      acc[module.validation_status] = (acc[module.validation_status] || 0) + 1;
      return acc;
    }, {});

    if (statusCounts.red > 0) {
      setGlobalLEDStatus('red');
    } else if (statusCounts.amber > 0) {
      setGlobalLEDStatus('amber');
    } else if (statusCounts.blue > 0) {
      setGlobalLEDStatus('blue');
    } else {
      setGlobalLEDStatus('green');
    }
  };

  const uploadDocument = async (file) => {
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(`${API}/documents/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      await loadDocuments();
      return response.data;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    } finally {
      setProcessing(false);
    }
  };

  const processDocument = async (documentId) => {
    setProcessing(true);
    try {
      const response = await axios.post(`${API}/documents/${documentId}/process`);
      await loadDataModules();
      await loadICNs();
      return response.data;
    } catch (error) {
      console.error('Error processing document:', error);
      throw error;
    } finally {
      setProcessing(false);
    }
  };

  const updateDataModule = async (dmc, updates) => {
    try {
      await axios.put(`${API}/data-modules/${dmc}`, updates);
      await loadDataModules();
    } catch (error) {
      console.error('Error updating data module:', error);
      throw error;
    }
  };

  const updateAIProviders = async (textProvider, visionProvider, textModel, visionModel) => {
    try {
      await axios.post(`${API}/providers/set`, null, {
        params: { text_provider: textProvider, vision_provider: visionProvider, text_model: textModel, vision_model: visionModel }
      });
      setAIProviders({ text: textProvider, vision: visionProvider, textModel, visionModel });
    } catch (error) {
      console.error('Error updating AI providers:', error);
      throw error;
    }
  };

  const contextValue = {
    // State
    currentDocument,
    currentDataModule,
    dataModules,
    documents,
    icns,
    globalLEDStatus,
    showAIProviderModal,
    showPublishModal,
    processing,
    aiProviders,
    
    // Actions
    setCurrentDocument,
    setCurrentDataModule,
    setShowAIProviderModal,
    setShowPublishModal,
    uploadDocument,
    processDocument,
    updateDataModule,
    updateAIProviders,
    loadDataModules,
    loadDocuments,
    loadICNs
  };

  return (
    <AquilaContext.Provider value={contextValue}>
      {children}
    </AquilaContext.Provider>
  );
}

export default App;