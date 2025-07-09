import React, { useState, useEffect } from 'react';
import { useAquila } from '../contexts/AquilaContext';
import DocumentViewer from './DocumentViewer';
import DataModuleViewer from './DataModuleViewer';
import XMLEditor from './XMLEditor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/Tabs';

const MainWorkspace = () => {
  const { 
    currentDocument, 
    currentDataModule, 
    documents 
  } = useAquila();
  
  const [activeTab, setActiveTab] = useState('viewer');

  // Get the source document for current data module
  const getSourceDocument = () => {
    if (!currentDataModule) return null;
    return documents.find(doc => doc.id === currentDataModule.source_document_id);
  };

  const sourceDocument = getSourceDocument();

  return (
    <div className="flex-1 flex flex-col">
      {/* Main Grid - 3x2 layout */}
      <div className="aquila-main-grid">
        {/* Top Row */}
        <div className="aquila-panel">
          <div className="aquila-panel-header">
            <h3 className="text-sm font-medium">Original Document</h3>
            {sourceDocument && (
              <span className="text-xs text-aquila-text-muted">{sourceDocument.filename}</span>
            )}
          </div>
          <div className="aquila-panel-content">
            <DocumentViewer document={sourceDocument} />
          </div>
        </div>

        <div className="aquila-panel">
          <div className="aquila-panel-header">
            <h3 className="text-sm font-medium">Verbatim DM</h3>
            {currentDataModule && currentDataModule.info_variant === '00' && (
              <span className="text-xs text-aquila-text-muted">{currentDataModule.dmc}</span>
            )}
          </div>
          <div className="aquila-panel-content">
            <DataModuleViewer 
              dataModule={currentDataModule?.info_variant === '00' ? currentDataModule : null}
              variant="verbatim"
            />
          </div>
        </div>

        <div className="aquila-panel">
          <div className="aquila-panel-header">
            <h3 className="text-sm font-medium">STE DM</h3>
            {currentDataModule && currentDataModule.info_variant === '01' && (
              <span className="text-xs text-aquila-text-muted">{currentDataModule.dmc}</span>
            )}
          </div>
          <div className="aquila-panel-content">
            <DataModuleViewer 
              dataModule={currentDataModule?.info_variant === '01' ? currentDataModule : null}
              variant="ste"
            />
          </div>
        </div>

        {/* Bottom Row - XML Editors */}
        <div className="aquila-panel">
          <div className="aquila-panel-header">
            <h3 className="text-sm font-medium">XML Editor - Verbatim</h3>
            <div className="flex items-center gap-2">
              <button className="aquila-button-secondary text-xs px-2 py-1">
                Validate
              </button>
              <button className="aquila-button-secondary text-xs px-2 py-1">
                Format
              </button>
            </div>
          </div>
          <div className="aquila-panel-content">
            <XMLEditor 
              content={currentDataModule?.xml_content || ''}
              language="xml"
              readOnly={false}
            />
          </div>
        </div>

        <div className="aquila-panel">
          <div className="aquila-panel-header">
            <h3 className="text-sm font-medium">XML Editor - STE</h3>
            <div className="flex items-center gap-2">
              <button className="aquila-button-secondary text-xs px-2 py-1">
                Validate
              </button>
              <button className="aquila-button-secondary text-xs px-2 py-1">
                Format
              </button>
            </div>
          </div>
          <div className="aquila-panel-content">
            <XMLEditor 
              content={currentDataModule?.xml_content || ''}
              language="xml"
              readOnly={false}
            />
          </div>
        </div>

        <div className="aquila-panel">
          <div className="aquila-panel-header">
            <h3 className="text-sm font-medium">Data Module List</h3>
            <div className="flex items-center gap-2">
              <button className="aquila-button-secondary text-xs px-2 py-1">
                Refresh
              </button>
              <button className="aquila-button-secondary text-xs px-2 py-1">
                Filter
              </button>
            </div>
          </div>
          <div className="aquila-panel-content">
            <DataModuleList />
          </div>
        </div>
      </div>
    </div>
  );
};

// Data Module List Component
const DataModuleList = () => {
  const { dataModules, currentDataModule, setCurrentDataModule } = useAquila();

  const getLEDClassName = (status) => {
    switch (status) {
      case 'green': return 'aquila-led-green';
      case 'amber': return 'aquila-led-amber';
      case 'red': return 'aquila-led-red';
      case 'blue': return 'aquila-led-blue';
      default: return 'aquila-led-green';
    }
  };

  const getDMTypeIcon = (dmType) => {
    switch (dmType) {
      case 'PROC': return '📋';
      case 'DESC': return '📄';
      case 'IPD': return '🔧';
      case 'CIR': return '⚡';
      case 'SNS': return '📢';
      case 'WIR': return '🔌';
      case 'GEN': return '📝';
      default: return '📄';
    }
  };

  return (
    <div className="space-y-1">
      {dataModules.map((dm) => (
        <div
          key={dm.dmc}
          className={`aquila-tree-item cursor-pointer ${
            currentDataModule?.dmc === dm.dmc ? 'selected' : ''
          }`}
          onClick={() => setCurrentDataModule(dm)}
        >
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm">{getDMTypeIcon(dm.dm_type)}</span>
            <div className={`aquila-led ${getLEDClassName(dm.validation_status)}`}></div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{dm.title}</div>
              <div className="text-xs text-aquila-text-muted truncate">{dm.dmc}</div>
            </div>
            <div className="flex items-center gap-1">
              {dm.info_variant === "01" && (
                <span className="aquila-chip text-xs">STE</span>
              )}
              {dm.info_variant === "00" && (
                <span className="aquila-chip text-xs">V</span>
              )}
              {dm.ste_score && (
                <span className="text-xs text-aquila-text-muted">
                  {(dm.ste_score * 100).toFixed(0)}%
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MainWorkspace;