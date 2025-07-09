import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  Settings, 
  Image,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

const Sidebar = () => {
  const [expandedSections, setExpandedSections] = useState({
    dataModules: true,
    documents: false,
    icns: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Sample data for demonstration
  const sampleDataModules = [
    { dmc: 'DMC-AQUILA-00-000-00-00-00-00-000-A-A-00-00-00-00', title: 'Sample Procedure', dm_type: 'PROC', validation_status: 'green', info_variant: '00' },
    { dmc: 'DMC-AQUILA-00-000-00-00-00-00-000-A-A-00-00-01-01', title: 'Sample Description', dm_type: 'DESC', validation_status: 'amber', info_variant: '01' }
  ];

  const sampleDocuments = [
    { id: '1', filename: 'maintenance_manual.pdf', file_size: 2048000, processing_status: 'completed' },
    { id: '2', filename: 'technical_drawing.jpg', file_size: 1024000, processing_status: 'pending' }
  ];

  const sampleICNs = [
    { icn_id: 'ICN-001', filename: 'diagram_001.jpg', width: 800, height: 600 },
    { icn_id: 'ICN-002', filename: 'schematic_002.png', width: 1200, height: 900 }
  ];

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
    <div className="aquila-sidebar flex flex-col h-full">
      {/* Header */}
      <div className="aquila-panel-header">
        <h2 className="text-lg font-semibold">Project Explorer</h2>
        <div className="flex items-center gap-2 text-sm text-aquila-text-muted">
          <ArrowUp size={12} />
          <ArrowDown size={12} />
          <span>Alt+←/→</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* Data Modules Section */}
        <div className="p-2">
          <button
            onClick={() => toggleSection('dataModules')}
            className="aquila-tree-item w-full justify-between text-left"
          >
            <div className="flex items-center gap-2">
              {expandedSections.dataModules ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <FileText size={16} />
              <span className="font-medium">Data Modules ({sampleDataModules.length})</span>
            </div>
          </button>

          {expandedSections.dataModules && (
            <div className="ml-6 mt-2 space-y-1">
              {sampleDataModules.map((dm, index) => (
                <div
                  key={dm.dmc}
                  className="aquila-tree-item cursor-pointer"
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Documents Section */}
        <div className="p-2">
          <button
            onClick={() => toggleSection('documents')}
            className="aquila-tree-item w-full justify-between text-left"
          >
            <div className="flex items-center gap-2">
              {expandedSections.documents ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <FileText size={16} />
              <span className="font-medium">Documents ({sampleDocuments.length})</span>
            </div>
          </button>

          {expandedSections.documents && (
            <div className="ml-6 mt-2 space-y-1">
              {sampleDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="aquila-tree-item cursor-pointer"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <FileText size={16} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{doc.filename}</div>
                      <div className="text-xs text-aquila-text-muted">
                        {(doc.file_size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    <div className="text-xs text-aquila-text-muted">
                      {doc.processing_status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ICNs Section */}
        <div className="p-2">
          <button
            onClick={() => toggleSection('icns')}
            className="aquila-tree-item w-full justify-between text-left"
          >
            <div className="flex items-center gap-2">
              {expandedSections.icns ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <Image size={16} />
              <span className="font-medium">ICNs ({sampleICNs.length})</span>
            </div>
          </button>

          {expandedSections.icns && (
            <div className="ml-6 mt-2 space-y-1">
              {sampleICNs.map((icn) => (
                <div
                  key={icn.icn_id}
                  className="aquila-tree-item cursor-pointer"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <Image size={16} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{icn.icn_id}</div>
                      <div className="text-xs text-aquila-text-muted truncate">{icn.filename}</div>
                    </div>
                    <div className="text-xs text-aquila-text-muted">
                      {icn.width}×{icn.height}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="aquila-status-bar">
        <div className="flex items-center gap-2">
          <span className="text-xs">Total: {sampleDataModules.length} DMs</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs">v1.0.0</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;