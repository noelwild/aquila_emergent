import React, { useState, useEffect, useRef } from 'react';
import { useAquila } from '../contexts/AquilaContext';
import { 
  Image, 
  Edit, 
  Save, 
  X, 
  Plus, 
  Trash2, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Grid, 
  Crosshair, 
  Wand2, 
  Copy, 
  Undo, 
  Redo,
  Eye,
  EyeOff,
  Layers,
  Target,
  Square,
  Circle,
  Polygon
} from 'lucide-react';

const IllustrationManager = () => {
  const { icns, loadICNs } = useAquila();
  const [selectedICN, setSelectedICN] = useState(null);
  const [editingCaption, setEditingCaption] = useState(false);
  const [editedCaption, setEditedCaption] = useState('');
  const [hotspots, setHotspots] = useState([]);
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [isDrawingHotspot, setIsDrawingHotspot] = useState(false);
  const [drawingStart, setDrawingStart] = useState(null);
  const [currentDrawing, setCurrentDrawing] = useState(null);
  const [hotspotMode, setHotspotMode] = useState('rectangle');
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(false);
  const [showHotspots, setShowHotspots] = useState(true);
  const [hotspotHistory, setHotspotHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [nextHotspotNumber, setNextHotspotNumber] = useState(1);
  
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  // Hotspot templates for common components
  const hotspotTemplates = [
    { name: 'Warning', color: '#ef4444', defaultText: 'Warning: Check before operation' },
    { name: 'Information', color: '#3b82f6', defaultText: 'Information point' },
    { name: 'Reference', color: '#10b981', defaultText: 'Reference to manual' },
    { name: 'Component', color: '#f59e0b', defaultText: 'Component identifier' },
    { name: 'Maintenance', color: '#8b5cf6', defaultText: 'Maintenance point' },
    { name: 'Safety', color: '#dc2626', defaultText: 'Safety critical area' }
  ];

  useEffect(() => {
    loadICNs();
  }, []);

  useEffect(() => {
    if (selectedICN) {
      setEditedCaption(selectedICN.caption || '');
      setHotspots(selectedICN.hotspots || []);
      setHotspotHistory([selectedICN.hotspots || []]);
      setHistoryIndex(0);
      setNextHotspotNumber(1);
      setAiSuggestions([]);
    }
  }, [selectedICN]);

  // Add to history for undo/redo
  const addToHistory = (newHotspots) => {
    const newHistory = hotspotHistory.slice(0, historyIndex + 1);
    newHistory.push(newHotspots);
    setHotspotHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Undo/Redo functionality
  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setHotspots(hotspotHistory[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < hotspotHistory.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setHotspots(hotspotHistory[historyIndex + 1]);
    }
  };

  // Get relative coordinates within the image
  const getRelativeCoordinates = (event) => {
    const rect = imageRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / zoom;
    const y = (event.clientY - rect.top) / zoom;
    
    // Snap to grid if enabled
    if (showGrid) {
      const gridSize = 10;
      return {
        x: Math.round(x / gridSize) * gridSize,
        y: Math.round(y / gridSize) * gridSize
      };
    }
    
    return { x, y };
  };

  // Enhanced mouse handling for hotspot creation
  const handleMouseDown = (event) => {
    if (!isDrawingHotspot) return;
    
    const coords = getRelativeCoordinates(event);
    setDrawingStart(coords);
    setCurrentDrawing({ ...coords, width: 0, height: 0 });
  };

  const handleMouseMove = (event) => {
    if (!isDrawingHotspot || !drawingStart) return;
    
    const coords = getRelativeCoordinates(event);
    const drawing = {
      x: Math.min(drawingStart.x, coords.x),
      y: Math.min(drawingStart.y, coords.y),
      width: Math.abs(coords.x - drawingStart.x),
      height: Math.abs(coords.y - drawingStart.y)
    };
    
    setCurrentDrawing(drawing);
  };

  const handleMouseUp = (event) => {
    if (!isDrawingHotspot || !drawingStart || !currentDrawing) return;
    
    // Minimum size check
    if (currentDrawing.width < 20 || currentDrawing.height < 20) {
      setDrawingStart(null);
      setCurrentDrawing(null);
      return;
    }
    
    const newHotspot = {
      id: Date.now(),
      number: nextHotspotNumber,
      x: currentDrawing.x,
      y: currentDrawing.y,
      width: currentDrawing.width,
      height: currentDrawing.height,
      description: `Hotspot ${nextHotspotNumber}`,
      type: 'component',
      color: '#3b82f6'
    };
    
    const newHotspots = [...hotspots, newHotspot];
    setHotspots(newHotspots);
    addToHistory(newHotspots);
    setNextHotspotNumber(nextHotspotNumber + 1);
    setDrawingStart(null);
    setCurrentDrawing(null);
    setIsDrawingHotspot(false);
  };

  // AI-powered hotspot suggestions
  const generateAISuggestions = async () => {
    if (!selectedICN) return;
    
    setLoadingSuggestions(true);
    try {
      // Convert image to base64 for AI processing
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = imageRef.current;
      
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      
      const imageData = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      
      // Get AI suggestions for hotspots
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/test/vision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image_data: imageData,
          task_type: 'hotspots'
        })
      });
      
      const result = await response.json();
      
      if (result.hotspots && result.hotspots.length > 0) {
        const suggestions = result.hotspots.map((spot, index) => ({
          id: `ai-${Date.now()}-${index}`,
          number: nextHotspotNumber + index,
          x: spot.x || Math.random() * 200,
          y: spot.y || Math.random() * 200,
          width: spot.width || 60,
          height: spot.height || 40,
          description: spot.description || `AI Detected Component ${index + 1}`,
          type: 'ai-suggestion',
          color: '#10b981',
          confidence: 0.8
        }));
        
        setAiSuggestions(suggestions);
      }
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Accept AI suggestion
  const acceptAISuggestion = (suggestion) => {
    const newHotspot = {
      ...suggestion,
      type: 'component',
      color: '#3b82f6'
    };
    
    const newHotspots = [...hotspots, newHotspot];
    setHotspots(newHotspots);
    addToHistory(newHotspots);
    setNextHotspotNumber(nextHotspotNumber + 1);
    setAiSuggestions(aiSuggestions.filter(s => s.id !== suggestion.id));
  };

  // Apply hotspot template
  const applyTemplate = (template) => {
    if (!selectedHotspot) return;
    
    const updatedHotspots = hotspots.map(h => 
      h.id === selectedHotspot.id 
        ? { ...h, description: template.defaultText, color: template.color, type: template.name.toLowerCase() }
        : h
    );
    
    setHotspots(updatedHotspots);
    addToHistory(updatedHotspots);
  };

  const updateHotspot = (id, updates) => {
    const updatedHotspots = hotspots.map(h => h.id === id ? { ...h, ...updates } : h);
    setHotspots(updatedHotspots);
    addToHistory(updatedHotspots);
  };

  const deleteHotspot = (id) => {
    const updatedHotspots = hotspots.filter(h => h.id !== id);
    setHotspots(updatedHotspots);
    addToHistory(updatedHotspots);
    setSelectedHotspot(null);
  };

  const duplicateHotspot = (id) => {
    const original = hotspots.find(h => h.id === id);
    if (!original) return;
    
    const duplicate = {
      ...original,
      id: Date.now(),
      number: nextHotspotNumber,
      x: original.x + 20,
      y: original.y + 20,
      description: `${original.description} (Copy)`
    };
    
    const newHotspots = [...hotspots, duplicate];
    setHotspots(newHotspots);
    addToHistory(newHotspots);
    setNextHotspotNumber(nextHotspotNumber + 1);
  };

  const saveCaption = async () => {
    if (!selectedICN) return;

    try {
      await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/icns/${selectedICN.icn_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          caption: editedCaption,
          hotspots: hotspots
        })
      });

      setEditingCaption(false);
      loadICNs();
    } catch (error) {
      console.error('Error updating ICN:', error);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Delete' && selectedHotspot) {
        deleteHotspot(selectedHotspot.id);
      } else if (event.key === 'Escape') {
        setIsDrawingHotspot(false);
        setDrawingStart(null);
        setCurrentDrawing(null);
        setSelectedHotspot(null);
      } else if (event.ctrlKey && event.key === 'z') {
        event.preventDefault();
        undo();
      } else if (event.ctrlKey && event.key === 'y') {
        event.preventDefault();
        redo();
      } else if (event.ctrlKey && event.key === 'd' && selectedHotspot) {
        event.preventDefault();
        duplicateHotspot(selectedHotspot.id);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedHotspot, historyIndex]);

  return (
    <div className="h-full flex">
      {/* ICN Grid */}
      <div className="w-1/3 border-r border-aquila-border overflow-auto">
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">Illustrations ({icns.length})</h2>
          
          <div className="grid grid-cols-2 gap-4">
            {icns.map((icn) => (
              <div
                key={icn.icn_id}
                className={`aquila-card cursor-pointer transition-all ${
                  selectedICN?.icn_id === icn.icn_id ? 'ring-2 ring-aquila-cyan' : ''
                }`}
                onClick={() => setSelectedICN(icn)}
              >
                <div className="aspect-square mb-2 bg-aquila-bg rounded overflow-hidden">
                  <img
                    src={`${process.env.REACT_APP_BACKEND_URL}/api/icns/${icn.icn_id}/image`}
                    alt={icn.filename}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-sm">
                  <div className="font-medium truncate">{icn.icn_id}</div>
                  <div className="text-aquila-text-muted text-xs truncate">
                    {icn.filename}
                  </div>
                  <div className="text-aquila-text-muted text-xs">
                    {icn.width}×{icn.height}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ICN Details */}
      <div className="flex-1 flex flex-col">
        {selectedICN ? (
          <>
            {/* Enhanced Toolbar */}
            <div className="aquila-panel-header">
              <div className="flex items-center gap-2">
                <Image size={20} />
                <h3 className="text-lg font-semibold">{selectedICN.icn_id}</h3>
                <div className="flex items-center gap-1 ml-4">
                  <span className="text-xs text-aquila-text-muted">
                    {hotspots.length} hotspots
                  </span>
                  {aiSuggestions.length > 0 && (
                    <span className="text-xs text-aquila-cyan">
                      {aiSuggestions.length} AI suggestions
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* AI Suggestions */}
                <button
                  onClick={generateAISuggestions}
                  disabled={loadingSuggestions}
                  className="aquila-button-secondary"
                >
                  {loadingSuggestions ? (
                    <div className="aquila-spinner w-4 h-4"></div>
                  ) : (
                    <Wand2 size={16} />
                  )}
                  <span>AI Suggest</span>
                </button>
                
                {/* Zoom Controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                    className="aquila-icon-button"
                  >
                    <ZoomOut size={16} />
                  </button>
                  <span className="text-xs text-aquila-text-muted px-2">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                    className="aquila-icon-button"
                  >
                    <ZoomIn size={16} />
                  </button>
                </div>
                
                {/* View Options */}
                <button
                  onClick={() => setShowGrid(!showGrid)}
                  className={`aquila-icon-button ${showGrid ? 'text-aquila-cyan' : ''}`}
                >
                  <Grid size={16} />
                </button>
                
                <button
                  onClick={() => setShowHotspots(!showHotspots)}
                  className={`aquila-icon-button ${showHotspots ? 'text-aquila-cyan' : ''}`}
                >
                  {showHotspots ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                
                {/* Undo/Redo */}
                <button
                  onClick={undo}
                  disabled={historyIndex <= 0}
                  className="aquila-icon-button disabled:opacity-50"
                >
                  <Undo size={16} />
                </button>
                
                <button
                  onClick={redo}
                  disabled={historyIndex >= hotspotHistory.length - 1}
                  className="aquila-icon-button disabled:opacity-50"
                >
                  <Redo size={16} />
                </button>
                
                {/* Hotspot Tools */}
                <div className="flex items-center gap-1 border-l border-aquila-border pl-2">
                  <button
                    onClick={() => setIsDrawingHotspot(!isDrawingHotspot)}
                    className={`aquila-button-secondary ${
                      isDrawingHotspot ? 'bg-aquila-cyan text-white' : ''
                    }`}
                  >
                    <Crosshair size={16} />
                    <span>Add Hotspot</span>
                  </button>
                </div>
                
                <button
                  onClick={() => setEditingCaption(!editingCaption)}
                  className="aquila-button-secondary"
                >
                  <Edit size={16} />
                  <span>Edit Caption</span>
                </button>
              </div>
            </div>

            {/* Enhanced Image Canvas */}
            <div className="flex-1 p-4">
              <div className="h-full flex gap-4">
                {/* Image with Enhanced Hotspots */}
                <div className="flex-1 bg-aquila-bg rounded-lg overflow-hidden relative">
                  <div 
                    className="aquila-canvas relative overflow-auto"
                    style={{ cursor: isDrawingHotspot ? 'crosshair' : 'default' }}
                  >
                    {/* Grid Overlay */}
                    {showGrid && (
                      <div 
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          backgroundImage: `
                            linear-gradient(rgba(6, 182, 212, 0.2) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(6, 182, 212, 0.2) 1px, transparent 1px)
                          `,
                          backgroundSize: `${10 * zoom}px ${10 * zoom}px`
                        }}
                      />
                    )}
                    
                    <img
                      ref={imageRef}
                      src={`${process.env.REACT_APP_BACKEND_URL}/api/icns/${selectedICN.icn_id}/image`}
                      alt={selectedICN.filename}
                      className="w-full h-auto"
                      style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
                      onLoad={() => setImageLoaded(true)}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                    />
                    
                    {/* Current Drawing Preview */}
                    {currentDrawing && (
                      <div
                        className="absolute border-2 border-aquila-cyan border-dashed bg-aquila-cyan bg-opacity-20 pointer-events-none"
                        style={{
                          left: currentDrawing.x * zoom,
                          top: currentDrawing.y * zoom,
                          width: currentDrawing.width * zoom,
                          height: currentDrawing.height * zoom
                        }}
                      />
                    )}
                    
                    {/* Enhanced Hotspots */}
                    {showHotspots && hotspots.map((hotspot) => (
                      <div
                        key={hotspot.id}
                        className={`absolute border-2 cursor-pointer transition-all ${
                          selectedHotspot?.id === hotspot.id 
                            ? 'border-aquila-cyan border-solid shadow-lg' 
                            : 'border-white border-dashed hover:border-solid'
                        }`}
                        style={{
                          left: hotspot.x * zoom,
                          top: hotspot.y * zoom,
                          width: hotspot.width * zoom,
                          height: hotspot.height * zoom,
                          backgroundColor: `${hotspot.color}20`,
                          borderColor: hotspot.color
                        }}
                        onClick={() => setSelectedHotspot(hotspot)}
                      >
                        {/* Hotspot Number */}
                        <div 
                          className="absolute -top-6 -left-1 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center text-white"
                          style={{ backgroundColor: hotspot.color }}
                        >
                          {hotspot.number}
                        </div>
                        
                        {/* Hotspot Label */}
                        <div 
                          className="absolute -top-6 left-6 px-2 py-1 rounded text-xs whitespace-nowrap text-white"
                          style={{ backgroundColor: hotspot.color }}
                        >
                          {hotspot.description}
                        </div>
                        
                        {/* Resize Handles */}
                        {selectedHotspot?.id === hotspot.id && (
                          <>
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-aquila-cyan rounded-full cursor-se-resize"></div>
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-aquila-cyan rounded-full cursor-ne-resize"></div>
                            <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-aquila-cyan rounded-full cursor-sw-resize"></div>
                            <div className="absolute -top-1 -left-1 w-3 h-3 bg-aquila-cyan rounded-full cursor-nw-resize"></div>
                          </>
                        )}
                      </div>
                    ))}
                    
                    {/* AI Suggestions */}
                    {aiSuggestions.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        className="absolute border-2 border-dashed border-green-400 bg-green-400 bg-opacity-20 cursor-pointer"
                        style={{
                          left: suggestion.x * zoom,
                          top: suggestion.y * zoom,
                          width: suggestion.width * zoom,
                          height: suggestion.height * zoom
                        }}
                        onClick={() => acceptAISuggestion(suggestion)}
                      >
                        <div className="absolute -top-6 -left-1 bg-green-400 text-white text-xs px-2 py-1 rounded">
                          AI: {suggestion.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Enhanced Sidebar */}
                <div className="w-80 space-y-4">
                  {/* Caption Editor */}
                  <div className="aquila-card">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Caption</h4>
                      {editingCaption && (
                        <div className="flex gap-2">
                          <button
                            onClick={saveCaption}
                            className="aquila-button text-xs px-2 py-1"
                          >
                            <Save size={12} />
                          </button>
                          <button
                            onClick={() => setEditingCaption(false)}
                            className="aquila-button-secondary text-xs px-2 py-1"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {editingCaption ? (
                      <textarea
                        value={editedCaption}
                        onChange={(e) => setEditedCaption(e.target.value)}
                        className="w-full h-32 aquila-input resize-none text-sm"
                        placeholder="Enter caption..."
                      />
                    ) : (
                      <div className="text-sm text-aquila-text-muted">
                        {selectedICN.caption || 'No caption available'}
                      </div>
                    )}
                  </div>

                  {/* Hotspot Templates */}
                  <div className="aquila-card">
                    <h4 className="font-medium mb-3">Hotspot Templates</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {hotspotTemplates.map((template) => (
                        <button
                          key={template.name}
                          onClick={() => applyTemplate(template)}
                          disabled={!selectedHotspot}
                          className="p-2 text-xs border border-aquila-border rounded hover:bg-aquila-hover disabled:opacity-50"
                          style={{ borderColor: template.color }}
                        >
                          <div className="flex items-center gap-1">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: template.color }}
                            />
                            {template.name}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selected Hotspot Editor */}
                  {selectedHotspot && (
                    <div className="aquila-card">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">Hotspot #{selectedHotspot.number}</h4>
                        <div className="flex gap-1">
                          <button
                            onClick={() => duplicateHotspot(selectedHotspot.id)}
                            className="aquila-icon-button p-1"
                            title="Duplicate"
                          >
                            <Copy size={12} />
                          </button>
                          <button
                            onClick={() => deleteHotspot(selectedHotspot.id)}
                            className="aquila-icon-button p-1 text-red-400"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-aquila-text-muted mb-1">
                            Description
                          </label>
                          <input
                            type="text"
                            value={selectedHotspot.description}
                            onChange={(e) => updateHotspot(selectedHotspot.id, { description: e.target.value })}
                            className="w-full aquila-input text-sm"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-aquila-text-muted mb-1">
                              X Position
                            </label>
                            <input
                              type="number"
                              value={Math.round(selectedHotspot.x)}
                              onChange={(e) => updateHotspot(selectedHotspot.id, { x: parseInt(e.target.value) })}
                              className="w-full aquila-input text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-aquila-text-muted mb-1">
                              Y Position
                            </label>
                            <input
                              type="number"
                              value={Math.round(selectedHotspot.y)}
                              onChange={(e) => updateHotspot(selectedHotspot.id, { y: parseInt(e.target.value) })}
                              className="w-full aquila-input text-sm"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-aquila-text-muted mb-1">
                              Width
                            </label>
                            <input
                              type="number"
                              value={Math.round(selectedHotspot.width)}
                              onChange={(e) => updateHotspot(selectedHotspot.id, { width: parseInt(e.target.value) })}
                              className="w-full aquila-input text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-aquila-text-muted mb-1">
                              Height
                            </label>
                            <input
                              type="number"
                              value={Math.round(selectedHotspot.height)}
                              onChange={(e) => updateHotspot(selectedHotspot.id, { height: parseInt(e.target.value) })}
                              className="w-full aquila-input text-sm"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-aquila-text-muted mb-1">
                            Color
                          </label>
                          <input
                            type="color"
                            value={selectedHotspot.color}
                            onChange={(e) => updateHotspot(selectedHotspot.id, { color: e.target.value })}
                            className="w-full h-8 rounded border border-aquila-border"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Hotspots List */}
                  <div className="aquila-card">
                    <h4 className="font-medium mb-3">Hotspots ({hotspots.length})</h4>
                    <div className="space-y-2 max-h-64 overflow-auto">
                      {hotspots.map((hotspot) => (
                        <div
                          key={hotspot.id}
                          className={`p-2 rounded cursor-pointer transition-all ${
                            selectedHotspot?.id === hotspot.id 
                              ? 'bg-aquila-cyan text-white' 
                              : 'bg-aquila-hover hover:bg-aquila-border'
                          }`}
                          onClick={() => setSelectedHotspot(hotspot)}
                        >
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold text-white"
                              style={{ backgroundColor: hotspot.color }}
                            >
                              {hotspot.number}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium">{hotspot.description}</div>
                              <div className="text-xs opacity-75">
                                {Math.round(hotspot.x)}, {Math.round(hotspot.y)} • {Math.round(hotspot.width)}×{Math.round(hotspot.height)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Properties */}
                  <div className="aquila-card">
                    <h4 className="font-medium mb-3">Properties</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-aquila-text-muted">Filename:</span>
                        <span>{selectedICN.filename}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-aquila-text-muted">Dimensions:</span>
                        <span>{selectedICN.width}×{selectedICN.height}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-aquila-text-muted">Format:</span>
                        <span>{selectedICN.mime_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-aquila-text-muted">Zoom:</span>
                        <span>{Math.round(zoom * 100)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-aquila-text-muted">
            <div className="text-center">
              <Image size={64} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg">Select an illustration</p>
              <p className="text-sm">Choose an ICN from the list to view and edit</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IllustrationManager;