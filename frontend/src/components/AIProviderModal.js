import React, { useState, useEffect } from 'react';
import { useAquila } from '../contexts/AquilaContext';
import { X, Cpu, Check, AlertCircle, Zap } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AIProviderModal = ({ onClose }) => {
  const { aiProviders, updateAIProviders } = useAquila();
  const [selectedTextProvider, setSelectedTextProvider] = useState(aiProviders.text);
  const [selectedVisionProvider, setSelectedVisionProvider] = useState(aiProviders.vision);
  const [providerConfig, setProviderConfig] = useState({});
  const [loading, setLoading] = useState(false);
  const [testingProvider, setTestingProvider] = useState(null);
  const [testResults, setTestResults] = useState({});

  useEffect(() => {
    loadProviderConfig();
  }, []);

  const loadProviderConfig = async () => {
    try {
      const response = await axios.get(`${API}/providers`);
      setProviderConfig(response.data.config);
    } catch (error) {
      console.error('Error loading provider config:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateAIProviders(selectedTextProvider, selectedVisionProvider);
      onClose();
    } catch (error) {
      console.error('Error updating providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const testTextProvider = async (provider) => {
    setTestingProvider(`text-${provider}`);
    try {
      const response = await axios.post(`${API}/test/text`, {
        text: "This is a test procedure for equipment maintenance. Step 1: Check power supply. Step 2: Inspect connections.",
        task_type: "classify"
      });
      setTestResults(prev => ({
        ...prev,
        [`text-${provider}`]: { success: true, data: response.data }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [`text-${provider}`]: { success: false, error: error.message }
      }));
    } finally {
      setTestingProvider(null);
    }
  };

  const testVisionProvider = async (provider) => {
    setTestingProvider(`vision-${provider}`);
    try {
      // Create a simple test image (1x1 pixel PNG base64)
      const testImage = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
      
      const response = await axios.post(`${API}/test/vision`, {
        image_data: testImage,
        task_type: "caption"
      });
      setTestResults(prev => ({
        ...prev,
        [`vision-${provider}`]: { success: true, data: response.data }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [`vision-${provider}`]: { success: false, error: error.message }
      }));
    } finally {
      setTestingProvider(null);
    }
  };

  const getProviderStatus = (provider, type) => {
    const key = `${type}_provider`;
    if (provider === 'openai') {
      return providerConfig.openai_available ? 'available' : 'unavailable';
    } else if (provider === 'anthropic') {
      return providerConfig.anthropic_available ? 'available' : 'unavailable';
    } else {
      return 'available'; // Local is always available
    }
  };

  const getProviderStatusIcon = (provider, type) => {
    const status = getProviderStatus(provider, type);
    switch (status) {
      case 'available':
        return <Check size={16} className="text-aquila-led-green" />;
      case 'unavailable':
        return <AlertCircle size={16} className="text-aquila-led-red" />;
      default:
        return <AlertCircle size={16} className="text-aquila-led-amber" />;
    }
  };

  const providers = [
    {
      id: 'openai',
      name: 'OpenAI',
      description: 'GPT-4o-mini for both text and vision processing',
      models: {
        text: 'gpt-4o-mini',
        vision: 'gpt-4o-mini'
      }
    },
    {
      id: 'anthropic',
      name: 'Anthropic',
      description: 'Claude-3-Sonnet for both text and vision processing',
      models: {
        text: 'claude-3-sonnet-20240229',
        vision: 'claude-3-sonnet-20240229'
      }
    },
    {
      id: 'local',
      name: 'Local Models',
      description: 'On-premise Qwen3-30B (text) and iDefics2-8B (vision)',
      models: {
        text: 'local-qwen3-30b',
        vision: 'local-idefics2-8b'
      }
    }
  ];

  return (
    <div className="aquila-modal" onClick={onClose}>
      <div className="aquila-modal-content max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Cpu size={20} />
            <h2 className="text-xl font-bold">AI Provider Configuration</h2>
          </div>
          <button
            onClick={onClose}
            className="aquila-icon-button p-2"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Current Configuration */}
          <div className="bg-aquila-hover rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Current Configuration</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-aquila-text-muted mb-2">
                  Text Provider
                </label>
                <div className="flex items-center gap-2">
                  {getProviderStatusIcon(aiProviders.text, 'text')}
                  <span className="capitalize">{aiProviders.text}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-aquila-text-muted mb-2">
                  Vision Provider
                </label>
                <div className="flex items-center gap-2">
                  {getProviderStatusIcon(aiProviders.vision, 'vision')}
                  <span className="capitalize">{aiProviders.vision}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Provider Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Select Providers</h3>
            
            <div className="grid grid-cols-1 gap-4">
              {providers.map((provider) => (
                <div key={provider.id} className="aquila-card">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-medium">{provider.name}</h4>
                        <div className="flex items-center gap-1">
                          {getProviderStatusIcon(provider.id, 'text')}
                          <span className="text-sm text-aquila-text-muted">
                            {getProviderStatus(provider.id, 'text')}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-aquila-text-muted mb-3">
                        {provider.description}
                      </p>
                      <div className="text-xs text-aquila-text-muted">
                        Text: {provider.models.text} • Vision: {provider.models.vision}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-4">
                      <div className="flex items-center gap-2">
                        <label className="text-sm">Text:</label>
                        <input
                          type="radio"
                          name="textProvider"
                          value={provider.id}
                          checked={selectedTextProvider === provider.id}
                          onChange={(e) => setSelectedTextProvider(e.target.value)}
                          disabled={getProviderStatus(provider.id, 'text') === 'unavailable'}
                          className="aquila-focus"
                        />
                        <button
                          onClick={() => testTextProvider(provider.id)}
                          disabled={testingProvider === `text-${provider.id}` || getProviderStatus(provider.id, 'text') === 'unavailable'}
                          className="aquila-button-secondary text-xs px-2 py-1"
                        >
                          {testingProvider === `text-${provider.id}` ? (
                            <div className="aquila-spinner w-3 h-3"></div>
                          ) : (
                            <Zap size={12} />
                          )}
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <label className="text-sm">Vision:</label>
                        <input
                          type="radio"
                          name="visionProvider"
                          value={provider.id}
                          checked={selectedVisionProvider === provider.id}
                          onChange={(e) => setSelectedVisionProvider(e.target.value)}
                          disabled={getProviderStatus(provider.id, 'vision') === 'unavailable'}
                          className="aquila-focus"
                        />
                        <button
                          onClick={() => testVisionProvider(provider.id)}
                          disabled={testingProvider === `vision-${provider.id}` || getProviderStatus(provider.id, 'vision') === 'unavailable'}
                          className="aquila-button-secondary text-xs px-2 py-1"
                        >
                          {testingProvider === `vision-${provider.id}` ? (
                            <div className="aquila-spinner w-3 h-3"></div>
                          ) : (
                            <Zap size={12} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Test Results */}
                  {(testResults[`text-${provider.id}`] || testResults[`vision-${provider.id}`]) && (
                    <div className="mt-4 space-y-2">
                      {testResults[`text-${provider.id}`] && (
                        <div className={`p-2 rounded text-xs ${
                          testResults[`text-${provider.id}`].success 
                            ? 'bg-green-900/20 text-green-300' 
                            : 'bg-red-900/20 text-red-300'
                        }`}>
                          <strong>Text Test:</strong> {
                            testResults[`text-${provider.id}`].success
                              ? 'Success'
                              : testResults[`text-${provider.id}`].error
                          }
                        </div>
                      )}
                      {testResults[`vision-${provider.id}`] && (
                        <div className={`p-2 rounded text-xs ${
                          testResults[`vision-${provider.id}`].success 
                            ? 'bg-green-900/20 text-green-300' 
                            : 'bg-red-900/20 text-red-300'
                        }`}>
                          <strong>Vision Test:</strong> {
                            testResults[`vision-${provider.id}`].success
                              ? 'Success'
                              : testResults[`vision-${provider.id}`].error
                          }
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-aquila-border">
            <button
              onClick={onClose}
              className="aquila-button-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
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
                  <Check size={16} />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIProviderModal;