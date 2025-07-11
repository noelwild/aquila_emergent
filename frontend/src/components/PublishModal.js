import React, { useState } from 'react';
import { useAquila } from '../contexts/AquilaContext';
import { X, Download, Settings, FileText, Image, Package } from 'lucide-react';

const PublishModal = ({ onClose }) => {
  const { dataModules, icns, currentDataModule } = useAquila();
  const [publishConfig, setPublishConfig] = useState({
    variants: ['verbatim', 'ste'],
    formats: ['xml', 'html', 'pdf', 'docx'],
    scope: 'all-green',
    includeIllustrations: true,
    includeApplicability: true,
    securityLevel: 'UNCLASSIFIED',
    watermarkImages: true,
    generateDMRL: true,
    pushToCSDB: false
  });
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState(null);

  const handlePublish = async () => {
    setPublishing(true);
    setPublishResult(null);

    try {
      // Filter data modules based on scope
      let modulesToPublish = dataModules;
      if (publishConfig.scope === 'all-green') {
        modulesToPublish = dataModules.filter(dm => dm.validation_status === 'green');
      } else if (publishConfig.scope === 'current') {
        modulesToPublish = currentDataModule ? [currentDataModule] : [];
      }

      // Simulate publishing process
      const result = {
        success: true,
        modulesPublished: modulesToPublish.length,
        illustrationsIncluded: publishConfig.includeIllustrations ? icns.length : 0,
        formats: publishConfig.formats,
        variants: publishConfig.variants,
        packageSize: '45.2 MB',
        downloadUrl: '/download/publication-package.zip'
      };

      setPublishResult(result);
    } catch (error) {
      console.error('Error publishing:', error);
      setPublishResult({
        success: false,
        error: error.message
      });
    } finally {
      setPublishing(false);
    }
  };

  const handleDownload = () => {
    // Implement download functionality
    console.log('Downloading publication package...');
  };

  const getModuleCount = () => {
    if (publishConfig.scope === 'all-green') {
      return dataModules.filter(dm => dm.validation_status === 'green').length;
    } else if (publishConfig.scope === 'current') {
      return 1; // Current module
    }
    return dataModules.length;
  };

  return (
    <div className="aquila-modal" onClick={onClose}>
      <div className="aquila-modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Package size={20} />
            <h2 className="text-xl font-bold">Publish Package</h2>
          </div>
          <button
            onClick={onClose}
            className="aquila-icon-button p-2"
          >
            <X size={20} />
          </button>
        </div>

        {!publishResult ? (
          <div className="space-y-6">
            {/* Variants */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Variants</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={publishConfig.variants.includes('verbatim')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setPublishConfig(prev => ({
                          ...prev,
                          variants: [...prev.variants, 'verbatim']
                        }));
                      } else {
                        setPublishConfig(prev => ({
                          ...prev,
                          variants: prev.variants.filter(v => v !== 'verbatim')
                        }));
                      }
                    }}
                    className="w-4 h-4 text-aquila-cyan bg-aquila-bg border-aquila-border rounded focus:ring-aquila-cyan"
                  />
                  <span>Verbatim (InfoVariant 00)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={publishConfig.variants.includes('ste')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setPublishConfig(prev => ({
                          ...prev,
                          variants: [...prev.variants, 'ste']
                        }));
                      } else {
                        setPublishConfig(prev => ({
                          ...prev,
                          variants: prev.variants.filter(v => v !== 'ste')
                        }));
                      }
                    }}
                    className="w-4 h-4 text-aquila-cyan bg-aquila-bg border-aquila-border rounded focus:ring-aquila-cyan"
                  />
                  <span>STE (InfoVariant 01)</span>
                </label>
              </div>
            </div>

            {/* Formats */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Output Formats</h3>
              <div className="grid grid-cols-2 gap-2">
                {['xml', 'html', 'pdf', 'docx'].map(format => (
                  <label key={format} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={publishConfig.formats.includes(format)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setPublishConfig(prev => ({
                            ...prev,
                            formats: [...prev.formats, format]
                          }));
                        } else {
                          setPublishConfig(prev => ({
                            ...prev,
                            formats: prev.formats.filter(f => f !== format)
                          }));
                        }
                      }}
                      className="w-4 h-4 text-aquila-cyan bg-aquila-bg border-aquila-border rounded focus:ring-aquila-cyan"
                    />
                    <span className="uppercase">{format}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Scope */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Scope</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="scope"
                    value="all-green"
                    checked={publishConfig.scope === 'all-green'}
                    onChange={(e) => setPublishConfig(prev => ({ ...prev, scope: e.target.value }))}
                    className="w-4 h-4 text-aquila-cyan bg-aquila-bg border-aquila-border focus:ring-aquila-cyan"
                  />
                  <span>All Green DMs ({dataModules.filter(dm => dm.validation_status === 'green').length})</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="scope"
                    value="current"
                    checked={publishConfig.scope === 'current'}
                    onChange={(e) => setPublishConfig(prev => ({ ...prev, scope: e.target.value }))}
                    className="w-4 h-4 text-aquila-cyan bg-aquila-bg border-aquila-border focus:ring-aquila-cyan"
                  />
                  <span>Current Selection</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="scope"
                    value="all"
                    checked={publishConfig.scope === 'all'}
                    onChange={(e) => setPublishConfig(prev => ({ ...prev, scope: e.target.value }))}
                    className="w-4 h-4 text-aquila-cyan bg-aquila-bg border-aquila-border focus:ring-aquila-cyan"
                  />
                  <span>All DMs ({dataModules.length})</span>
                </label>
              </div>
            </div>

            {/* Additional Options */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Additional Options</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={publishConfig.includeIllustrations}
                    onChange={(e) => setPublishConfig(prev => ({ ...prev, includeIllustrations: e.target.checked }))}
                    className="w-4 h-4 text-aquila-cyan bg-aquila-bg border-aquila-border rounded focus:ring-aquila-cyan"
                  />
                  <span>Include Illustrations ({icns.length})</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={publishConfig.includeApplicability}
                    onChange={(e) => setPublishConfig(prev => ({ ...prev, includeApplicability: e.target.checked }))}
                    className="w-4 h-4 text-aquila-cyan bg-aquila-bg border-aquila-border rounded focus:ring-aquila-cyan"
                  />
                  <span>Include Applicability</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={publishConfig.watermarkImages}
                    onChange={(e) => setPublishConfig(prev => ({ ...prev, watermarkImages: e.target.checked }))}
                    className="w-4 h-4 text-aquila-cyan bg-aquila-bg border-aquila-border rounded focus:ring-aquila-cyan"
                  />
                  <span>Watermark Images</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={publishConfig.generateDMRL}
                    onChange={(e) => setPublishConfig(prev => ({ ...prev, generateDMRL: e.target.checked }))}
                    className="w-4 h-4 text-aquila-cyan bg-aquila-bg border-aquila-border rounded focus:ring-aquila-cyan"
                  />
                  <span>Generate DMRL Delta</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={publishConfig.pushToCSDB}
                    onChange={(e) => setPublishConfig(prev => ({ ...prev, pushToCSDB: e.target.checked }))}
                    className="w-4 h-4 text-aquila-cyan bg-aquila-bg border-aquila-border rounded focus:ring-aquila-cyan"
                  />
                  <span>Push to CSDB</span>
                </label>
              </div>
            </div>

            {/* Security Level */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Security Level</h3>
              <select
                value={publishConfig.securityLevel}
                onChange={(e) => setPublishConfig(prev => ({ ...prev, securityLevel: e.target.value }))}
                className="w-full aquila-select"
              >
                <option value="UNCLASSIFIED">UNCLASSIFIED</option>
                <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                <option value="SECRET">SECRET</option>
                <option value="TOP_SECRET">TOP SECRET</option>
              </select>
            </div>

            {/* Summary */}
            <div className="bg-aquila-hover rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">Publication Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-aquila-text-muted">Data Modules:</div>
                  <div className="font-medium">{getModuleCount()}</div>
                </div>
                <div>
                  <div className="text-aquila-text-muted">Illustrations:</div>
                  <div className="font-medium">{publishConfig.includeIllustrations ? icns.length : 0}</div>
                </div>
                <div>
                  <div className="text-aquila-text-muted">Variants:</div>
                  <div className="font-medium">{publishConfig.variants.join(', ')}</div>
                </div>
                <div>
                  <div className="text-aquila-text-muted">Formats:</div>
                  <div className="font-medium">{publishConfig.formats.join(', ').toUpperCase()}</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-aquila-border">
              <button
                onClick={onClose}
                className="aquila-button-secondary"
                disabled={publishing}
              >
                Cancel
              </button>
              <button
                onClick={handlePublish}
                disabled={publishing || publishConfig.variants.length === 0 || publishConfig.formats.length === 0}
                className="aquila-button"
              >
                {publishing ? (
                  <>
                    <div className="aquila-spinner w-4 h-4"></div>
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Package size={16} />
                    <span>Publish Package</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Publish Results */}
            {publishResult.success ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-aquila-led-green rounded-full flex items-center justify-center mx-auto mb-4">
                  <Download size={24} className="text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Publication Complete!</h3>
                <p className="text-aquila-text-muted mb-4">
                  Your publication package has been generated successfully.
                </p>
                
                <div className="bg-aquila-hover rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-aquila-text-muted">Data Modules:</div>
                      <div className="font-medium">{publishResult.modulesPublished}</div>
                    </div>
                    <div>
                      <div className="text-aquila-text-muted">Illustrations:</div>
                      <div className="font-medium">{publishResult.illustrationsIncluded}</div>
                    </div>
                    <div>
                      <div className="text-aquila-text-muted">Package Size:</div>
                      <div className="font-medium">{publishResult.packageSize}</div>
                    </div>
                    <div>
                      <div className="text-aquila-text-muted">Formats:</div>
                      <div className="font-medium">{publishResult.formats.join(', ').toUpperCase()}</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-center gap-3">
                  <button
                    onClick={onClose}
                    className="aquila-button-secondary"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleDownload}
                    className="aquila-button"
                  >
                    <Download size={16} />
                    <span>Download Package</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 bg-aquila-led-red rounded-full flex items-center justify-center mx-auto mb-4">
                  <X size={24} className="text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Publication Failed</h3>
                <p className="text-aquila-text-muted mb-4">
                  There was an error generating your publication package.
                </p>
                <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 mb-6">
                  <p className="text-red-300 text-sm">{publishResult.error}</p>
                </div>
                <button
                  onClick={onClose}
                  className="aquila-button-secondary"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublishModal;