import React, { useEffect, useRef } from 'react';
import { useDisper } from '../../context/DisperContext';
import { Button } from '../../components/Button/Button';
import { useParams } from 'react-router';

interface DisperSettingsSaveProps {
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const DisperSettingsSave: React.FC<DisperSettingsSaveProps> = ({
  className = 'btn-sm',
  variant = 'primary',
  size = 'md',
  fullWidth = false,
}) => {

  const loadedProjectIdRef = useRef<string | null>(null);
  const { saveSettings, loadSettings } = useDisper();
  const { projectId } = useParams<{ projectId: string }>();
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = async () => {
    if (!projectId) {
      console.error("No project ID available");
      return;
    }
    
    setIsSaving(true);
    try {
      await saveSettings(projectId);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoad = async () => {
    if (!projectId) {
      console.error("No project ID available");
      return;
    }
    
    try {
      await loadSettings(projectId);
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  useEffect(() => {
    if (projectId && projectId!==loadedProjectIdRef.current) {
        handleLoad();
        loadedProjectIdRef.current = projectId;
    }
  }, [projectId]);

  return (
    <div className="d-flex gap-2">
      <Button
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        className={className}
        onClick={handleSave}
        disabled={isSaving}
      >
        {isSaving ? 'Saving...' : 'Save Disper Settings'}
      </Button>
      {/* <Button
        variant="secondary"
        size={size}
        fullWidth={fullWidth}
        className={className}
        onClick={handleLoad}
      >
        Load Settings
      </Button> */}
    </div>
  );
};

export default DisperSettingsSave;