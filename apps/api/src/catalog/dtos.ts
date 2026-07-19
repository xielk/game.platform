import { IsArray, IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, Matches, Min } from 'class-validator';

export const stableId = /^[a-z0-9_]+$/;

export class GameDto {
  @IsString() @Matches(stableId) gameId!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(['draft', 'published', 'archived']) status?: string;
}
export class LevelDto {
  @IsString() @Matches(stableId) levelId!: string;
  @IsString() @Matches(stableId) gameId!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsObject() config?: Record<string, unknown>;
}
export class AssetTypeDto {
  @IsString() @Matches(stableId) typeId!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsArray() allowedMimeTypes?: string[];
  @IsOptional() @IsBoolean() isEnabled?: boolean;
}
export class AssetDto {
  @IsString() @Matches(stableId) assetId!: string;
  @IsString() @Matches(stableId) gameId!: string;
  @IsString() @Matches(stableId) typeId!: string;
  @IsString() displayName!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() tags?: string[];
  @IsOptional() @IsIn(['draft', 'review', 'published', 'deprecated']) status?: string;
}
export class AssetVersionDto {
  @IsOptional() @IsInt() @Min(1) parentVersionNumber?: number;
  @IsOptional() @IsObject() designSpec?: Record<string, unknown>;
  @IsOptional() @IsString() prompt?: string;
  @IsOptional() @IsString() negativePrompt?: string;
}
export class StyleDto {
  @IsString() @Matches(stableId) styleId!: string;
  @IsString() styleName!: string;
  @IsString() @Matches(stableId) gameId!: string;
  @IsOptional() @IsString() cameraAngle?: string;
  @IsOptional() @IsString() perspective?: string;
  @IsOptional() @IsString() artStyle?: string;
  @IsOptional() @IsString() outlineStyle?: string;
  @IsOptional() @IsArray() colorPalette?: string[];
  @IsOptional() @IsString() lightingDirection?: string;
  @IsOptional() @IsString() shadowStyle?: string;
  @IsOptional() @IsString() backgroundRequirement?: string;
  @IsOptional() @IsString() transparencyRequirement?: string;
  @IsOptional() @IsString() characterScale?: string;
  @IsOptional() @IsString() towerScale?: string;
  @IsOptional() @IsString() frameCanvasSize?: string;
  @IsOptional() @IsInt() tileSize?: number;
  @IsOptional() @IsInt() animationFpsDefault?: number;
  @IsOptional() @IsInt() directionCount?: number;
  @IsOptional() @IsString() promptPrefix?: string;
  @IsOptional() @IsString() negativePrompt?: string;
  @IsOptional() @IsArray() referenceImages?: string[];
}
export class RelationDto {
  @IsString() @Matches(stableId) sourceAssetId!: string;
  @IsString() @Matches(stableId) targetAssetId!: string;
  @IsString() relationType!: string;
  @IsOptional() @IsInt() sortOrder?: number;
}
export class LevelAssetDto {
  @IsString() @Matches(stableId) levelId!: string;
  @IsString() @Matches(stableId) assetId!: string;
  @IsOptional() @IsInt() versionNumber?: number;
  @IsOptional() @IsString() usage?: string;
  @IsOptional() @IsObject() config?: Record<string, unknown>;
}
