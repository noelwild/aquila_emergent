import React, { useState, useEffect, useRef } from 'react';
import MonacoEditor from 'react-monaco-editor';
import { Check, X, Settings, Code } from 'lucide-react';

const XMLEditor = ({ content, language = 'xml', readOnly = false, onChange }) => {
  const [editorContent, setEditorContent] = useState(content || '');
  const [isDirty, setIsDirty] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const [validationErrors, setValidationErrors] = useState([]);
  const editorRef = useRef(null);

  useEffect(() => {
    setEditorContent(content || '');
    setIsDirty(false);
  }, [content]);

  const handleEditorChange = (value) => {
    setEditorContent(value);
    setIsDirty(true);
    
    if (onChange) {
      onChange(value);
    }
    
    // Basic XML validation
    validateXML(value);
  };

  const validateXML = (xmlContent) => {
    if (!xmlContent.trim()) {
      setIsValid(true);
      setValidationErrors([]);
      return;
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlContent, 'text/xml');
      const errors = doc.getElementsByTagName('parsererror');
      
      if (errors.length > 0) {
        setIsValid(false);
        setValidationErrors([errors[0].textContent]);
      } else {
        setIsValid(true);
        setValidationErrors([]);
      }
    } catch (error) {
      setIsValid(false);
      setValidationErrors([error.message]);
    }
  };

  const formatXML = () => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(editorContent, 'text/xml');
      const serializer = new XMLSerializer();
      const formatted = serializer.serializeToString(doc);
      
      // Basic formatting
      const formattedXML = formatted
        .replace(/></g, '>\n<')
        .replace(/^\s+|\s+$/g, '')
        .split('\n')
        .map(line => line.trim())
        .join('\n');
      
      setEditorContent(formattedXML);
      setIsDirty(true);
    } catch (error) {
      console.error('Error formatting XML:', error);
    }
  };

  const editorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Configure Monaco editor for dark theme
    monaco.editor.setTheme('vs-dark');
    
    // Add custom XML validation
    monaco.languages.registerDocumentFormattingEditProvider('xml', {
      provideDocumentFormattingEdits: (model, options, token) => {
        return [];
      }
    });
  };

  const editorOptions = {
    selectOnLineNumbers: true,
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 12,
    fontFamily: 'JetBrains Mono, monospace',
    theme: 'vs-dark',
    readOnly: readOnly,
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    lineNumbers: 'on',
    folding: true,
    renderIndentGuides: true,
    renderWhitespace: 'selection',
    bracketMatching: 'always',
    autoClosingBrackets: 'always',
    autoClosingQuotes: 'always',
    autoIndent: 'full',
    formatOnPaste: true,
    formatOnType: true,
    tabSize: 2,
    insertSpaces: true
  };

  return (
    <div className="h-full flex flex-col">
      {/* Editor Header */}
      <div className="flex items-center justify-between p-2 bg-aquila-hover border-b border-aquila-border">
        <div className="flex items-center gap-2">
          <Code size={16} />
          <span className="text-sm font-medium">XML Editor</span>
          {isDirty && (
            <span className="text-xs text-aquila-text-muted">• Modified</span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {isValid ? (
              <Check size={16} className="text-aquila-led-green" />
            ) : (
              <X size={16} className="text-aquila-led-red" />
            )}
            <span className="text-xs text-aquila-text-muted">
              {isValid ? 'Valid' : 'Invalid'}
            </span>
          </div>
          
          <button
            onClick={formatXML}
            className="aquila-button-secondary text-xs px-2 py-1"
            disabled={readOnly}
          >
            Format
          </button>
          
          <button
            className="aquila-icon-button p-1"
            title="Editor Settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 bg-gray-900">
        <MonacoEditor
          language={language}
          value={editorContent}
          onChange={handleEditorChange}
          editorDidMount={editorDidMount}
          options={editorOptions}
          height="100%"
          width="100%"
        />
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-900/20 border-t border-red-500/50 p-2 max-h-32 overflow-auto">
          <h4 className="text-sm font-medium text-red-400 mb-1">Validation Errors:</h4>
          <div className="text-sm text-red-300 space-y-1">
            {validationErrors.map((error, index) => (
              <div key={index}>• {error}</div>
            ))}
          </div>
        </div>
      )}

      {/* Editor Footer */}
      <div className="flex items-center justify-between p-2 bg-aquila-hover border-t border-aquila-border text-xs text-aquila-text-muted">
        <div className="flex items-center gap-4">
          <span>Language: {language.toUpperCase()}</span>
          <span>Lines: {editorContent.split('\n').length}</span>
          <span>Characters: {editorContent.length}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span>Spaces: 2</span>
          <span>UTF-8</span>
        </div>
      </div>
    </div>
  );
};

export default XMLEditor;