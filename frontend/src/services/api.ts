import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
});

export const processGrids = async (
  sgyFiles: File[],
  geometryData: string,
  maxSlowness: number,
  maxFrequency: number,
  numSlowPoints: number,
  numFreqPoints: number,
  returnFreqAndSlow: boolean = true
) => {
  const formData = new FormData();
  
  sgyFiles.forEach(file => {
    formData.append('sgy_files', file);
  });
  
  formData.append('geometry_data', geometryData);
  formData.append('max_slowness', maxSlowness.toString());
  formData.append('max_frequency', maxFrequency.toString());
  formData.append('num_slow_points', numSlowPoints.toString());
  formData.append('num_freq_points', numFreqPoints.toString());
  formData.append('return_freq_and_slow', returnFreqAndSlow.toString());
  
  return api.post('/process/grids', formData);
};

export const processSingleGrid = async (
  sgyFile: File,
  geometryData: string,
  maxSlowness: number,
  maxFrequency: number,
  numSlowPoints: number,
  numFreqPoints: number
) => {
  const formData = new FormData();
  
  formData.append('sgy_file', sgyFile);
  formData.append('geometry_data', geometryData);
  formData.append('max_slowness', maxSlowness.toString());
  formData.append('max_frequency', maxFrequency.toString());
  formData.append('num_slow_points', numSlowPoints.toString());
  formData.append('num_freq_points', numFreqPoints.toString());
  
  return api.post('/process/grid', formData);
};

export const processFrequencyWithSgy = async (
  sgyFile: File,
  maxFrequency: number,
  numFreqPoints: number
) => {
  const formData = new FormData();
  
  formData.append('sgy_file', sgyFile);
  formData.append('max_frequency', maxFrequency.toString());
  formData.append('num_freq_points', numFreqPoints.toString());
  
  return api.post('/process/frequency_with_sgy', formData);
};

export const processFrequencyWithParams = async (
  nSamples: number,
  sampleRate: number,
  maxFrequency: number,
  numFreqPoints: number
) => {
  const formData = new FormData();
  
  formData.append('n_samples', nSamples.toString());
  formData.append('sample_rate', sampleRate.toString());
  formData.append('max_frequency', maxFrequency.toString());
  formData.append('num_freq_points', numFreqPoints.toString());
  
  return api.post('/process/frequency_with_params', formData);
};

export const processSlownessWithParams = async (
  maxSlow: number,
  numSlowPoints: number
) => {
  const formData = new FormData();
  
  formData.append('max_slow', maxSlow.toString());
  formData.append('num_slow_points', numSlowPoints.toString());
  
  return api.post('/process/frequency_with_params', formData);
};

export const saveVelocityModel = async (projectId: string, modelData: any) => {
  return api.post(`/project/${projectId}/model`, modelData);
};

export const getVelocityModel = async (projectId: string) => {
  return api.get(`/project/${projectId}/model`);
};
