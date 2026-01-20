# Build Instructions for Mac

Run these commands on your Mac to build a fresh DMG with all the new local model support features:

```bash
# 1. Navigate to the project directory
cd /path/to/env-desktop

# 2. Make sure you're on the correct branch
git checkout claude/add-local-model-support-3Vb1m

# 3. Pull the latest changes (if needed)
git pull origin claude/add-local-model-support-3Vb1m

# 4. Clean everything
rm -rf build dist node_modules/.cache

# 5. Rebuild React app from scratch
npm run react-build

# 6. Build the DMG
electron-builder --mac dmg
```

The DMG will be in the `dist` folder.

## What's New

The built app will have:

1. **Cloud/Local Toggle** in model dropdown (☁️ Cloud / 🖥️ Local buttons)
2. **Two types of local models**:
   - **🔧 Ollama (External)**: DeepSeek V3.2, GLM-4.7, Qwen 2.5 Coder, Llama 3.2
   - **⚡ Transformers.js (Bundled)**: Phi-3 Mini, Qwen 2.5 (0.5B), SmolLM (135M)
3. **Settings Panel** with:
   - Ollama connection checker
   - Download/Delete buttons for Ollama models
   - Progress bars for model downloads
   - Auto-download info for Transformers.js models

## Expected File Size

The DMG should be around **436 MB** (increased from 401 MB due to Transformers.js library).
