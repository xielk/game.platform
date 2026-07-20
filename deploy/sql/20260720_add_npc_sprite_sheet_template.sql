SET NAMES utf8mb4;

INSERT INTO asset_types (type_id, name, category, allowed_mime_types, is_enabled, created_at, updated_at)
VALUES ('npc', 'NPC', 'character', '["image/png","application/json"]', 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  category = VALUES(category),
  allowed_mime_types = VALUES(allowed_mime_types),
  is_enabled = 1,
  updated_at = NOW(3);

SET @npc_asset_type_id = (
  SELECT id
  FROM asset_types
  WHERE type_id = 'npc'
  LIMIT 1
);

INSERT INTO prompt_templates (
  template_id,
  name,
  asset_type_id,
  template,
  variables,
  is_active,
  created_at,
  updated_at
)
VALUES (
  'npc_sprite_sheet_default_v1',
  'NPC Sprite Sheet 默认生成模板',
  @npc_asset_type_id,
  'Create a production-ready 2D tower defense NPC sprite sheet.

Canvas size: 1024x1024 pixels.
Layout: exactly 4 columns and 4 rows.
Frame size: exactly 256x256 pixels.
Total: exactly 16 animation frames.

Animation layout:
Frames 1-4: idle animation.
Frames 5-8: walking animation.
Frames 9-12: attack animation.
Frames 13-16: death animation.

Character name: {{characterName}}.
Character description: {{characterDescription}}.
Weapon type: {{weaponType}}.
Art style: {{artStyle}}.

Use the exact same character design, face, body proportions, clothing, colors and weapon in every frame.

Fixed 45-degree top-down game perspective, facing {{facing}}.
Keep the character centered in every frame.
Keep the feet aligned to the same baseline.
Keep identical camera angle, scale and lighting.

True transparent PNG background with alpha channel.
No checkerboard background.
No ground.
No shadow.
No text.
No numbers.
No labels.
No watermark.
No borders.
No grid lines.
No UI elements.

Make every animation frame cleanly separated inside its 256x256 cell, with no clipping or overlap.',
  JSON_OBJECT(
    'fields', JSON_ARRAY(
      JSON_OBJECT('key', 'characterName', 'label', '角色名称', 'type', 'string', 'required', true),
      JSON_OBJECT('key', 'characterDescription', 'label', '角色描述', 'type', 'text', 'required', true),
      JSON_OBJECT('key', 'weaponType', 'label', '武器类型', 'type', 'string', 'required', true),
      JSON_OBJECT('key', 'artStyle', 'label', '美术风格', 'type', 'string', 'required', false),
      JSON_OBJECT('key', 'facing', 'label', '朝向', 'type', 'enum', 'default', 'right', 'options', JSON_ARRAY('right', 'left')),
      JSON_OBJECT('key', 'sheetSize', 'label', '整图尺寸', 'type', 'string', 'default', '1024x1024', 'locked', true),
      JSON_OBJECT('key', 'frameSize', 'label', '单帧尺寸', 'type', 'string', 'default', '256x256', 'locked', true),
      JSON_OBJECT('key', 'animationFrameConfig', 'label', '动画帧配置', 'type', 'text', 'default', 'idle:0-3@6 loop; walk:4-7@8 loop; attack:8-11@10 once; die:12-15@7 once', 'locked', true),
      JSON_OBJECT('key', 'transparent', 'label', '是否透明背景', 'type', 'boolean', 'default', true, 'locked', true),
      JSON_OBJECT('key', 'removeShadow', 'label', '是否去除阴影', 'type', 'boolean', 'default', true, 'locked', true)
    ),
    'output', JSON_OBJECT(
      'imageFormat', 'PNG',
      'image', 'npc_sprite_sheet.png',
      'json', 'npc_sprite_sheet.json',
      'canvasWidth', 1024,
      'canvasHeight', 1024,
      'frameWidth', 256,
      'frameHeight', 256,
      'columns', 4,
      'rows', 4,
      'totalFrames', 16,
      'requiresAlphaChannel', true,
      'requiresTrueTransparentPixels', true,
      'previewGridOnly', true
    ),
    'animations', JSON_OBJECT(
      'idle', JSON_OBJECT('start', 0, 'end', 3, 'frameRate', 6, 'repeat', -1),
      'walk', JSON_OBJECT('start', 4, 'end', 7, 'frameRate', 8, 'repeat', -1),
      'attack', JSON_OBJECT('start', 8, 'end', 11, 'frameRate', 10, 'repeat', 0),
      'die', JSON_OBJECT('start', 12, 'end', 15, 'frameRate', 7, 'repeat', 0)
    ),
    'checks', JSON_ARRAY(
      'image_size_1024x1024',
      'png_alpha_channel',
      'true_transparent_background',
      'no_opaque_background',
      'slice_16_frames',
      'preview_idle_walk_attack_die',
      'reject_text_grid_lines_checkerboard'
    )
  ),
  1,
  NOW(3),
  NOW(3)
)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  asset_type_id = VALUES(asset_type_id),
  template = VALUES(template),
  variables = VALUES(variables),
  is_active = 1,
  updated_at = NOW(3),
  deleted_at = NULL;
