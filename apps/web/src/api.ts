import axios from 'axios';

export const api = axios.create({ baseURL: '/api', timeout: 30000 });
api.interceptors.request.use((config) => { const token = localStorage.getItem('studio-token'); if (token) config.headers['x-admin-token'] = token; return config; });

export type Game = { id: string; gameId: string; name: string; description?: string; status: string; _count?: { levels: number; assets: number } };
export type Level = { id: string; levelId: string; name: string; game: Game; status: string; sortOrder: number; _count?: { assets: number } };
export type AssetType = { id: string; typeId: string; name: string; category?: string; isEnabled: boolean };
export type Asset = { id: string; assetId: string; displayName: string; description?: string; status: string; tags?: string[]; game: Game; assetType: AssetType; versions: any[]; levelLinks?: any[]; _count?: { incoming: number; outgoing: number } };
export type StyleProfile = { id: string; styleId: string; styleName: string; game: Game; version: number; cameraAngle?: string; artStyle?: string; colorPalette?: string[]; directionCount?: number; frameCanvasSize?: string; promptPrefix?: string; negativePrompt?: string };

export const unwrapError = (error: any) => Array.isArray(error?.response?.data?.message) ? error.response.data.message.join('；') : error?.response?.data?.message || error?.message || '请求失败';
