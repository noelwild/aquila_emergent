import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAquila } from '../contexts/AquilaContext';
import {
  Upload,
  Trash2,
  Lock,
  Settings,
  Image,
  Grid,
  FileText,
  Cpu,
  Download,
  Send,
  FolderPlus,
  Play
} from 'lucide-react';
import ProjectModal from './ProjectModal';

const Toolbar = () => {
  const navigate = useNavigate();
  const {
    uploadDocument,
    deleteDataModule,
    exportDataModule,
    currentDataModule,
    locked,
    setLocked,
    documents,
    processDocument,
    brexReady,
    projectName,
    createProject,
    selectProject,
    getProjectList
  } = useAquila();
  const [processing, setProcessing] = useState(false);
  const [globalLEDStatus, setGlobalLEDStatus] = useState('green');
  const [showAIProviderModal, setShowAIProviderModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);

  const handleUpload = async (event) => {
    const files = Array.from(event.target.files);
    for (const file of files) {
      await uploadDocument(file);
      alert(`${file.name} uploaded successfully`);
    }
    event.target.value = '';
  };

  const handleDelete = async () => {
    if (!currentDataModule) return;
    setProcessing(true);
    try {
      await deleteDataModule(currentDataModule.dmc);
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleLock = () => {
    setLocked(!locked);
  };

  const handleDownload = async () => {
    if (!currentDataModule) return;
    setProcessing(true);
    try {
      await exportDataModule(currentDataModule.dmc, 'xml');
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleStartProcessing = async () => {
    setProcessing(true);
    try {
      for (const doc of documents) {
        await processDocument(doc.id);
      }
    } catch (error) {
      console.error('Processing failed:', error);
    } finally {
      setProcessing(false);
    }
  };

  const getLEDClassName = (status) => {
    switch (status) {
      case 'green': return 'aquila-led-green';
      case 'amber': return 'aquila-led-amber';
      case 'red': return 'aquila-led-red';
      case 'blue': return 'aquila-led-blue';
      default: return 'aquila-led-green';
    }
  };

  return (
    <>
    <div className="aquila-toolbar">
      <div className="flex items-center gap-4">
        {/* Logo/Brand */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-aquila-cyan rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <span className="text-xl font-bold text-aquila-cyan">Aquila S1000D-AI</span>
          <span className="text-sm text-aquila-text-muted ml-2">{projectName}</span>
        </div>

        {/* Main Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowProjectModal(true)}
            className="aquila-button-secondary"
          >
            <FolderPlus size={16} />
            <span>Project</span>
          </button>

          <label className="aquila-button cursor-pointer">
            <Upload size={16} />
            <span>Upload</span>
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.pptx,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.bmp,.tiff"
              onChange={handleUpload}
              className="hidden"
            />
          </label>

          <button 
            onClick={handleDelete}
            className="aquila-button-secondary"
            disabled={processing}
          >
            <Trash2 size={16} />
            <span>Delete</span>
          </button>

          <button 
            onClick={handleLock}
            className="aquila-button-secondary"
            disabled={processing}
          >
            <Lock size={16} />
            <span>Lock</span>
          </button>
        </div>

        {/* Navigation Actions */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/applicability')}
            className="aquila-button-secondary"
          >
            <Grid size={16} />
            <span>Applicability</span>
          </button>

          <button 
            onClick={() => navigate('/illustrations')}
            className="aquila-button-secondary"
          >
            <Image size={16} />
            <span>Illustrations</span>
          </button>

          <button 
            onClick={() => navigate('/brex')}
            className="aquila-button-secondary"
          >
            <Settings size={16} />
            <span>BREX Designer</span>
          </button>

          <button 
            onClick={() => navigate('/pm-builder')}
            className="aquila-button-secondary"
          >
            <FileText size={16} />
            <span>PM Builder</span>
          </button>
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleStartProcessing}
          className="aquila-button"
          disabled={processing || !brexReady || documents.length === 0}
        >
          <Play size={16} />
          <span>Start</span>
        </button>

        <button
          onClick={() => setShowAIProviderModal(true)}
          className="aquila-button-secondary"
        >
          <Cpu size={16} />
          <span>AI Providers</span>
        </button>

        <button 
          onClick={() => setShowPublishModal(true)}
          className="aquila-button"
          disabled={processing}
        >
          <Send size={16} />
          <span>Publish</span>
        </button>

        <button 
          onClick={handleDownload}
          className="aquila-button-secondary"
          disabled={processing}
        >
          <Download size={16} />
          <span>Download</span>
        </button>

        {/* LED Status Indicator */}
        <div className="flex items-center gap-2">
          <div className={`aquila-led ${getLEDClassName(globalLEDStatus)} ${processing ? 'animate-pulse' : ''}`}></div>
          <span className="text-sm text-aquila-text-muted">
            {processing ? 'Processing...' : 'Ready'}
          </span>
        </div>
      </div>
    </div>
    {showProjectModal && (
      <ProjectModal onClose={() => setShowProjectModal(false)} />
    )}
    </>
  );
};

export default Toolbar;