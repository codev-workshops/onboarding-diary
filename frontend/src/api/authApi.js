import api from './axiosConfig';

export const signup = (data) => api.post('/auth/signup', data);
export const login = (email, password) => api.post('/auth/login', { email, password });
