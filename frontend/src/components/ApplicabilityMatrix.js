import React, { useState, useEffect } from 'react';
import { useAquila } from '../contexts/AquilaContext';
import { Grid, Save, Download, Upload, Plus, X } from 'lucide-react';

const ApplicabilityMatrix = () => {
  const { dataModules, updateDataModule } = useAquila();
  const [selectedModule, setSelectedModule] = useState(null);
  const [applicabilityData, setApplicabilityData] = useState({});
  const [blocks, setBlocks] = useState(['Block A', 'Block B', 'Block C']);
  const [serials, setSerials] = useState(['Serial 001', 'Serial 002', 'Serial 003']);
  const [modStates, setModStates] = useState(['Mod 1', 'Mod 2', 'Mod 3']);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedModule) {
      setApplicabilityData(selectedModule.applicability || {});
    }
  }, [selectedModule]);

  const updateApplicability = (block, serial, modState, value) => {
    setApplicabilityData(prev => ({
      ...prev,
      [`${block}_${serial}_${modState}`]: value
    }));
  };

  const saveApplicability = async () => {
    if (!selectedModule) return;

    setLoading(true);
    try {
      await updateDataModule(selectedModule.dmc, {
        applicability: applicabilityData
      });
      
      // Update local state
      setSelectedModule(prev => ({
        ...prev,
        applicability: applicabilityData
      }));
    } catch (error) {
      console.error('Error saving applicability:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportMatrix = () => {
    const csvData = [];
    
    // Header
    const header = ['Block', 'Serial', ...modStates];
    csvData.push(header.join(','));
    
    // Data rows
    blocks.forEach(block => {
      serials.forEach(serial => {
        const row = [block, serial];
        modStates.forEach(modState => {
          const value = applicabilityData[`${block}_${serial}_${modState}`] || false;
          row.push(value ? 'Yes' : 'No');
        });
        csvData.push(row.join(','));
      });
    });
    
    const csvContent = csvData.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `applicability_${selectedModule?.dmc || 'matrix'}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const addBlock = () => {
    const newBlock = `Block ${String.fromCharCode(65 + blocks.length)}`;
    setBlocks([...blocks, newBlock]);
  };

  const addSerial = () => {
    const newSerial = `Serial ${String(serials.length + 1).padStart(3, '0')}`;
    setSerials([...serials, newSerial]);
  };

  const addModState = () => {
    const newModState = `Mod ${modStates.length + 1}`;
    setModStates([...modStates, newModState]);
  };

  const removeBlock = (index) => {
    setBlocks(blocks.filter((_, i) => i !== index));
  };

  const removeSerial = (index) => {
    setSerials(serials.filter((_, i) => i !== index));
  };

  const removeModState = (index) => {
    setModStates(modStates.filter((_, i) => i !== index));
  };

  return (
    <div className="h-full flex">
      {/* Data Module Selector */}
      <div className="w-1/4 border-r border-aquila-border overflow-auto">
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">Data Modules</h2>
          
          <div className="space-y-2">
            {dataModules.map((dm) => (
              <div
                key={dm.dmc}
                className={`aquila-tree-item cursor-pointer ${
                  selectedModule?.dmc === dm.dmc ? 'selected' : ''
                }`}
                onClick={() => setSelectedModule(dm)}
              >
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-2 h-2 bg-aquila-cyan rounded-full"></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{dm.title}</div>
                    <div className="text-xs text-aquila-text-muted truncate">{dm.dmc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Applicability Matrix */}
      <div className="flex-1 flex flex-col">
        {selectedModule ? (
          <>
            {/* Header */}
            <div className="aquila-panel-header">
              <div className="flex items-center gap-2">
                <Grid size={20} />
                <h3 className="text-lg font-semibold">Applicability Matrix</h3>
                <span className="text-sm text-aquila-text-muted">
                  {selectedModule.title}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportMatrix}
                  className="aquila-button-secondary"
                >
                  <Download size={16} />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={saveApplicability}
                  disabled={loading}
                  className="aquila-button"
                >
                  {loading ? (
                    <>
                      <div className="aquila-spinner w-4 h-4"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Save</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Matrix Content */}
            <div className="flex-1 p-4 overflow-auto">
              <div className="space-y-6">
                {/* Configuration */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="aquila-card">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Blocks</h4>
                      <button
                        onClick={addBlock}
                        className="aquila-button-secondary text-xs px-2 py-1"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {blocks.map((block, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={block}
                            onChange={(e) => {
                              const newBlocks = [...blocks];
                              newBlocks[index] = e.target.value;
                              setBlocks(newBlocks);
                            }}
                            className="flex-1 aquila-input text-sm"
                          />
                          <button
                            onClick={() => removeBlock(index)}
                            className="aquila-icon-button p-1 text-red-400"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="aquila-card">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Serials</h4>
                      <button
                        onClick={addSerial}
                        className="aquila-button-secondary text-xs px-2 py-1"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {serials.map((serial, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={serial}
                            onChange={(e) => {
                              const newSerials = [...serials];
                              newSerials[index] = e.target.value;
                              setSerials(newSerials);
                            }}
                            className="flex-1 aquila-input text-sm"
                          />
                          <button
                            onClick={() => removeSerial(index)}
                            className="aquila-icon-button p-1 text-red-400"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="aquila-card">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Mod States</h4>
                      <button
                        onClick={addModState}
                        className="aquila-button-secondary text-xs px-2 py-1"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {modStates.map((modState, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={modState}
                            onChange={(e) => {
                              const newModStates = [...modStates];
                              newModStates[index] = e.target.value;
                              setModStates(newModStates);
                            }}
                            className="flex-1 aquila-input text-sm"
                          />
                          <button
                            onClick={() => removeModState(index)}
                            className="aquila-icon-button p-1 text-red-400"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Matrix Table */}
                <div className="aquila-card">
                  <h4 className="font-medium mb-4">Applicability Matrix</h4>
                  <div className="overflow-auto">
                    <table className="aquila-table text-sm">
                      <thead>
                        <tr>
                          <th className="w-32">Block</th>
                          <th className="w-32">Serial</th>
                          {modStates.map(modState => (
                            <th key={modState} className="w-20 text-center">
                              {modState}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {blocks.map(block => (
                          serials.map(serial => (
                            <tr key={`${block}_${serial}`}>
                              <td className="font-medium">{block}</td>
                              <td className="text-aquila-text-muted">{serial}</td>
                              {modStates.map(modState => (
                                <td key={modState} className="text-center">
                                  <input
                                    type="checkbox"
                                    checked={applicabilityData[`${block}_${serial}_${modState}`] || false}
                                    onChange={(e) => updateApplicability(block, serial, modState, e.target.checked)}
                                    className="w-4 h-4 text-aquila-cyan bg-aquila-bg border-aquila-border rounded focus:ring-aquila-cyan"
                                  />
                                </td>
                              ))}
                            </tr>
                          ))
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-aquila-text-muted">
            <div className="text-center">
              <Grid size={64} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg">Select a Data Module</p>
              <p className="text-sm">Choose a data module to configure its applicability</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicabilityMatrix;