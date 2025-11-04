# Tauri Icons

This directory should contain the app icons for Tauri builds.

Required icon files:
- `32x32.png` - 32x32 pixel PNG
- `128x128.png` - 128x128 pixel PNG  
- `128x128@2x.png` - 256x256 pixel PNG (2x retina)
- `icon.icns` - macOS icon file
- `icon.ico` - Windows icon file

## Generating Icons

You can generate these icons using:

1. **Tauri Icon Generator**: 
   ```bash
   npx @tauri-apps/cli icon <path-to-your-icon.png>
   ```

2. **Manual creation**: Create a 1024x1024 PNG icon and use online tools or image editors to generate the required formats.

For Phase 1, placeholder icons are acceptable. The app will still build and run without custom icons (Tauri will use defaults).

