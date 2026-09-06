/**
 * Main Controller orchestrating Lifecycle & Events (Chat Edition)
 */
window.SatApp = {
  init() {
    this.handleModeChange('single');
    this.checkHealth();
    
    // --- Dynamic Cursor Glow Tracker (With Drag/Trail Effect) ---
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;

    // 1. Just record where the mouse *actually* is
    document.addEventListener('mousemove', (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
    });

    // 2. Animation loop that smoothly drags the glow toward the mouse
    const animateGlow = () => {
      // The '0.08' controls the drag amount. 
      // Lower = slower trailing effect. Higher = faster snap to cursor.
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;

      document.body.style.setProperty('--mouse-x', `${currentX}px`);
      document.body.style.setProperty('--mouse-y', `${currentY}px`);

      requestAnimationFrame(animateGlow);
    };
    
    // Start the animation loop
    animateGlow();
  },

  async checkHealth() {
    try {
      await window.SatApi.checkHealth();
      document.getElementById('sysDot').className = 'status-dot';
      document.getElementById('sysText').innerText = window.SAT_CONFIG.USE_MOCK_API ? 'Online (Mock)' : 'Backend Live';
    } catch {
      document.getElementById('sysDot').className = 'status-dot error';
      document.getElementById('sysText').innerText = 'Backend Offline';
    }
  },

  handleModeChange(mode) {
    if (window.SatState.isProcessing) return;
    window.SatState.selectedMode = mode;

    document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
    document.getElementById(`mode-${mode}`)?.classList.add('selected');

    window.SatUI.renderDropzones(mode);
    window.SatUI.renderPresets(mode);
    this.validateState();
  },

  handleFileDrop(e, key) {
    if (e.dataTransfer.files?.length) this.processFile(key, e.dataTransfer.files[0]);
  },

  handleFileSelect(e, key) {
    if (e.target.files?.length) this.processFile(key, e.target.files[0]);
  },

  async processFile(key, file) {
    const isTiff = file.name.endsWith('.tif') || file.name.endsWith('.tiff') || file.name.endsWith('.geotiff');
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    let previewUrl = '';

    if (isTiff && window.GeoTIFF) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
        const image = await tiff.getImage();
        const rgb = await image.readRGB();

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = image.getWidth();
        tempCanvas.height = image.getHeight();
        const ctx = tempCanvas.getContext('2d');
        const imgData = ctx.createImageData(tempCanvas.width, tempCanvas.height);

        for (let i = 0, j = 0; i < rgb.length; i += 3, j += 4) {
          imgData.data[j] = rgb[i];
          imgData.data[j + 1] = rgb[i + 1];
          imgData.data[j + 2] = rgb[i + 2];
          imgData.data[j + 3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);
        previewUrl = tempCanvas.toDataURL();
      } catch (err) {
        console.warn("GeoTIFF decoding fallback used", err);
      }
    }

    if (!previewUrl) {
      previewUrl = URL.createObjectURL(file);
    }

    const fileObj = { raw: file, name: file.name, size: `${sizeMB} MB`, isTiff, url: previewUrl };
    window.SatState.uploadedFiles[key] = fileObj;

    const img = new Image();
    img.src = previewUrl;
    img.onload = () => { window.SatState.previews[key] = img; };

    window.SatUI.showFilePreview(key, fileObj);
    window.SatUI.showToast(`Loaded ${file.name}`, 'info');
    this.validateState();
  },

  removeFile(key) {
    window.SatState.uploadedFiles[key] = null;
    delete window.SatState.previews[key];
    const cnt = document.getElementById(`cnt-${key}`);
    cnt?.querySelector('.file-preview')?.remove();
    document.getElementById(`dz-${key}`).style.display = 'flex';
    this.validateState();
  },

  validateState() {
    const q = document.getElementById('queryInput')?.value.trim() || '';
    const m = window.SatState.selectedMode;
    const f = window.SatState.uploadedFiles;

    let hasFiles = false;
    if (m === 'single' && (f.single || window.SatState.sessionHasImage)) hasFiles = true;
    if (m === 'bitemporal' && ((f.date1 && f.date2) || window.SatState.sessionHasImage)) hasFiles = true;
    if (m === 'crossmodal' && ((f.optical && f.sar) || window.SatState.sessionHasImage)) hasFiles = true;

    const ready = hasFiles && q.length > 2;
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) analyzeBtn.disabled = !ready || window.SatState.isProcessing;

    const hint = document.getElementById('statusHint');
    if (hint) hint.innerText = ready ? "Ready for follow-up query or report generation." : "Upload required images and enter a query.";
  },

  async runAnalysis() {
    const qInput = document.getElementById('queryInput');
    const q = qInput.value.trim();
    if (!q) return;

    window.SatState.isProcessing = true;
    const analyzeBtn = document.getElementById('analyzeBtn');
    const btnText = document.getElementById('btnText');
    const chatFeed = document.getElementById('chatFeed');
    
    analyzeBtn.disabled = true;
    btnText.innerText = "Dispatching...";
    document.getElementById('sysDot').className = "status-dot pulse";

    // 1. Snapshot currently uploaded files (or fall back to session-locked files for follow-ups)
    const activeFiles = { ...window.SatState.uploadedFiles };
    if (Object.keys(activeFiles).length > 0) {
      window.SatState.sessionHasImage = true;
      window.SatState.lastActiveFiles = activeFiles;
    } else if (window.SatState.lastActiveFiles) {
      Object.assign(activeFiles, window.SatState.lastActiveFiles);
    }

    // 2. Create User Bubble & Attach Image Previews with Lightbox Click
    const userTpl = document.getElementById('userMessageTemplate').content.cloneNode(true);
    userTpl.querySelector('.user-query-text').innerText = q;
    
    const thumbContainer = userTpl.querySelector('.user-attached-images');
    Object.values(activeFiles).forEach(fileObj => {
      if (fileObj && fileObj.url) {
        const thumb = document.createElement('img');
        thumb.className = 'user-thumb-preview';
        thumb.src = fileObj.url;
        thumb.onclick = () => window.SatUI.openLightbox(fileObj.url);
        thumbContainer.appendChild(thumb);
      }
    });

    chatFeed.appendChild(userTpl);

    // 3. Clear only the text input (KEEP files active so follow-up queries work without re-uploading)
    qInput.value = '';
    this.validateState();

    // 4. Create AI Bubble Wrapper
    const aiTpl = document.getElementById('aiResponseTemplate').content.cloneNode(true);
    const aiBlock = aiTpl.querySelector('.ai-block');
    chatFeed.appendChild(aiBlock);
    
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });

    try {
      const res = await window.SatApi.analyzeScene(window.SatState.selectedMode, q, activeFiles);
      window.SatState.latestResult = res;

      // Track session history for master report generation
      window.SatState.sessionTurns = window.SatState.sessionTurns || [];
      const turnImageUrls = Object.values(activeFiles).filter(f => f && f.url).map(f => f.url);
      window.SatState.sessionTurns.push({ query: q, result: res, images: turnImageUrls });

      // Ensure global singleton references point to the NEW blocks
      document.querySelectorAll('#visualCanvas').forEach(el => el.removeAttribute('id'));
      const activeCanvas = aiBlock.querySelector('.visual-canvas');
      if (activeCanvas) activeCanvas.id = 'visualCanvas';

      const statusText = aiBlock.querySelector('.status-text');
      if (statusText) statusText.style.display = 'none';
      
      const traceSec = aiBlock.querySelector('.trace-section');
      if (traceSec) traceSec.style.display = 'block';

      const resultSec = aiBlock.querySelector('.results-section');
      if (resultSec) resultSec.style.display = 'block';

      // Populate Synthesized Data & Metrics
      aiBlock.querySelector('.answer-text').innerText = res.answer;
      aiBlock.querySelector('.conf-val').innerText = `${res.confidence}%`;
      aiBlock.querySelector('.conf-fill').style.width = `${res.confidence}%`;
      aiBlock.querySelector('.model-tags').innerHTML = (res.models || []).map(m => `<span class="model-tag">${m}</span>`).join('');

      aiBlock.querySelector('#auditTask').innerText = res.task || (window.SatState.selectedMode.toUpperCase() + " ANALYSIS");
      aiBlock.querySelector('#auditLatency').innerText = res.latency || "1.24s";
      aiBlock.querySelector('#auditConf').innerText = `${res.confidence}%`;

      // Bind download button for this specific turn
      const downloadBtn = aiBlock.querySelector('.audit-download-btn');
      if (downloadBtn) {
        downloadBtn.onclick = () => window.SatApi.downloadReport(res, turnImageUrls);
      }

      window.SatState.previews = {};
      Object.keys(activeFiles).forEach(k => {
        if (activeFiles[k] && activeFiles[k].url) {
          const img = new Image();
          img.src = activeFiles[k].url;
          window.SatState.previews[k] = img;
        }
      });

      if(window.CanvasViewer) window.CanvasViewer.draw();

      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      window.SatUI.showToast("Agent pipeline complete", "success");

    } catch (err) {
      const statusText = aiBlock.querySelector('.status-text');
      if (statusText) {
        statusText.innerText = "❌ Task failed: " + (err.message || "Execution error");
        statusText.style.color = "var(--danger)";
      }
      window.SatUI.showToast(err.message || "Execution error", "error");
    } finally {
      window.SatState.isProcessing = false;
      btnText.innerText = "Analyze Scene";
      document.getElementById('sysDot').className = "status-dot";
      this.validateState();
    }
  }
};

window.addEventListener('DOMContentLoaded', () => window.SatApp.init());