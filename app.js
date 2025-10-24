(() => {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => ctx.querySelectorAll(sel);

  const state = {
    originalImage: null,
    imageBitmap: null,
    previewCanvas: null,
    previewCtx: null,
    pixelResolution: 32,
    paletteSize: 16,
    dithering: 'none',
    orientation: 'portrait',
    selectedSize: null,
    price: 0,
    history: [],
    cartCount: 0,
    crop: {
      active: false,
      // crop rect in image space
      x: 0, y: 0, w: 0, h: 0,
      // interactions
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    },
  };

  function setText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }

  function initHeroCanvas() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const w = canvas.width, h = canvas.height;
    let t = 0;
    function draw() {
      ctx.clearRect(0, 0, w, h);
      // Animated pixel grid shimmer
      const cell = 16;
      for (let y = 0; y < h; y += cell) {
        for (let x = 0; x < w; x += cell) {
          const v = Math.sin((x + t) * 0.02) * Math.cos((y - t) * 0.02);
          const a = 0.12 + 0.08 * v;
          ctx.fillStyle = `rgba(0,255,255,${a})`;
          ctx.fillRect(x, y, cell - 2, cell - 2);
        }
      }
      t += 2;
      requestAnimationFrame(draw);
    }
    draw();
  }

  function initFooterYear() { setText('year', new Date().getFullYear().toString()); }

  // Helper to wait for Pixelate module
  async function waitForPixelate() {
    let attempts = 0;
    while ((!window.Pixelate || !window.Pixelate.processToPreview) && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    return window.Pixelate && window.Pixelate.processToPreview;
  }

  // Global drawToPreview function
  async function drawToPreview(bitmap) {
    console.log('drawToPreview START');
    const canvas = state.previewCanvas;
    const ctx = state.previewCtx;
    console.log('Canvas found?', !!canvas);
    const overlay = document.getElementById('processingOverlay');
    overlay?.classList.add('is-active');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!bitmap) {
      console.log('No bitmap provided');
      overlay?.classList.remove('is-active');
      return;
    }
    // Pixelate module is already loaded during init, but double-check for safety
    if (!window.Pixelate || !window.Pixelate.processToPreview) {
      console.log('ERROR: Pixelate module not available');
      overlay?.classList.remove('is-active');
      const uploadError = document.getElementById('uploadError');
      if (uploadError) uploadError.textContent = 'Fehler: Verarbeitungsmodul nicht verfügbar. Bitte Seite neu laden.';
      return;
    }
    console.log('Processing with Pixelate module');
    // Process via Pixelate module
    const result = window.Pixelate.processToPreview(bitmap, {
      gridSize: state.pixelResolution,
      paletteSize: state.paletteSize,
      dithering: state.dithering,
      outWidth: canvas.width,
      outHeight: canvas.height,
      crop: state.crop && !state.crop.active && state.crop.w > 0 ? { x: state.crop.x, y: state.crop.y, w: state.crop.w, h: state.crop.h } : null,
    });
    console.log('Pixelate processing done, drawing to canvas');
    ctx.drawImage(result.canvas, 0, 0);
    console.log('Canvas drawn, updating history');
    // Push to history as data URL for undo
    state.history.push(canvas.toDataURL());
    if (state.history.length > 20) state.history.shift();
    overlay?.classList.remove('is-active');
    console.log('drawToPreview COMPLETE');
  }

  let uploadInitialized = false;

  function initUpload() {
    if (uploadInitialized) {
      console.log('WARNUNG: initUpload bereits aufgerufen, überspringe doppelte Initialisierung');
      return;
    }
    uploadInitialized = true;
    console.log('initUpload START - registriere Event-Handler');

    const dropzone = $('#dropzone');
    const fileInput = $('#fileInput');
    const browseBtn = document.getElementById('uploadBtn');
    const uploadError = $('#uploadError');
    const sizeSelect = document.getElementById('sizeSelect');
    const sizePrice = document.getElementById('sizePrice');
    const sizeOrientation = document.getElementById('sizeOrientation');
    const addToCartBtn = document.getElementById('addToCartBtn');
    const buyNowBtn = document.getElementById('buyNowBtn');
    const cartBtn = document.getElementById('cartBtn');

    state.previewCanvas = document.getElementById('previewCanvas');
    state.previewCtx = state.previewCanvas.getContext('2d', { willReadFrequently: true });

    const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
      dropzone.addEventListener(evt, prevent, false);
    });
    ['dragenter', 'dragover'].forEach(evt => {
      dropzone.addEventListener(evt, () => dropzone.classList.add('is-dragover'));
    });
    ['dragleave', 'drop'].forEach(evt => {
      dropzone.addEventListener(evt, () => dropzone.classList.remove('is-dragover'));
    });

    dropzone.addEventListener('drop', async (e) => {
      const file = e.dataTransfer?.files?.[0];
      if (file) await handleFile(file);
    });
    dropzone.addEventListener('click', (e) => {
      // Verhindere Event, wenn der Button geklickt wurde (Event Bubbling)
      if (e.target === browseBtn || browseBtn?.contains(e.target)) {
        console.log('Click was on button, letting button handler handle it');
        return;
      }
      console.log('Dropzone clicked, opening file picker');
      fileInput.click();
    });
    dropzone.addEventListener('keydown', (e) => { 
      if (e.key === 'Enter' || e.key === ' ') {
        console.log('Dropzone key pressed, opening file picker');
        fileInput.click();
      }
    });
    browseBtn?.addEventListener('click', (e) => {
      e.stopPropagation(); // Verhindere Event-Bubbling zur Dropzone
      console.log('Browse button clicked, opening file picker');
      fileInput.click();
    });
    fileInput.addEventListener('change', async () => {
      console.log('FileInput change event triggered');
      const file = fileInput.files?.[0];
      if (file) {
        console.log('Selected file', { name: file.name, type: file.type, size: file.size });
        await handleFile(file);
        fileInput.value = ''; // Reset input to allow same file again
      } else {
        console.log('No file selected');
      }
    });

    async function handleFile(file) {
      console.log('handleFile START', file.name);
      uploadError.textContent = '';
      const typeOk = /^(image\/(png|jpeg|jpg|pjpeg))$/i.test(file.type || '');
      if (!typeOk) {
        console.log('ERROR: Invalid file type', file.type);
        uploadError.textContent = 'Bitte PNG oder JPEG hochladen.';
        return;
      }
      console.log('File type OK, processing');
      if (file.size > 50 * 1024 * 1024) {
        uploadError.textContent = 'Datei ist zu groß (max. 50MB).';
        return;
      }
      const overlay = document.getElementById('processingOverlay');
      overlay?.classList.add('is-active');
      try {
        console.log('Creating image bitmap');
        if (window.createImageBitmap) {
          state.originalImage = await createImageBitmap(file);
          console.log('Image bitmap created', `${state.originalImage.width}x${state.originalImage.height}`);
        } else {
          console.log('Using fallback image loading');
          // Fallback: object URL + HTMLImageElement
          state.originalImage = await new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
            img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
            img.src = url;
          });
          console.log('Image loaded via fallback', `${state.originalImage.width}x${state.originalImage.height}`);
        }
        state.imageBitmap = state.originalImage;
        // Auto-detect orientation based on image
        state.orientation = state.imageBitmap.width >= state.imageBitmap.height ? 'landscape' : 'portrait';
        console.log('Orientation detected', state.orientation);
        // Populate sizes dropdown and enable it
        populateSizeDropdown();
        sizeOrientation.textContent = state.orientation === 'portrait' ? 'Hochformat' : 'Querformat';
        sizeSelect.disabled = false;
        // Reveal controls panel now that an image exists
        const controlsPanel = document.getElementById('controlsPanel');
        console.log('controlsPanel found?', !!controlsPanel);
        if (controlsPanel) {
          controlsPanel.classList.remove('is-hidden');
          console.log('controlsPanel is-hidden removed');
        }
        const previewCard = document.getElementById('previewCard');
        console.log('previewCard found?', !!previewCard);
        if (previewCard) {
          previewCard.classList.remove('is-hidden');
          console.log('previewCard is-hidden removed');
        }
        console.log('Checking crop compliance');
        ensureCropCompliance();
        console.log('Drawing preview');
        await drawToPreview(state.imageBitmap);
        state.history = [];
        console.log('✓ Upload COMPLETE!');
      } catch (err) {
        console.log('ERROR in handleFile', err.message);
        console.error('Full error:', err);
        uploadError.textContent = 'Bild konnte nicht geladen werden. Bitte versuche eine andere Datei.';
      } finally {
        overlay?.classList.remove('is-active');
      }
    }


    function populateSizeDropdown() {
      const sizes = [
        { id: '21x29.7', label: '21 × 29.7 cm', price: 20.65 },
        { id: '29.7x42', label: '29.7 × 42 cm (A3)', price: 33.73 },
        { id: '42x59.4', label: '42 × 59.4 cm (A2)', price: 37.80 },
        { id: '50x70', label: '50 × 70 cm', price: 33.70 },
        { id: '59.4x84.1', label: '59.4 × 84.1 cm (A1)', price: 50.63 },
        { id: '84.1x118.9', label: '84.1 × 118.9 cm (A0)', price: 50.63 },
      ];
      sizeSelect.innerHTML = '';
      sizes.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `${s.label} — €${s.price.toFixed(2)}`;
        opt.dataset.price = s.price;
        sizeSelect.appendChild(opt);
      });
      state.selectedSize = sizes[0].id;
      state.price = sizes[0].price;
      sizeSelect.value = state.selectedSize;
      sizePrice.textContent = `€${state.price.toFixed(2)}`;
      dispatchOrderUpdated();
    }

    sizeSelect?.addEventListener('change', () => {
      const sel = sizeSelect.options[sizeSelect.selectedIndex];
      state.selectedSize = sel.value;
      state.price = Number(sel.dataset.price);
      sizePrice.textContent = `€${state.price.toFixed(2)}`;
      dispatchOrderUpdated();
    });

    function openModal() {
      const modal = document.getElementById('checkoutModal');
      modal.classList.add('is-open');
      // Fill brief
      const mSize = document.getElementById('modalSize');
      const mOrientation = document.getElementById('modalOrientation');
      const mPrice = document.getElementById('modalPrice');
      if (mSize) mSize.textContent = state.selectedSize || '—';
      if (mOrientation) mOrientation.textContent = state.orientation === 'portrait' ? 'Hochformat' : 'Querformat';
      if (mPrice) mPrice.textContent = `€${state.price.toFixed(2)}`;
      dispatchOrderUpdated();
    }
    function closeModal() {
      const modal = document.getElementById('checkoutModal');
      modal.classList.remove('is-open');
    }
    document.querySelectorAll('[data-close-modal]').forEach(el => el.addEventListener('click', closeModal));
    cartBtn?.addEventListener('click', openModal);
    addToCartBtn?.addEventListener('click', () => {
      if (!state.selectedSize) return;
      state.cartCount += 1;
      const cartCount = document.getElementById('cartCount');
      if (cartCount) cartCount.textContent = String(state.cartCount);
    });
    buyNowBtn?.addEventListener('click', () => {
      if (!state.selectedSize) return;
      openModal();
    });

    function dispatchOrderUpdated() {
      window.dispatchEvent(new CustomEvent('order:updated', { detail: { size: state.selectedSize, orientation: state.orientation, price: state.price } }));
    }
  }

  let controlsInitialized = false;

  function initControls() {
    if (controlsInitialized) {
      console.log('WARNUNG: initControls bereits aufgerufen, überspringe');
      return;
    }
    controlsInitialized = true;
    console.log('initControls START - registriere Control-Handler');

    const pixelResolution = document.getElementById('pixelResolution');
    const pixelResolutionValue = document.getElementById('pixelResolutionValue');
    const paletteSize = document.getElementById('paletteSize');
    const dithering = document.getElementById('dithering');
    const resetBtn = document.getElementById('resetBtn');
    const undoBtn = document.getElementById('undoBtn');
    const exportBtn = document.getElementById('exportBtn');

    pixelResolution.addEventListener('input', () => {
      state.pixelResolution = parseInt(pixelResolution.value, 10);
      pixelResolutionValue.textContent = pixelResolution.value;
      if (state.imageBitmap) requestAnimationFrame(() => drawToPreview(state.imageBitmap));
    });
    paletteSize.addEventListener('change', () => {
      state.paletteSize = parseInt(paletteSize.value, 10);
      if (state.imageBitmap) requestAnimationFrame(() => drawToPreview(state.imageBitmap));
    });
    dithering.addEventListener('change', () => {
      state.dithering = dithering.value;
      if (state.imageBitmap) requestAnimationFrame(() => drawToPreview(state.imageBitmap));
    });
    resetBtn.addEventListener('click', () => {
      if (!state.originalImage) return;
      state.imageBitmap = state.originalImage;
      state.history = [];
      requestAnimationFrame(() => drawToPreview(state.imageBitmap));
    });
    undoBtn.addEventListener('click', () => {
      if (state.history.length <= 1) return;
      state.history.pop();
      const dataUrl = state.history[state.history.length - 1];
      const img = new Image();
      img.onload = () => {
        state.previewCtx.clearRect(0, 0, state.previewCanvas.width, state.previewCanvas.height);
        state.previewCtx.drawImage(img, 0, 0);
      };
      img.src = dataUrl;
    });
    exportBtn.addEventListener('click', () => {
      if (!state.imageBitmap) return;
      // Pixelate module is already loaded during init
      if (!window.Pixelate || !window.Pixelate.exportForPrint) {
        alert('Fehler: Verarbeitungsmodule nicht geladen. Bitte Seite neu laden.');
        return;
      }
      // If size selected, map cm; otherwise fallback to A3 portrait
      const sizeMap = {
        '21x29.7': { w: 21, h: 29.7 },
        '29.7x42': { w: 29.7, h: 42 },
        '42x59.4': { w: 42, h: 59.4 },
        '50x70': { w: 50, h: 70 },
        '59.4x84.1': { w: 59.4, h: 84.1 },
        '84.1x118.9': { w: 84.1, h: 118.9 },
      };
      const def = { w: 29.7, h: 42 };
      const cm = sizeMap[state.selectedSize] || def;
      const o = state.orientation === 'portrait' ? cm : { w: cm.h, h: cm.w };
      const printCanvas = window.Pixelate.exportForPrint(state.imageBitmap, {
        gridSize: state.pixelResolution,
        paletteSize: state.paletteSize,
        dithering: state.dithering,
        cmWidth: o.w,
        cmHeight: o.h,
        orientation: state.orientation,
        dpi: 300,
        crop: state.crop && state.crop.w > 0 ? { x: state.crop.x, y: state.crop.y, w: state.crop.w, h: state.crop.h } : null,
      });
      printCanvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pixel-poster-${state.selectedSize || 'A3'}-${state.orientation}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }, 'image/png');
    });
  }

  function ensureCropCompliance() {
    if (!state.imageBitmap) return;
    // Always use 5:7 ratio (portrait poster format)
    const desired = 5/7;
    const imgRatio = state.imageBitmap.width / state.imageBitmap.height;
    const needsCrop = Math.abs(imgRatio - desired) > 0.01; // tolerance
    console.log('Crop needed?', needsCrop);
    const overlay = document.getElementById('cropOverlay');
    if (!needsCrop) {
      console.log('No crop needed, hiding overlay');
      overlay?.classList.add('is-hidden');
      state.crop.active = false;
      return false;
    }
    console.log('Crop needed, showing overlay');
    overlay?.classList.remove('is-hidden');
    overlay?.classList.add('active');
    state.crop.active = true;
    // Initialize crop to centered rectangle with 5:7 ratio
    let cropW, cropH;
    // Try to use full height first
    cropH = state.imageBitmap.height;
    cropW = Math.round(cropH * (5/7));
    // If too wide, calculate from width
    if (cropW > state.imageBitmap.width) {
      cropW = state.imageBitmap.width;
      cropH = Math.round(cropW * (7/5));
    }
    state.crop.w = cropW; state.crop.h = cropH;
    state.crop.x = Math.max(0, Math.round((state.imageBitmap.width - cropW) / 2));
    state.crop.y = Math.max(0, Math.round((state.imageBitmap.height - cropH) / 2));
    wireCropInteractions();
    drawCropOverlay();
    return true;
  }

  function wireCropInteractions() {
    const overlay = document.getElementById('cropOverlay');
    const cancelBtn = document.getElementById('cropCancel');
    const applyBtn = document.getElementById('cropApply');
    let dragging = false; let lastX = 0; let lastY = 0;
    overlay.addEventListener('mousedown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; });
    window.addEventListener('mouseup', () => { dragging = false; });
    window.addEventListener('mousemove', (e) => {
      if (!dragging || !state.crop.active) return;
      const dx = e.clientX - lastX; const dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY;
      // translate crop rectangle in image space proportional to movement on canvas
      const canvas = state.previewCanvas; const rect = canvas.getBoundingClientRect();
      const scaleX = state.imageBitmap.width / rect.width;
      const scaleY = state.imageBitmap.height / rect.height;
      state.crop.x = Math.max(0, Math.min(state.imageBitmap.width - state.crop.w, state.crop.x + dx * scaleX));
      state.crop.y = Math.max(0, Math.min(state.imageBitmap.height - state.crop.h, state.crop.y + dy * scaleY));
      drawCropOverlay();
    });
    overlay.addEventListener('wheel', (e) => {
      if (!state.crop.active) return;
      e.preventDefault();
      const zoom = e.deltaY < 0 ? 1.04 : 0.96;
      const newW = Math.max(10, Math.min(state.imageBitmap.width, Math.round(state.crop.w * zoom)));
      const ratio = state.crop.h / state.crop.w; // keep ratio
      const newH = Math.round(newW * ratio);
      state.crop.w = newW; state.crop.h = newH;
      // keep centered within image bounds
      state.crop.x = Math.max(0, Math.min(state.imageBitmap.width - state.crop.w, state.crop.x));
      state.crop.y = Math.max(0, Math.min(state.imageBitmap.height - state.crop.h, state.crop.y));
      drawCropOverlay();
    }, { passive: false });
    cancelBtn.addEventListener('click', () => {
      overlay.classList.add('is-hidden');
      overlay.classList.remove('active');
      state.crop.active = false;
    });
    applyBtn.addEventListener('click', () => {
      overlay.classList.add('is-hidden');
      overlay.classList.remove('active');
      state.crop.active = false;
      // Redraw with crop applied
      drawToPreview(state.imageBitmap);
    });
  }

  function drawCropOverlay() {
    const overlay = document.getElementById('cropOverlay');
    if (!overlay || !state.crop.active) return;
    const canvas = state.previewCanvas; const rect = canvas.getBoundingClientRect();
    // convert image crop rect to canvas coordinates
    const scaleX = rect.width / state.imageBitmap.width;
    const scaleY = rect.height / state.imageBitmap.height;
    const x = Math.round(state.crop.x * scaleX);
    const y = Math.round(state.crop.y * scaleY);
    const w = Math.round(state.crop.w * scaleX);
    const h = Math.round(state.crop.h * scaleY);
    // create a highlighted window by using CSS clip-path (inverted polygon - dark outside, clear inside)
    overlay.querySelector('.crop-mask').style.clipPath = `polygon(0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%, ${x}px ${y}px, ${x}px ${y + h}px, ${x + w}px ${y + h}px, ${x + w}px ${y}px, ${x}px ${y}px)`;
    // Position the visible frame
    const frame = overlay.querySelector('.crop-frame');
    if (frame) {
      frame.style.left = `${x}px`;
      frame.style.top = `${y}px`;
      frame.style.width = `${w}px`;
      frame.style.height = `${h}px`;
    }
  }

  function initSizesPricing() { /* sizes handled via dropdown in upload section */ }

  let isInitialized = false;

  async function init() {
    // Prevent double initialization
    if (isInitialized) {
      console.log('WARNUNG: App already initialized, skipping');
      return;
    }
    isInitialized = true;

    // Wait for Pixelate module to be ready BEFORE initializing event handlers
    console.log('Warte auf Pixelate-Modul');
    const pixelateReady = await waitForPixelate();
    if (!pixelateReady) {
      console.log('ERROR: Pixelate-Modul konnte nicht geladen werden');
      alert('Fehler beim Laden der Anwendung. Bitte Seite neu laden.');
      isInitialized = false;
      return;
    }
    console.log('✓ Pixelate-Modul geladen, initialisiere App');
    
    initHeroCanvas();
    initFooterYear();
    initUpload();
    initControls();
    initSizesPricing();
    // Render inspiration demo canvases with a simple pattern
    const cards = document.querySelectorAll('.inspo-card');
    cards.forEach((c, idx) => {
      const ctx = c.getContext('2d');
      const w = c.width, h = c.height; const cell = 16;
      for (let y = 0; y < h; y += cell) {
        for (let x = 0; x < w; x += cell) {
          const v = ((x / cell) + (y / cell) + idx) % 4;
          const colors = [
            'rgb(10,20,40)',
            'rgb(0,180,255)',
            'rgb(255,20,147)',
            'rgb(0,255,0)'
          ];
          ctx.fillStyle = colors[v|0];
          ctx.fillRect(x, y, cell-1, cell-1);
        }
      }
    });
    console.log('✓ App-Initialisierung abgeschlossen!');
  }

  // Use 'interactive' or 'complete' as readyState check, then wait for all scripts
  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init);
  }
})();


