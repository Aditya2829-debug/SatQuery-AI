/**
 * UI Rendering & DOM Manipulation (Chat Edition)
 */
window.SatUI = {
  PRESETS: {
    single: [
      "Describe the land-cover and major objects visible in this image.",
      "Highlight the primary water body and calculate estimated coverage.",
      "Identify industrial buildings and cargo ships docked at the port."
    ],
    bitemporal: [
      "What changed between these two dates, and where did the change occur?",
      "Has the built-up urban area increased, decreased, or remained unchanged?"
    ],
    crossmodal: [
      "Use optical and SAR together to identify built-up and water-covered regions.",
      "Delineate flooded terrain hidden under cloud cover using SAR backscatter."
    ]
  },

  renderPresets(mode) {
    const p = document.getElementById('presetChips');
    if (!p) return;
    p.innerHTML = '<span class="preset-label">Prompts:</span>';
    
    (this.PRESETS[mode] || []).forEach(text => {
      const chip = document.createElement('span');
      chip.className = 'preset-chip';
      
      // Truncate text if it's longer than 35 characters and add ellipses
      const maxLength = 35;
      const displayText = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
      
      chip.innerText = displayText;
      chip.title = text; // Shows full text on hover
      
      chip.onclick = () => {
        document.getElementById('queryInput').value = text;
        window.SatApp.validateState();
      };
      p.appendChild(chip);
    });
  },

  renderDropzones(mode) {
    const c = document.getElementById('uploadZoneContainer');
    if (!c) return;
    c.className = `upload-grid ${mode === 'single' ? 'single' : 'dual'}`;

    if (mode === 'single') {
      c.innerHTML = this._dropzoneHTML('single', 'Satellite Image Asset (GeoTIFF / PNG)');
    } else if (mode === 'bitemporal') {
      c.innerHTML = this._dropzoneHTML('date1', 'Timestamp 1 (Date 1 Scene)') + this._dropzoneHTML('date2', 'Timestamp 2 (Date 2 Scene)');
    } else {
      c.innerHTML = this._dropzoneHTML('optical', 'Optical Sensor (RGB/NIR)') + this._dropzoneHTML('sar', 'SAR Sensor (Sentinel-1 / ICEYE)');
    }

    // Re-render previews if switching back to a mode that already has files
    Object.keys(window.SatState.uploadedFiles).forEach(k => {
      if (window.SatState.uploadedFiles[k]) {
        this.showFilePreview(k, window.SatState.uploadedFiles[k]);
      }
    });
  },

  _dropzoneHTML(k, title) {
    return `
      <div class="dropzone-container" id="cnt-${k}">
        <div class="dropzone-label"><span>${title}</span><span class="req">Required</span></div>
        <div class="dropzone" id="dz-${k}" onclick="document.getElementById('in-${k}').click()"
             ondragover="event.preventDefault(); this.classList.add('dragover')"
             ondragleave="this.classList.remove('dragover')"
             ondrop="event.preventDefault(); this.classList.remove('dragover'); window.SatApp.handleFileDrop(event, '${k}')">
          <div class="dropzone-icon">📁</div>
          <div class="dropzone-text">Click or Drag & Drop image here</div>
          <div class="dropzone-subtext">GeoTIFF, TIFF, PNG, or JPEG</div>
        </div>
        <input type="file" id="in-${k}" class="file-input-hidden" accept=".tif,.tiff,.geotiff,.png,.jpg,.jpeg" onchange="window.SatApp.handleFileSelect(event, '${k}')"/>
      </div>
    `;
  },

  showFilePreview(k, fileObj) {
    const cnt = document.getElementById(`cnt-${k}`);
    if (!cnt) return;
    const dz = document.getElementById(`dz-${k}`);
    if (dz) dz.style.display = 'none';

    cnt.querySelector('.file-preview')?.remove();

    const card = document.createElement('div');
    card.className = 'file-preview';
    card.innerHTML = `
      <img class="file-preview-thumb" src="${fileObj.url}" onclick="window.SatUI.openLightbox('${fileObj.url}')" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'60\\' height=\\'60\\'><rect width=\\'60\\' height=\\'60\\' fill=\\'%231E293B\\'/><text x=\\'50%\\' y=\\'50%\\' fill=\\'%23FFF\\' font-size=\\'10\\' text-anchor=\\'middle\\' dy=\\'.3em\\'>GeoTIFF</text></svg>'"/>
      <div class="file-preview-details">
        <div class="file-preview-name">${fileObj.name}</div>
        <div class="file-preview-meta">${fileObj.size} • ${fileObj.isTiff ? 'GeoTIFF / Multispectral' : 'Standard Raster'}</div>
        <div class="file-preview-status">✅ Validated & Ready</div>
      </div>
      <button class="file-remove-btn" onclick="window.SatApp.removeFile('${k}')">✖</button>
    `;
    cnt.appendChild(card);
  },

  openLightbox(url) {
    const modal = document.getElementById('imageLightbox');
    const modalImg = document.getElementById('lightboxImg');
    if (modal && modalImg) {
      modalImg.src = url;
      modal.style.display = 'flex';
    }
  },

  showToast(msg, type = 'info') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerText = msg;
    document.getElementById('toasts')?.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }
};