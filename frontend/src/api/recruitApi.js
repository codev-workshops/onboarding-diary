import apiClient from './axiosConfig';

export const getRecruits = () => apiClient.get('/recruits');

export const getRecruit = (id) => apiClient.get(`/recruits/${id}`);

export const createRecruit = (data) => apiClient.post('/recruits', data);
