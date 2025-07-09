import React, { useState, useEffect } from 'react';
import { useAquila } from '../contexts/AquilaContext';
import { Image, Edit, Save, X, Plus, Trash2 } from 'lucide-react';

const IllustrationManager = () => {
  const { icns, loadICNs } = useAquila();
  const [selectedICN, setSelectedICN] = useState(null);
  const [editingCaption, setEditingCaption] = useState(false);
  const [editedCaption, setEditedCaption] = useState('');
  const [hotspots, setHotspots] = useState([]);
  const [isDrawingHotspot, setIsDrawingHotspot] = useState(false);
  const [drawingStart, setDrawingStart] = useState(null);

  useEffect(() => {
    loadICNs();
  }, []);

  useEffect(() => {
    if (selectedICN) {
      setEditedCaption(selectedICN.caption || '');
      setHotspots(selectedICN.hotspots || []);
    }
  }, [selectedICN]);

  const handleImageClick = (event) => {
    if (!isDrawingHotspot) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (!drawingStart) {
      setDrawingStart({ x, y });
    } else {
      const newHotspot = {
        id: Date.now(),
        x: Math.min(drawingStart.x, x),
        y: Math.min(drawingStart.y, y),
        width: Math.abs(x - drawingStart.x),
        height: Math.abs(y - drawingStart.y),
        description: 'New hotspot'
      };
      
      setHotspots([...hotspots, newHotspot]);
      setDrawingStart(null);
      setIsDrawingHotspot(false);
    }
  };

  const updateHotspot = (id, updates) => {
    setHotspots(hotspots.map(h => h.id === id ? { ...h, ...updates } : h));
  };

  const deleteHotspot = (id) => {
    setHotspots(hotspots.filter(h => h.id !== id));
  };

  const saveCaption = async () => {
    if (!selectedICN) return;

    try {
      // Update ICN with new caption and hotspots
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
            {/* Header */}
            <div className="aquila-panel-header">
              <div className="flex items-center gap-2">
                <Image size={20} />
                <h3 className="text-lg font-semibold">{selectedICN.icn_id}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsDrawingHotspot(!isDrawingHotspot)}
                  className={`aquila-button-secondary ${
                    isDrawingHotspot ? 'bg-aquila-cyan text-white' : ''
                  }`}
                >
                  <Plus size={16} />
                  <span>Add Hotspot</span>
                </button>
                <button
                  onClick={() => setEditingCaption(!editingCaption)}
                  className="aquila-button-secondary"
                >
                  <Edit size={16} />
                  <span>Edit Caption</span>
                </button>
              </div>
            </div>

            {/* Image Canvas */}
            <div className="flex-1 p-4">
              <div className="h-full flex gap-4">
                {/* Image with Hotspots */}
                <div className="flex-1 bg-aquila-bg rounded-lg overflow-hidden relative">
                  <div className="aquila-canvas relative">
                    <img
                      src={`${process.env.REACT_APP_BACKEND_URL}/api/icns/${selectedICN.icn_id}/image`}
                      alt={selectedICN.filename}
                      className="w-full h-auto cursor-crosshair"
                      onClick={handleImageClick}
                    />
                    
                    {/* Hotspots */}
                    {hotspots.map((hotspot) => (
                      <div
                        key={hotspot.id}
                        className="aquila-hotspot"
                        style={{
                          left: hotspot.x,
                          top: hotspot.y,
                          width: hotspot.width,
                          height: hotspot.height
                        }}
                        title={hotspot.description}
                      >
                        <div className="absolute -top-6 left-0 bg-aquila-surface px-2 py-1 rounded text-xs whitespace-nowrap">
                          {hotspot.description}
                        </div>
                      </div>
                    ))}
                    
                    {/* Drawing Preview */}
                    {isDrawingHotspot && drawingStart && (
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="text-sm text-aquila-cyan p-2">
                          Click to complete hotspot
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sidebar */}
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

                  {/* Hotspots List */}
                  <div className="aquila-card">
                    <h4 className="font-medium mb-3">Hotspots ({hotspots.length})</h4>
                    <div className="space-y-2 max-h-64 overflow-auto">
                      {hotspots.map((hotspot) => (
                        <div
                          key={hotspot.id}
                          className="flex items-center gap-2 p-2 bg-aquila-hover rounded"
                        >
                          <div className="flex-1">
                            <input
                              type="text"
                              value={hotspot.description}
                              onChange={(e) => updateHotspot(hotspot.id, { description: e.target.value })}
                              className="w-full bg-transparent text-sm focus:outline-none"
                            />
                            <div className="text-xs text-aquila-text-muted">
                              {hotspot.x}, {hotspot.y} ({hotspot.width}×{hotspot.height})
                            </div>
                          </div>
                          <button
                            onClick={() => deleteHotspot(hotspot.id)}
                            className="aquila-icon-button p-1 text-red-400 hover:text-red-300"
                          >
                            <Trash2 size={12} />
                          </button>
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
                        <span className="text-aquila-text-muted">Objects:</span>
                        <span>{selectedICN.objects?.length || 0}</span>
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