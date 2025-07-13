import React, { useState, useEffect } from 'react';
import { useAquila } from '../contexts/AquilaContext';
import { FileText, Plus, Save, Eye, Download, Trash2, GripVertical } from 'lucide-react';
import { api } from '../lib/api';

const PMBuilder = () => {
  const { dataModules } = useAquila();
  const [publicationModules, setPublicationModules] = useState([]);
  const [selectedPM, setSelectedPM] = useState(null);
  const [pmStructure, setPmStructure] = useState({});
  const [availableModules, setAvailableModules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadPublicationModules();
    setAvailableModules(dataModules);
  }, [dataModules]);

  const loadPublicationModules = async () => {
    try {
      const { data } = await api.get('/api/publication-modules');
      setPublicationModules(data);
    } catch (error) {
      console.error('Error loading publication modules:', error);
    }
  };

  const createNewPM = () => {
    const newPM = {
      pm_code: `PM-${Date.now()}`,
      title: 'New Publication Module',
      dm_list: [],
      structure: {
        chapters: [
          {
            id: 'chapter-1',
            title: 'Chapter 1',
            sections: []
          }
        ]
      },
      status: 'draft'
    };
    setSelectedPM(newPM);
    setPmStructure(newPM.structure);
  };

  const savePM = async () => {
    if (!selectedPM) return;

    setLoading(true);
    try {
      const pmData = {
        ...selectedPM,
        structure: pmStructure
      };

      await api.post('/api/publication-modules', pmData);
      await loadPublicationModules();
    } catch (error) {
      console.error('Error saving PM:', error);
    } finally {
      setLoading(false);
    }
  };

  const addChapter = () => {
    const newChapter = {
      id: `chapter-${Date.now()}`,
      title: `Chapter ${pmStructure.chapters.length + 1}`,
      sections: []
    };
    setPmStructure(prev => ({
      ...prev,
      chapters: [...prev.chapters, newChapter]
    }));
  };

  const addSection = (chapterId) => {
    const newSection = {
      id: `section-${Date.now()}`,
      title: 'New Section',
      dataModules: []
    };
    setPmStructure(prev => ({
      ...prev,
      chapters: prev.chapters.map(chapter => 
        chapter.id === chapterId 
          ? { ...chapter, sections: [...chapter.sections, newSection] }
          : chapter
      )
    }));
  };

  const addDataModuleToSection = (chapterId, sectionId, dmcCode) => {
    const dataModule = dataModules.find(dm => dm.dmc === dmcCode);
    if (!dataModule) return;

    setPmStructure(prev => ({
      ...prev,
      chapters: prev.chapters.map(chapter => 
        chapter.id === chapterId 
          ? {
              ...chapter,
              sections: chapter.sections.map(section =>
                section.id === sectionId
                  ? { ...section, dataModules: [...section.dataModules, dataModule] }
                  : section
              )
            }
          : chapter
      )
    }));
  };

  const removeDataModule = (chapterId, sectionId, dmcCode) => {
    setPmStructure(prev => ({
      ...prev,
      chapters: prev.chapters.map(chapter => 
        chapter.id === chapterId 
          ? {
              ...chapter,
              sections: chapter.sections.map(section =>
                section.id === sectionId
                  ? { ...section, dataModules: section.dataModules.filter(dm => dm.dmc !== dmcCode) }
                  : section
              )
            }
          : chapter
      )
    }));
  };

  const updateChapterTitle = (chapterId, title) => {
    setPmStructure(prev => ({
      ...prev,
      chapters: prev.chapters.map(chapter =>
        chapter.id === chapterId ? { ...chapter, title } : chapter
      )
    }));
  };

  const updateSectionTitle = (chapterId, sectionId, title) => {
    setPmStructure(prev => ({
      ...prev,
      chapters: prev.chapters.map(chapter =>
        chapter.id === chapterId
          ? {
              ...chapter,
              sections: chapter.sections.map(section =>
                section.id === sectionId ? { ...section, title } : section
              )
            }
          : chapter
      )
    }));
  };

  const publishPM = async () => {
    if (!selectedPM) return;

    setLoading(true);
    try {
      const { data } = await api.post(
        `/api/publication-modules/${selectedPM.pm_code}/publish`,
        {
          formats: ['xml', 'html', 'pdf'],
          variants: ['verbatim', 'ste'],
        }
      );
      console.log('Publication result:', data);
    } catch (error) {
      console.error('Error publishing PM:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex">
      {/* PM List */}
      <div className="w-1/4 border-r border-aquila-border overflow-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Publication Modules</h2>
            <button
              onClick={createNewPM}
              className="aquila-button-secondary"
            >
              <Plus size={16} />
            </button>
          </div>
          
          <div className="space-y-2">
            {publicationModules.map((pm) => (
              <div
                key={pm.pm_code}
                className={`aquila-tree-item cursor-pointer ${
                  selectedPM?.pm_code === pm.pm_code ? 'selected' : ''
                }`}
                onClick={() => {
                  setSelectedPM(pm);
                  setPmStructure(pm.structure || { chapters: [] });
                }}
              >
                <div className="flex items-center gap-2 flex-1">
                  <FileText size={16} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{pm.title}</div>
                    <div className="text-xs text-aquila-text-muted truncate">{pm.pm_code}</div>
                  </div>
                  <div className="text-xs text-aquila-text-muted">
                    {pm.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PM Builder */}
      <div className="flex-1 flex flex-col">
        {selectedPM ? (
          <>
            {/* Header */}
            <div className="aquila-panel-header">
              <div className="flex items-center gap-2">
                <FileText size={20} />
                <input
                  type="text"
                  value={selectedPM.title}
                  onChange={(e) => setSelectedPM(prev => ({ ...prev, title: e.target.value }))}
                  className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-aquila-cyan rounded px-2"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="aquila-button-secondary"
                >
                  <Eye size={16} />
                  <span>Preview</span>
                </button>
                <button
                  onClick={savePM}
                  disabled={loading}
                  className="aquila-button-secondary"
                >
                  <Save size={16} />
                  <span>Save</span>
                </button>
                <button
                  onClick={publishPM}
                  disabled={loading}
                  className="aquila-button"
                >
                  <Download size={16} />
                  <span>Publish</span>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex">
              {/* Structure Builder */}
              <div className="flex-1 p-4 overflow-auto">
                <div className="space-y-4">
                  {pmStructure.chapters?.map((chapter) => (
                    <div key={chapter.id} className="aquila-card">
                      <div className="flex items-center gap-2 mb-3">
                        <GripVertical size={16} className="text-aquila-text-muted" />
                        <input
                          type="text"
                          value={chapter.title}
                          onChange={(e) => updateChapterTitle(chapter.id, e.target.value)}
                          className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-aquila-cyan rounded px-2"
                        />
                        <button
                          onClick={() => addSection(chapter.id)}
                          className="aquila-button-secondary text-xs px-2 py-1 ml-auto"
                        >
                          <Plus size={12} />
                          <span>Add Section</span>
                        </button>
                      </div>

                      <div className="space-y-3 ml-6">
                        {chapter.sections.map((section) => (
                          <div key={section.id} className="border-l-2 border-aquila-border pl-4">
                            <div className="flex items-center gap-2 mb-2">
                              <input
                                type="text"
                                value={section.title}
                                onChange={(e) => updateSectionTitle(chapter.id, section.id, e.target.value)}
                                className="font-medium bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-aquila-cyan rounded px-2"
                              />
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    addDataModuleToSection(chapter.id, section.id, e.target.value);
                                    e.target.value = '';
                                  }
                                }}
                                className="aquila-select text-xs ml-auto"
                              >
                                <option value="">Add Data Module</option>
                                {availableModules.map((dm) => (
                                  <option key={dm.dmc} value={dm.dmc}>
                                    {dm.title} ({dm.dmc})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-2">
                              {section.dataModules?.map((dm) => (
                                <div key={dm.dmc} className="flex items-center gap-2 p-2 bg-aquila-hover rounded">
                                  <div className="flex-1">
                                    <div className="text-sm font-medium">{dm.title}</div>
                                    <div className="text-xs text-aquila-text-muted">{dm.dmc}</div>
                                  </div>
                                  <button
                                    onClick={() => removeDataModule(chapter.id, section.id, dm.dmc)}
                                    className="aquila-icon-button p-1 text-red-400"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={addChapter}
                    className="w-full aquila-button-secondary border-2 border-dashed border-aquila-border hover:border-aquila-cyan"
                  >
                    <Plus size={16} />
                    <span>Add Chapter</span>
                  </button>
                </div>
              </div>

              {/* Preview Panel */}
              {showPreview && (
                <div className="w-1/3 border-l border-aquila-border p-4">
                  <h3 className="text-lg font-semibold mb-4">Preview</h3>
                  <div className="space-y-4">
                    <div className="aquila-card">
                      <h4 className="font-medium mb-2">Publication Module</h4>
                      <div className="text-sm space-y-1">
                        <div><strong>Code:</strong> {selectedPM.pm_code}</div>
                        <div><strong>Title:</strong> {selectedPM.title}</div>
                        <div><strong>Status:</strong> {selectedPM.status}</div>
                      </div>
                    </div>

                    <div className="aquila-card">
                      <h4 className="font-medium mb-2">Structure</h4>
                      <div className="text-sm space-y-2">
                        {pmStructure.chapters?.map((chapter) => (
                          <div key={chapter.id}>
                            <div className="font-medium">{chapter.title}</div>
                            <div className="ml-4 space-y-1">
                              {chapter.sections.map((section) => (
                                <div key={section.id}>
                                  <div className="text-aquila-text-muted">{section.title}</div>
                                  <div className="ml-4 space-y-1">
                                    {section.dataModules?.map((dm) => (
                                      <div key={dm.dmc} className="text-xs text-aquila-text-muted">
                                        • {dm.title}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-aquila-text-muted">
            <div className="text-center">
              <FileText size={64} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg">Create or Select a Publication Module</p>
              <p className="text-sm">Build structured technical publications from your data modules</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PMBuilder;