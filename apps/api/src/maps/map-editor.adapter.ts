export interface MapDocument {
  format: 'tiled_json' | 'tiled_tmj' | 'studio';
  width: number;
  height: number;
  tileWidth?: number;
  tileHeight?: number;
  layers: unknown[];
  objects: unknown[];
  fileRefs: string[];
}

export interface MapValidationResult { valid: boolean; errors: Array<{ path: string; message: string }>; warnings: Array<{ path: string; message: string }>; }

export interface MapEditorAdapter<TExternal = unknown, TPreview = unknown> {
  importMap(source: TExternal): Promise<MapDocument>;
  exportMap(document: MapDocument): Promise<TExternal>;
  validateMap(document: MapDocument): Promise<MapValidationResult>;
  toPreviewScene(document: MapDocument): Promise<TPreview>;
}
