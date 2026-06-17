import api from './axiosConfig';

export const getUsers = () => api.get('/admin/users');
export const getUser = (id) => api.get(`/admin/users/${id}`);
export const updateUser = (id, data) => api.put(`/admin/users/${id}`, data);
export const deactivateUser = (id) => api.delete(`/admin/users/${id}`);
export const getAssignments = () => api.get('/admin/assignments');
export const createAssignment = (data) => api.post('/admin/assignments', data);
export const removeAssignment = (id) => api.delete(`/admin/assignments/${id}`);
export const getRecruitsForManager = (managerId) => api.get(`/admin/managers/${managerId}/recruits`);
