import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ZoomIn, ZoomOut, RotateCw, FileText } from 'lucide-react';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const DocumentViewer = ({ document }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);

  if (!document) {
    return (
      <div className="flex items-center justify-center h-full text-aquila-text-muted">
        <div className="text-center">
          <FileText size={48} className="mx-auto mb-4 opacity-50" />
          <p>No document selected</p>
          <p className="text-sm">Upload a document to view it here</p>
        </div>
      </div>
    );
  }

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const onDocumentLoadError = (error) => {
    console.error('Error loading document:', error);
  };

  const previousPage = () => {
    setPageNumber(prevPageNumber => Math.max(prevPageNumber - 1, 1));
  };

  const nextPage = () => {
    setPageNumber(prevPageNumber => Math.min(prevPageNumber + 1, numPages));
  };

  const zoomIn = () => {
    setScale(prevScale => Math.min(prevScale + 0.2, 3.0));
  };

  const zoomOut = () => {
    setScale(prevScale => Math.max(prevScale - 0.2, 0.5));
  };

  const rotate = () => {
    setRotation(prevRotation => (prevRotation + 90) % 360);
  };

  // Handle different document types
  const renderDocument = () => {
    if (document.mime_type === 'application/pdf') {
      return (
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-auto">
            <Document
              file={document.file_path}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex items-center justify-center h-full">
                  <div className="aquila-spinner w-8 h-8"></div>
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                rotate={rotation}
                renderAnnotationLayer={false}
                renderTextLayer={false}
                loading={
                  <div className="flex items-center justify-center h-64">
                    <div className="aquila-spinner w-6 h-6"></div>
                  </div>
                }
              />
            </Document>
          </div>
          
          {/* PDF Controls */}
          <div className="flex items-center justify-between p-2 bg-aquila-hover border-t border-aquila-border">
            <div className="flex items-center gap-2">
              <button
                onClick={previousPage}
                disabled={pageNumber <= 1}
                className="aquila-button-secondary text-xs px-2 py-1 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-aquila-text-muted">
                {pageNumber} of {numPages}
              </span>
              <button
                onClick={nextPage}
                disabled={pageNumber >= numPages}
                className="aquila-button-secondary text-xs px-2 py-1 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={zoomOut}
                className="aquila-icon-button p-1"
                title="Zoom Out"
              >
                <ZoomOut size={16} />
              </button>
              <span className="text-xs text-aquila-text-muted px-2">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={zoomIn}
                className="aquila-icon-button p-1"
                title="Zoom In"
              >
                <ZoomIn size={16} />
              </button>
              <button
                onClick={rotate}
                className="aquila-icon-button p-1"
                title="Rotate"
              >
                <RotateCw size={16} />
              </button>
            </div>
          </div>
        </div>
      );
    } else if (document.mime_type.startsWith('image/')) {
      return (
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-auto p-4">
            <img
              src={document.file_path}
              alt={document.filename}
              className="max-w-full h-auto"
              style={{
                transform: `scale(${scale}) rotate(${rotation}deg)`,
                transformOrigin: 'center'
              }}
            />
          </div>
          
          {/* Image Controls */}
          <div className="flex items-center justify-between p-2 bg-aquila-hover border-t border-aquila-border">
            <div className="flex items-center gap-2">
              <span className="text-sm text-aquila-text-muted">
                {document.filename}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={zoomOut}
                className="aquila-icon-button p-1"
                title="Zoom Out"
              >
                <ZoomOut size={16} />
              </button>
              <span className="text-xs text-aquila-text-muted px-2">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={zoomIn}
                className="aquila-icon-button p-1"
                title="Zoom In"
              >
                <ZoomIn size={16} />
              </button>
              <button
                onClick={rotate}
                className="aquila-icon-button p-1"
                title="Rotate"
              >
                <RotateCw size={16} />
              </button>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex items-center justify-center h-full text-aquila-text-muted">
          <div className="text-center">
            <FileText size={48} className="mx-auto mb-4 opacity-50" />
            <p>Preview not available</p>
            <p className="text-sm">File type: {document.mime_type}</p>
            <p className="text-sm">Size: {(document.file_size / 1024).toFixed(1)} KB</p>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="h-full">
      {renderDocument()}
    </div>
  );
};

export default DocumentViewer;