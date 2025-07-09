import React from 'react';
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
  Publish
} from 'lucide-react';

const Toolbar = () => {
  const navigate = useNavigate();
  const { 
    globalLEDStatus, 
    processing, 
    setShowAIProviderModal, 
    setShowPublishModal,
    uploadDocument,
    processDocument,
    documents 
  } = useAquila();

  const handleUpload = async (event) => {
    const files = Array.from(event.target.files);
    for (const file of files) {
      try {
        const result = await uploadDocument(file);
        console.log('Document uploaded:', result);
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }
    event.target.value = ''; // Reset file input
  };

  const handleDelete = () => {
    // Implement delete functionality
    console.log('Delete clicked');
  };

  const handleLock = () => {
    // Implement lock functionality
    console.log('Lock clicked');
  };

  const handleDownload = () => {
    // Implement download functionality
    console.log('Download clicked');
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
    <div className="aquila-toolbar">
      <div className="flex items-center gap-4">
        {/* Logo/Brand */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-aquila-cyan rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <span className="text-xl font-bold text-aquila-cyan">Aquila S1000D-AI</span>
        </div>

        {/* Main Actions */}
        <div className="flex items-center gap-2">
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
          <Publish size={16} />
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
  );
};

export default Toolbar;