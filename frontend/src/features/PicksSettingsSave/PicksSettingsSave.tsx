import React, { useEffect, useRef } from 'react';
import { Button } from '../../components/Button/Button';
import { useParams } from 'react-router';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { saveOptionsByProjectId } from '../../store/thunks/cacheThunks';
import { savePicksByProjectId } from "../../store/thunks/cacheThunks";
import { 
    fetchOptionsByProjectId, 
    fetchGridsByProjectId, 
    fetchPicksByProjectId 
} from '../../store/thunks/cacheThunks';

interface PicksSettingsSaveProps {
    className?: string;
    variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
}

export const PicksSettingsSave: React.FC<PicksSettingsSaveProps> = ({
    className = 'btn-sm',
    variant = 'primary',
    size = 'md',
    fullWidth = false,
}) => {
    const dispatch = useAppDispatch();
    const initialFetchDone = useRef(false);
    const { projectId } = useParams<{ projectId: string }>();
    const [isSaving, setIsSaving] = React.useState(false);

    const handleSave = async () => {
        if (!projectId) {
            console.error("No project ID available");
            return;
        }

        setIsSaving(true);
        try {
            dispatch(saveOptionsByProjectId(projectId));
            dispatch(savePicksByProjectId(projectId))
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            
            if ((event.ctrlKey || event.metaKey) && event.key === 's') {
                event.preventDefault();
                handleSave();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [projectId]);

    useEffect(() => {
        if (projectId === undefined) return;

        if (!initialFetchDone.current) {
            const fetchProjectDataById = async () => {
                dispatch(fetchOptionsByProjectId(projectId))
                dispatch(fetchGridsByProjectId(projectId));
                dispatch(fetchPicksByProjectId(projectId));
            }

            fetchProjectDataById();
            initialFetchDone.current = true;
        }
    }, [projectId])

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
                {isSaving ? 'Saving...' : 'Save Picks Settings'}
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

export default PicksSettingsSave;
