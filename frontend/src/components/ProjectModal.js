import React, { useState } from 'react';
import { useAquila } from '../contexts/AquilaContext';
import { X, FolderPlus } from 'lucide-react';

const ProjectModal = ({ onClose }) => {
  const { projectName, createProject, selectProject, getProjectList } = useAquila();
  const [newProject, setNewProject] = useState('');
  const projects = getProjectList();

  const handleCreate = () => {
    const name = newProject.trim();
    if (name) {
      createProject(name);
      onClose();
    }
  };

  return (
    <div className="aquila-modal" onClick={onClose}>
      <div className="aquila-modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FolderPlus size={20} />
            <h2 className="text-xl font-bold">Projects</h2>
          </div>
          <button onClick={onClose} className="aquila-icon-button p-2">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Select Project</h3>
            <div className="space-y-2">
              {projects.map(p => (
                <button
                  key={p}
                  onClick={() => { selectProject(p); onClose(); }}
                  className={`aquila-button-secondary w-full ${projectName === p ? 'bg-aquila-cyan text-white' : ''}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-aquila-border pt-4">
            <h3 className="text-lg font-semibold mb-2">New Project</h3>
            <input
              type="text"
              className="w-full aquila-input mb-2"
              placeholder="Project name"
              value={newProject}
              onChange={(e) => setNewProject(e.target.value)}
            />
            <button onClick={handleCreate} className="aquila-button w-full">
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectModal;
