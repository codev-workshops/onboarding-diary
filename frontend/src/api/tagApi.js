import api from './axiosConfig';

export const getTags = () => api.get('/tags');
