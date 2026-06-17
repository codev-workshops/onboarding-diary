import api from './axiosConfig';

export const getIssues = (params) => api.get('/issues', { params });
export const getIssue = (id) => api.get(`/issues/${id}`);
export const createIssue = (data) => api.post('/issues', data);
export const updateIssue = (id, data) => api.put(`/issues/${id}`, data);
export const deleteIssue = (id) => api.delete(`/issues/${id}`);
export const getRecruitIssues = (recruitId) => api.get(`/recruits/${recruitId}/issues`);
