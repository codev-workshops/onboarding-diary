import api from './axiosConfig';

export const getFeedback = (params) => api.get('/feedback', { params });
export const getFeedbackById = (id) => api.get(`/feedback/${id}`);
export const createFeedback = (data) => api.post('/feedback', data);
export const updateFeedback = (id, data) => api.put(`/feedback/${id}`, data);
export const deleteFeedback = (id) => api.delete(`/feedback/${id}`);
export const getRecruitFeedback = (recruitId) => api.get(`/recruits/${recruitId}/feedback`);
