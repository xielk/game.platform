import { create } from 'zustand';

type StudioState = { collapsed: boolean; setCollapsed: (value: boolean) => void; assetView: 'grid' | 'table'; setAssetView: (value: 'grid' | 'table') => void };
export const useStudioStore = create<StudioState>((set) => ({ collapsed: false, setCollapsed: (collapsed) => set({ collapsed }), assetView: 'grid', setAssetView: (assetView) => set({ assetView }) }));
