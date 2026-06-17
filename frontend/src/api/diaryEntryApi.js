import apiClient from './axiosConfig';

export const getEntries = (recruitId) =>
  apiClient.get(`/recruits/${recruitId}/entries`);

export const getEntry = (id) => apiClient.get(`/entries/${id}`);

export const createEntry = (recruitId, data) =>
  apiClient.post(`/recruits/${recruitId}/entries`, data);

export const updateEntry = (id, data) => apiClient.put(`/entries/${id}`, data);

export const deleteEntry = (id) => apiClient.delete(`/entries/${id}`);
