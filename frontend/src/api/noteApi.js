import api from './axiosConfig';

export const getNotes = (params) => api.get('/notes', { params });
export const getNote = (id) => api.get(`/notes/${id}`);
export const createNote = (data) => api.post('/notes', data);
export const updateNote = (id, data) => api.put(`/notes/${id}`, data);
export const deleteNote = (id) => api.delete(`/notes/${id}`);
export const getRecruitNotes = (recruitId) => api.get(`/recruits/${recruitId}/notes`);
