import React, { useState, useEffect } from 'react';
import { useAquila } from '../contexts/AquilaContext';
import { FileText, AlertCircle, CheckCircle, Clock, Settings } from 'lucide-react';

const DataModuleViewer = ({ dataModule, variant }) => {
  const { updateDataModule, locked } = useAquila();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [correctionSelections, setCorrectionSelections] = useState({});

  useEffect(() => {
    if (dataModule) {
      setEditedContent(dataModule.content || '');
    }
  }, [dataModule]);

  if (!dataModule) {
    return (
      <div className="flex items-center justify-center h-full text-aquila-text-muted">
        <div className="text-center">
          <FileText size={48} className="mx-auto mb-4 opacity-50" />
          <p>No data module selected</p>
          <p className="text-sm">
            Select a data module to view its {variant} content
          </p>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    try {
      await updateDataModule(dataModule.dmc, {
        content: editedContent,
        html_content: generateHTML(editedContent)
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving data module:', error);
    }
  };

  const generateHTML = (content) => {
    // Simple HTML generation - in real implementation, this would be more sophisticated
    return `
      <div class="dm-content">
        <h1>${dataModule.title}</h1>
        <div class="dm-body">
          ${content.split('\n').map(paragraph => 
            paragraph.trim() ? `<p>${paragraph}</p>` : ''
          ).join('')}
        </div>
      </div>
    `;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'green':
        return <CheckCircle size={16} className="text-aquila-led-green" />;
      case 'amber':
        return <AlertCircle size={16} className="text-aquila-led-amber" />;
      case 'red':
        return <AlertCircle size={16} className="text-aquila-led-red" />;
      case 'blue':
        return <Clock size={16} className="text-aquila-led-blue" />;
      default:
        return <CheckCircle size={16} className="text-aquila-led-green" />;
    }
  };

  const handleSelectionChange = (index, method) => {
    setCorrectionSelections((prev) => ({ ...prev, [index]: method }));
  };

  const applyCorrections = async () => {
    const methods = new Set(Object.values(correctionSelections));
    for (const method of methods) {
      try {
        await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/fix-module/${dataModule.dmc}?method=${method}`, {
          method: 'POST'
        });
      } catch (e) {
        console.error('Error applying corrections:', e);
      }
    }
    setCorrectionSelections({});
    await updateDataModule(dataModule.dmc, {});
    alert('Corrections applied');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-2 bg-aquila-hover border-b border-aquila-border">
        <div className="flex items-center gap-2">
          {getStatusIcon(dataModule.validation_status)}
          <span className="text-sm font-medium">{dataModule.title}</span>
          <span className="text-xs text-aquila-text-muted">{dataModule.dmc}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {variant === 'ste' && dataModule.ste_score && (
            <span className="text-xs text-aquila-text-muted">
              STE: {(dataModule.ste_score * 100).toFixed(0)}%
            </span>
          )}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="aquila-button-secondary text-xs px-2 py-1"
            disabled={locked}
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
          {isEditing && (
            <button
              onClick={handleSave}
              className="aquila-button text-xs px-2 py-1"
              disabled={locked}
            >
              Save
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {isEditing ? (
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full h-full bg-aquila-bg border border-aquila-border rounded p-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-aquila-cyan"
            placeholder="Enter data module content..."
            disabled={locked}
          />
        ) : (
          <div className="space-y-4">
            {/* HTML Content */}
            <div 
              className="prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ 
                __html: dataModule.html_content || generateHTML(dataModule.content || '')
              }}
            />
            
            {/* Validation Errors */}
            {dataModule.validation_errors && dataModule.validation_errors.length > 0 && (
              <div className="bg-red-900/20 border border-red-500/50 rounded p-3">
                <h4 className="text-sm font-medium text-red-400 mb-2">Validation Errors:</h4>
                <ul className="text-sm text-red-300 space-y-1">
                  {dataModule.validation_errors.map((error, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="grow">• {error}</span>
                      <div className="flex gap-2">
                        <label className="flex items-center gap-1 text-xs">
                          <input
                            type="radio"
                            name={`select-${index}`}
                            value="manual"
                            checked={correctionSelections[index] === 'manual'}
                            onChange={() => handleSelectionChange(index, 'manual')}
                          />
                          <span>Fix</span>
                        </label>
                        {error.toLowerCase().includes('content') && (
                          <label className="flex items-center gap-1 text-xs">
                            <input
                              type="radio"
                              name={`select-${index}`}
                              value="ai"
                              checked={correctionSelections[index] === 'ai'}
                              onChange={() => handleSelectionChange(index, 'ai')}
                            />
                            <span>AI</span>
                          </label>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={applyCorrections}
                  className="aquila-button mt-3"
                >
                  Apply Corrections
                </button>
              </div>
            )}
            
            {/* Processing Logs */}
            {dataModule.processing_logs && dataModule.processing_logs.length > 0 && (
              <div className="bg-blue-900/20 border border-blue-500/50 rounded p-3">
                <h4 className="text-sm font-medium text-blue-400 mb-2">Processing Log:</h4>
                <div className="text-sm text-blue-300 space-y-1">
                  {dataModule.processing_logs.map((log, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-xs text-aquila-text-muted">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span>{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-2 bg-aquila-hover border-t border-aquila-border text-xs text-aquila-text-muted">
        <div className="flex items-center gap-4">
          <span>Type: {dataModule.dm_type}</span>
          <span>Variant: {dataModule.info_variant}</span>
          <span>Length: {dataModule.content?.length || 0} chars</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span>
            Updated: {new Date(dataModule.updated_at).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DataModuleViewer;