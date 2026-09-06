/**
 * API Client & Network Dispatcher
 */
window.SatApi = {
  async checkHealth() {
    if (window.SAT_CONFIG.USE_MOCK_API) {
      return { status: 'healthy', version: '1.0-mock' };
    }
    const res = await fetch(`${window.SAT_CONFIG.API_BASE_URL}/health`);
    return await res.json();
  },

  async analyzeScene(mode, query, files) {
    if (window.SAT_CONFIG.USE_MOCK_API) {
      return this._mockAgentExecution(mode, query);
    }

    const formData = new FormData();
    formData.append('mode', mode);
    formData.append('query', query);

    if (mode === 'single' && files.single) {
      formData.append('image', files.single.raw);
    } else if (mode === 'bitemporal') {
      formData.append('date1', files.date1.raw);
      formData.append('date2', files.date2.raw);
    } else if (mode === 'crossmodal') {
      formData.append('optical', files.optical.raw);
      formData.append('sar', files.sar.raw);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), window.SAT_CONFIG.TIMEOUT_MS);

    const response = await fetch(`${window.SAT_CONFIG.API_BASE_URL}/analyze`, {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Server Error ${response.status}`);
    }

    return await response.json();
  },

  async _mockAgentExecution(mode, query) {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const trace = window.AgentTrace;

    if (trace && typeof trace.updateStep === 'function') {
      trace.updateStep(1, 'active', 'Classifying query intent...');
      await sleep(600);
      trace.updateStep(1, 'completed', `Classified: ${mode === 'single' ? 'Spatial Grounding & VQA' : 'Change Analysis'}`);

      trace.updateStep(2, 'active', 'Routing neural models...');
      await sleep(500);
      trace.updateStep(2, 'completed', 'Selected: RemoteCLIP-ViT-L, SatViG-Grounder');

      trace.updateStep(3, 'active', 'Calibrating projection...');
      await sleep(500);
      trace.updateStep(3, 'completed', 'Calibrated: GSD 10m/px, EPSG:4326');

      trace.updateStep(4, 'active', 'Running vision-language inference...');
      await sleep(800);
      trace.updateStep(4, 'completed', 'Grounding complete: Target objects detected.');

      trace.updateStep(5, 'active', 'Synthesizing output...');
      await sleep(400);
      trace.updateStep(5, 'completed', 'Confidence evaluated at 94%');
    }

    return {
      task: mode.toUpperCase() + " ANALYSIS",
      answer: "The analyzed satellite scene confirms distinct commercial development with 42% built-up surface area and adjacent agricultural plots. Water bodies are well-defined with healthy photosynthetic vegetation along boundaries.",
      confidence: 94,
      latency: "1.24s",
      models: ["RemoteCLIP-ViT-L", "SatViG-Grounder", "NDVI-Engine"],
      boxes: [
        { x: 80, y: 70, w: 220, h: 160, label: "Urban Built-up" },
        { x: 320, y: 150, w: 180, h: 200, label: "Water Body" }
      ]
    };
  },

  downloadReport(resultOverride, imageListOverride) {
    window.SatUI?.showToast("Generating PDF Report...", "success");
    setTimeout(() => {
      const res = resultOverride || window.SatState.latestResult || {};
      
      let imagesHtml = '';
      const imgs = imageListOverride || [];
      if (imgs.length > 0) {
        let imgCards = '';
        imgs.forEach(url => {
          imgCards += `<div style="margin: 10px; display: inline-block; text-align: center;"><img src="${url}" style="max-width: 320px; max-height: 240px; border-radius: 8px; border: 1px solid #cbd5e1;" /></div>`;
        });
        imagesHtml = `
          <div class="section-title">Analyzed Satellite Imagery Asset(s)</div>
          <div style="margin: 15px 0; text-align: center;">${imgCards}</div>
        `;
      }

      const win = window.open('', '_blank');
      win.document.write(`
        <html>
        <head>
          <title>SatQuery Intelligence Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #111; line-height: 1.6; }
            h1 { color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
            .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
            .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 15px; border-radius: 8px; }
            .meta-label { font-size: 0.75rem; color: #64748b; font-weight: bold; text-transform: uppercase; }
            .meta-val { font-size: 1.1rem; font-weight: bold; color: #0f172a; margin-top: 4px; }
            .section-title { font-weight: bold; color: #475569; margin-top: 25px; font-size: 0.95rem; text-transform: uppercase; }
            .answer { font-size: 1.05rem; background: #f1f5f9; padding: 15px; border-radius: 8px; margin-top: 8px; }
            ul { margin-top: 8px; padding-left: 20px; }
            li { color: #334155; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <h1>SatQuery AI - Intelligence Report</h1>
          
          <div class="meta-grid">
            <div class="meta-box">
              <div class="meta-label">Task Type</div>
              <div class="meta-val">${res.task || 'SINGLE ANALYSIS'}</div>
            </div>
            <div class="meta-box">
              <div class="meta-label">Execution Latency</div>
              <div class="meta-val">${res.latency || '1.24s'}</div>
            </div>
            <div class="meta-box">
              <div class="meta-label">Confidence Rating</div>
              <div class="meta-val">${res.confidence || 94}%</div>
            </div>
          </div>

          ${imagesHtml}

          <div class="section-title">Synthesized Findings</div>
          <div class="answer">${res.answer || 'No analysis data recorded.'}</div>

          <div class="section-title">Deployed Neural Models</div>
          <ul>
            ${(res.models || ['RemoteCLIP-ViT-L', 'SatViG-Grounder']).map(m => `<li>${m}</li>`).join('')}
          </ul>

          <script>
            window.onload = () => { setTimeout(() => window.print(), 500); };
          </script>
        </body>
        </html>
      `);
      win.document.close();
    }, 600);
  },

  downloadMasterReportAndReset() {
    // 1. Grab the session turns *before* clearing them
    const turns = window.SatState.sessionTurns || [];
    if (turns.length === 0) {
      window.SatUI?.showToast("No analysis turns recorded yet.", "error");
      return;
    }

    // 2. Trigger the master report generation using the captured turns
    window.SatUI?.showToast("Generating Master Session PDF Report...", "success");
    setTimeout(() => {
      let turnsHtml = '';
      turns.forEach((turn, index) => {
        let imgImgs = '';
        (turn.images || []).forEach(url => {
          imgImgs += `<div style="margin: 5px; display: inline-block;"><img src="${url}" style="max-width: 220px; max-height: 160px; border-radius: 6px; border: 1px solid #cbd5e1;" /></div>`;
        });

        turnsHtml += `
          <div style="margin-bottom: 35px; border-bottom: 1px solid #cbd5e1; padding-bottom: 25px;">
            <h3>Query #${index + 1}: ${turn.query}</h3>
            <div style="font-size: 0.85rem; color: #64748b; margin-bottom: 10px;">
              <strong>Task:</strong> ${turn.result.task || 'ANALYSIS'} | 
              <strong>Latency:</strong> ${turn.result.latency || '1.24s'} | 
              <strong>Confidence:</strong> ${turn.result.confidence || 94}%
            </div>
            ${imgImgs ? `<div style="margin: 10px 0;">${imgImgs}</div>` : ''}
            <div style="background: #f1f5f9; padding: 12px; border-radius: 6px; margin-top: 10px;">
              <strong>Findings:</strong> ${turn.result.answer}
            </div>
          </div>
        `;
      });

      const win = window.open('', '_blank');
      win.document.write(`
        <html>
        <head>
          <title>SatQuery Master Intelligence Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #111; line-height: 1.6; }
            h1 { color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
            h3 { color: #334155; margin-bottom: 5px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <h1>SatQuery AI - Master Intelligence Report</h1>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()} | <strong>Total Queries:</strong> ${turns.length}</p>
          <hr style="border:0; border-top: 1px solid #cbd5e1; margin-bottom: 20px;" />
          ${turnsHtml}
          <script>
            window.onload = () => { setTimeout(() => window.print(), 500); };
          </script>
        </body>
        </html>
      `);
      win.document.close();
    }, 400);

    // 3. Now safely reset session memory and uploaded files for fresh uploads
    window.SatState.sessionTurns = [];
    window.SatState.sessionHasImage = false;
    window.SatState.lastActiveFiles = null;
    window.SatState.uploadedFiles = {};
    window.SatState.previews = {};

    if (window.SatUI && typeof window.SatUI.renderDropzones === 'function') {
      window.SatUI.renderDropzones(window.SatState.selectedMode);
    }
    if (window.SatApp && typeof window.SatApp.validateState === 'function') {
      window.SatApp.validateState();
    }

    window.SatUI?.showToast("Report generated. Upload blocks reset for new imagery.", "success");
  }
};