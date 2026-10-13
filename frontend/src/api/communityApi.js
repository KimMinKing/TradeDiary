import api from './authApi';

export const getCommunityPosts = (page = 0) => api.get('/api/community/posts', { params: { page, size: 20 } });
export const getCommunityPost = (id) => api.get(`/api/community/posts/${id}`);
export const createCommunityPost = (payload) => api.post('/api/community/posts', payload);
export const updateCommunityPost = (id, payload) => api.put(`/api/community/posts/${id}`, payload);
export const deleteCommunityPost = (id) => api.delete(`/api/community/posts/${id}`);
export const createCommunityComment = (postId, content) => api.post(`/api/community/posts/${postId}/comments`, { content });
export const deleteCommunityComment = (id) => api.delete(`/api/community/comments/${id}`);
