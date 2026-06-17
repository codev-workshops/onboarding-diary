import apiClient from './axiosConfig';

export const getTags = () => apiClient.get('/tags');
