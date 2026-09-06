/**
 * Visual Evidence Canvas Viewer
 */
window.CanvasViewer = {
  switchLayer(layer) {
    window.SatState.activeLayer = layer;
    document.getElementById('tabOverlay')?.classList.toggle('active', layer === 'annotated');
    document.getElementById('tabOriginal')?.classList.toggle('active', layer === 'original');
    document.getElementById('tabMask')?.classList.toggle('active', layer === 'mask');
    this.draw();
  },

  draw() {
    const cvs = document.getElementById('visualCanvas');
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    const state = window.SatState;

    const img = state.previews.single || state.previews.date1 || state.previews.optical;
    const w = img ? img.width : 600;
    const h = img ? img.height : 400;
    cvs.width = w;
    cvs.height = h;

    const metaDims = document.getElementById('metaDims');
    if (metaDims) metaDims.innerText = `Dims: ${w} × ${h} px`;

    if (img) {
      ctx.drawImage(img, 0, 0, w, h);
    } else {
      ctx.fillStyle = '#0f0f0f'; // matches --bg-elevated canvas well in components.css
      ctx.fillRect(0, 0, w, h);
    }

    if (state.activeLayer === 'annotated' && state.latestResult?.boxes) {
      state.latestResult.boxes.forEach(b => {
        // Indigo bounding box border (matches --accent)
        ctx.strokeStyle = '#6c5ce7';
        ctx.lineWidth = 3;
        ctx.strokeRect(b.x, b.y, b.w, b.h);

        // Soft indigo tint fill (matches --accent-soft)
        ctx.fillStyle = 'rgba(108, 92, 231, 0.22)';
        ctx.fillRect(b.x, b.y, b.w, b.h);

        // Label tag header — dark elevated surface with light text
        ctx.font = 'bold 12px Inter, sans-serif';
        const tag = b.label || b.l;
        const tagWidth = ctx.measureText(tag).width + 18;

        ctx.fillStyle = '#2a2a2a'; // matches --bg-elevated
        ctx.fillRect(b.x, b.y - 24, tagWidth, 24);

        ctx.fillStyle = '#f5f5f5'; // matches --text-primary
        ctx.fillText(tag, b.x + 8, b.y - 7);
      });
    } else if (state.activeLayer === 'mask') {
      // Indigo and teal segmentation highlights (two distinct hues, both readable on dark bg)
      ctx.fillStyle = 'rgba(108, 92, 231, 0.45)'; // indigo — primary class
      ctx.fillRect(w * 0.2, h * 0.2, w * 0.35, h * 0.35);

      ctx.fillStyle = 'rgba(74, 222, 128, 0.4)'; // matches --success, secondary class
      ctx.beginPath();
      ctx.arc(w * 0.68, h * 0.52, w * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
  }
};