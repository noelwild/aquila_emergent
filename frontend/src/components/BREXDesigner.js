import React, { useState, useEffect } from 'react';
import { useAquila } from '../contexts/AquilaContext';
import { Settings, Save, Download, Upload, Plus, X, AlertTriangle } from 'lucide-react';
import YAML from 'yaml';

const BREXDesigner = () => {
  const { dataModules, loadDataModules } = useAquila();
  const [brexRules, setBrexRules] = useState({});
  const [yamlContent, setYamlContent] = useState('');
  const [isEditingYaml, setIsEditingYaml] = useState(false);
  const [validationResults, setValidationResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBREXRules();
  }, []);

  const loadBREXRules = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/settings`);
      const settings = await response.json();
      
      const rules = settings.brex_rules || getDefaultBREXRules();
      setBrexRules(rules);
      setYamlContent(YAML.stringify(rules, { indent: 2 }));
    } catch (error) {
      console.error('Error loading BREX rules:', error);
      const defaultRules = getDefaultBREXRules();
      setBrexRules(defaultRules);
      setYamlContent(YAML.stringify(defaultRules, { indent: 2 }));
    }
  };

  const getDefaultBREXRules = () => ({
    title: {
      required: true,
      maxLength: 100,
      pattern: "^[A-Za-z0-9\\s\\-_]+$"
    },
    dmc: {
      required: true,
      pattern: "^DMC-[A-Z0-9\\-]+$"
    },
    content: {
      required: true,
      minLength: 10,
      maxLength: 50000
    },
    illustrations: {
      maxCount: 50,
      allowedFormats: ["jpg", "jpeg", "png", "gif", "svg"]
    },
    tables: {
      maxColumns: 20,
      maxRows: 200
    },
    references: {
      validateDMRefs: true,
      validateICNRefs: true,
      allowBrokenRefs: false
    },
    security: {
      allowedClassifications: ["UNCLASSIFIED", "CONFIDENTIAL", "SECRET"],
      requireWatermark: false
    },
    ste: {
      minScore: 0.85,
      warnBelowScore: 0.90
    }
  });

  const saveBREXRules = async () => {
    setLoading(true);
    setError('');
    
    try {
      let rulesToSave = brexRules;
      
      if (isEditingYaml) {
        // Parse YAML and validate
        rulesToSave = YAML.parse(yamlContent);
        setBrexRules(rulesToSave);
      }
      
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          brex_rules: rulesToSave
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save BREX rules');
      }
      
      // Validate all data modules with new rules
      await validateAllDataModules();
      
      setIsEditingYaml(false);
    } catch (error) {
      console.error('Error saving BREX rules:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const validateAllDataModules = async () => {
    const results = {};
    
    for (const dm of dataModules) {
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/validate/${dm.dmc}`, {
          method: 'POST'
        });
        
        if (response.ok) {
          const result = await response.json();
          results[dm.dmc] = result;
        }
      } catch (error) {
        console.error(`Error validating ${dm.dmc}:`, error);
        results[dm.dmc] = { status: 'error', errors: [error.message] };
      }
    }
    
    setValidationResults(results);
    loadDataModules(); // Reload to get updated statuses
  };

  const updateRule = (path, value) => {
    const newRules = { ...brexRules };
    const keys = path.split('.');
    let current = newRules;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    setBrexRules(newRules);
    setYamlContent(YAML.stringify(newRules, { indent: 2 }));
  };

  const exportRules = () => {
    const yamlData = YAML.stringify(brexRules, { indent: 2 });
    const blob = new Blob([yamlData], { type: 'text/yaml' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'brex_rules.yaml';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const importRules = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedRules = YAML.parse(e.target.result);
          setBrexRules(importedRules);
          setYamlContent(YAML.stringify(importedRules, { indent: 2 }));
        } catch (error) {
          setError('Error parsing YAML file: ' + error.message);
        }
      };
      reader.readAsText(file);
    }
  };

  const getValidationStatusColor = (status) => {
    switch (status) {
      case 'green': return 'text-aquila-led-green';
      case 'amber': return 'text-aquila-led-amber';
      case 'red': return 'text-aquila-led-red';
      default: return 'text-aquila-text-muted';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="aquila-panel-header">
        <div className="flex items-center gap-2">
          <Settings size={20} />
          <h2 className="text-lg font-semibold">BREX Rule Designer</h2>
        </div>
        <div className="flex items-center gap-2">
          <label className="aquila-button-secondary cursor-pointer">
            <Upload size={16} />
            <span>Import</span>
            <input
              type="file"
              accept=".yaml,.yml"
              onChange={importRules}
              className="hidden"
            />
          </label>
          <button
            onClick={exportRules}
            className="aquila-button-secondary"
          >
            <Download size={16} />
            <span>Export</span>
          </button>
          <button
            onClick={() => setIsEditingYaml(!isEditingYaml)}
            className={`aquila-button-secondary ${isEditingYaml ? 'bg-aquila-cyan text-white' : ''}`}
          >
            YAML
          </button>
          <button
            onClick={saveBREXRules}
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
                <span>Save & Validate</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/50 p-3 mx-4 mt-4 rounded">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400" />
            <span className="text-red-400">{error}</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 p-4 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Rule Editor */}
          <div className="lg:col-span-2">
            {isEditingYaml ? (
              <div className="aquila-card h-full">
                <h3 className="text-lg font-semibold mb-4">YAML Editor</h3>
                <textarea
                  value={yamlContent}
                  onChange={(e) => setYamlContent(e.target.value)}
                  className="w-full h-96 bg-aquila-bg border border-aquila-border rounded p-3 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-aquila-cyan"
                  placeholder="Enter BREX rules in YAML format..."
                />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Title Rules */}
                <div className="aquila-card">
                  <h3 className="text-lg font-semibold mb-4">Title Rules</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Required</label>
                      <input
                        type="checkbox"
                        checked={brexRules.title?.required || false}
                        onChange={(e) => updateRule('title.required', e.target.checked)}
                        className="w-4 h-4 text-aquila-cyan bg-aquila-bg border-aquila-border rounded focus:ring-aquila-cyan"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Max Length</label>
                      <input
                        type="number"
                        value={brexRules.title?.maxLength || 100}
                        onChange={(e) => updateRule('title.maxLength', parseInt(e.target.value))}
                        className="w-full aquila-input"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">Pattern (Regex)</label>
                      <input
                        type="text"
                        value={brexRules.title?.pattern || ''}
                        onChange={(e) => updateRule('title.pattern', e.target.value)}
                        className="w-full aquila-input"
                        placeholder="^[A-Za-z0-9\\s\\-_]+$"
                      />
                    </div>
                  </div>
                </div>

                {/* Content Rules */}
                <div className="aquila-card">
                  <h3 className="text-lg font-semibold mb-4">Content Rules</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Required</label>
                      <input
                        type="checkbox"
                        checked={brexRules.content?.required || false}
                        onChange={(e) => updateRule('content.required', e.target.checked)}
                        className="w-4 h-4 text-aquila-cyan bg-aquila-bg border-aquila-border rounded focus:ring-aquila-cyan"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Min Length</label>
                      <input
                        type="number"
                        value={brexRules.content?.minLength || 10}
                        onChange={(e) => updateRule('content.minLength', parseInt(e.target.value))}
                        className="w-full aquila-input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Max Length</label>
                      <input
                        type="number"
                        value={brexRules.content?.maxLength || 50000}
                        onChange={(e) => updateRule('content.maxLength', parseInt(e.target.value))}
                        className="w-full aquila-input"
                      />
                    </div>
                  </div>
                </div>

                {/* STE Rules */}
                <div className="aquila-card">
                  <h3 className="text-lg font-semibold mb-4">STE Rules</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Minimum Score</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={brexRules.ste?.minScore || 0.85}
                        onChange={(e) => updateRule('ste.minScore', parseFloat(e.target.value))}
                        className="w-full aquila-input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Warning Below Score</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={brexRules.ste?.warnBelowScore || 0.90}
                        onChange={(e) => updateRule('ste.warnBelowScore', parseFloat(e.target.value))}
                        className="w-full aquila-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Reference Rules */}
                <div className="aquila-card">
                  <h3 className="text-lg font-semibold mb-4">Reference Rules</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Validate DM Refs</label>
                      <input
                        type="checkbox"
                        checked={brexRules.references?.validateDMRefs || false}
                        onChange={(e) => updateRule('references.validateDMRefs', e.target.checked)}
                        className="w-4 h-4 text-aquila-cyan bg-aquila-bg border-aquila-border rounded focus:ring-aquila-cyan"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Validate ICN Refs</label>
                      <input
                        type="checkbox"
                        checked={brexRules.references?.validateICNRefs || false}
                        onChange={(e) => updateRule('references.validateICNRefs', e.target.checked)}
                        className="w-4 h-4 text-aquila-cyan bg-aquila-bg border-aquila-border rounded focus:ring-aquila-cyan"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Allow Broken Refs</label>
                      <input
                        type="checkbox"
                        checked={brexRules.references?.allowBrokenRefs || false}
                        onChange={(e) => updateRule('references.allowBrokenRefs', e.target.checked)}
                        className="w-4 h-4 text-aquila-cyan bg-aquila-bg border-aquila-border rounded focus:ring-aquila-cyan"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Validation Results */}
          <div className="aquila-card">
            <h3 className="text-lg font-semibold mb-4">Validation Results</h3>
            <div className="space-y-2 max-h-96 overflow-auto">
              {dataModules.map((dm) => (
                <div key={dm.dmc} className="p-2 bg-aquila-hover rounded">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      dm.validation_status === 'green' ? 'bg-aquila-led-green' :
                      dm.validation_status === 'amber' ? 'bg-aquila-led-amber' :
                      dm.validation_status === 'red' ? 'bg-aquila-led-red' : 
                      'bg-aquila-text-muted'
                    }`}></div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{dm.title}</div>
                      <div className="text-xs text-aquila-text-muted">{dm.dmc}</div>
                    </div>
                  </div>
                  
                  {validationResults[dm.dmc] && validationResults[dm.dmc].errors.length > 0 && (
                    <div className="mt-2 text-xs text-red-400">
                      {validationResults[dm.dmc].errors.map((error, index) => (
                        <div key={index}>• {error}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BREXDesigner;