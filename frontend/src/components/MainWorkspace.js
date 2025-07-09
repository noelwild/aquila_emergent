import React, { useState } from 'react';
import { FileText } from 'lucide-react';

const MainWorkspace = () => {
  return (
    <div className="flex-1 flex flex-col">
      {/* Main Grid - 3x2 layout */}
      <div className="aquila-main-grid">
        {/* Top Row */}
        <div className="aquila-panel">
          <div className="aquila-panel-header">
            <h3 className="text-sm font-medium">Original Document</h3>
            <span className="text-xs text-aquila-text-muted">No document loaded</span>
          </div>
          <div className="aquila-panel-content">
            <div className="flex items-center justify-center h-full text-aquila-text-muted">
              <div className="text-center">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p>No document selected</p>
                <p className="text-sm">Upload a document to view it here</p>
              </div>
            </div>
          </div>
        </div>

        <div className="aquila-panel">
          <div className="aquila-panel-header">
            <h3 className="text-sm font-medium">Verbatim DM</h3>
            <span className="text-xs text-aquila-text-muted">InfoVariant 00</span>
          </div>
          <div className="aquila-panel-content">
            <div className="flex items-center justify-center h-full text-aquila-text-muted">
              <div className="text-center">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p>No data module selected</p>
                <p className="text-sm">Process a document to generate data modules</p>
              </div>
            </div>
          </div>
        </div>

        <div className="aquila-panel">
          <div className="aquila-panel-header">
            <h3 className="text-sm font-medium">STE DM</h3>
            <span className="text-xs text-aquila-text-muted">InfoVariant 01</span>
          </div>
          <div className="aquila-panel-content">
            <div className="flex items-center justify-center h-full text-aquila-text-muted">
              <div className="text-center">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p>No STE data module</p>
                <p className="text-sm">STE rewriting will appear here</p>
              </div>
            </div>
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
            <div className="h-full bg-gray-900 p-4 rounded">
              <div className="text-green-400 font-mono text-sm">
                {'<?xml version="1.0" encoding="UTF-8"?>'}<br />
                {'<dmodule>'}<br />
                {'  <!-- XML content will appear here -->'}<br />
                {'</dmodule>'}
              </div>
            </div>
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
            <div className="h-full bg-gray-900 p-4 rounded">
              <div className="text-green-400 font-mono text-sm">
                {'<?xml version="1.0" encoding="UTF-8"?>'}<br />
                {'<dmodule>'}<br />
                {'  <!-- STE XML content will appear here -->'}<br />
                {'</dmodule>'}
              </div>
            </div>
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
            <div className="space-y-2">
              <div className="text-sm text-aquila-text-muted text-center py-8">
                No data modules available
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainWorkspace;