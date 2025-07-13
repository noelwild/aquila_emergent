import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { api } from './lib/api';
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
import Login from './components/Login';
import AquilaContext from './contexts/AquilaContext';


function App() {
  const token = localStorage.getItem('aquila.jwt');
  if (!token) {
    return <Login />;
  }
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
  const [settings, setSettings] = useState(null);
  const [brexReady, setBrexReady] = useState(false);
  const [projectName, setProjectName] = useState(
    localStorage.getItem('aquila.project') || 'Default'
  );
  const [aiProviders, setAIProviders] = useState({
    text: 'openai',
    vision: 'openai',
    textModel: 'gpt-4o-mini',
    visionModel: 'gpt-4o-mini'
  });
  const [locked, setLocked] = useState(false);

  // Load initial data
  useEffect(() => {
    loadDataModules();
    loadDocuments();
    loadICNs();
    loadAIProviders();
    loadSettings();
  }, []);

  const loadDataModules = async () => {
    try {
      const response = await api.get(`/api/data-modules`);
      setDataModules(response.data);
      calculateGlobalLEDStatus(response.data);
    } catch (error) {
      console.error('Error loading data modules:', error);
    }
  };

  const loadDocuments = async () => {
    try {
      const response = await api.get(`/api/documents`);
      setDocuments(response.data);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const loadICNs = async () => {
    try {
      const response = await api.get(`/api/icns`);
      setIcns(response.data);
    } catch (error) {
      console.error('Error loading ICNs:', error);
    }
  };

  const loadAIProviders = async () => {
    try {
      const response = await api.get(`/api/providers`);
      setAIProviders(response.data.current);
    } catch (error) {
      console.error('Error loading AI providers:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const { data } = await api.get('/api/settings');
      setSettings(data);
      const ready = data.brex_rules && Object.keys(data.brex_rules).length > 0;
      setBrexReady(ready);
    } catch (error) {
      console.error('Error loading settings:', error);
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
      
      const response = await api.post(`/api/documents/upload`, formData, {
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
      const response = await api.post(`/api/documents/${documentId}/process`);
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
      await api.put(`/api/data-modules/${dmc}`, updates);
      await loadDataModules();
    } catch (error) {
      console.error('Error updating data module:', error);
      throw error;
    }
  };

  const updateAIProviders = async (textProvider, visionProvider, textModel, visionModel) => {
    try {
      await api.post(`/api/providers/set`, null, {
        params: { text_provider: textProvider, vision_provider: visionProvider, text_model: textModel, vision_model: visionModel }
      });
      setAIProviders({ text: textProvider, vision: visionProvider, textModel, visionModel });
    } catch (error) {
      console.error('Error updating AI providers:', error);
      throw error;
    }
  };

  const deleteDataModule = async (dmc) => {
    try {
      await api.delete(`/api/data-modules/${dmc}`);
      if (currentDataModule?.dmc === dmc) {
        setCurrentDataModule(null);
      }
      await loadDataModules();
    } catch (error) {
      console.error('Error deleting data module:', error);
      throw error;
    }
  };

  const exportDataModule = async (dmc, format = 'xml') => {
    try {
      const response = await api.get(`/api/data-modules/${dmc}/export`, { params: { format }, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${dmc}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data module:', error);
      throw error;
    }
  };

  const createProject = (name) => {
    setProjectName(name);
    localStorage.setItem('aquila.project', name);
    const list = JSON.parse(localStorage.getItem('aquila.projects') || '[]');
    if (!list.includes(name)) {
      list.push(name);
      localStorage.setItem('aquila.projects', JSON.stringify(list));
    }
    // Clear current data when starting a new project
    setDataModules([]);
    setDocuments([]);
    setIcns([]);
    setBrexReady(false);
    loadSettings();
  };

  const selectProject = (name) => {
    setProjectName(name);
    localStorage.setItem('aquila.project', name);
    setDataModules([]);
    setDocuments([]);
    setIcns([]);
    loadSettings();
    loadDataModules();
    loadDocuments();
    loadICNs();
  };

  const getProjectList = () => {
    return JSON.parse(localStorage.getItem('aquila.projects') || '[]');
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
    locked,
    projectName,
    settings,
    brexReady,

    // Actions
    setCurrentDocument,
    setCurrentDataModule,
    setShowAIProviderModal,
    setShowPublishModal,
    setLocked,
    uploadDocument,
    processDocument,
    updateDataModule,
    updateAIProviders,
    deleteDataModule,
    exportDataModule,
    loadDataModules,
    loadDocuments,
    loadICNs,
    loadSettings,
    createProject,
    selectProject,
    getProjectList
  };

  return (
    <AquilaContext.Provider value={contextValue}>
      {children}
    </AquilaContext.Provider>
  );
}

export default App;
