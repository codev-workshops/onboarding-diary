import api from './axiosConfig';

export const getDashboard = () => api.get('/dashboard');
