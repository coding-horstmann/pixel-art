(() => {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => ctx.querySelectorAll(sel);

  // Toast Notification System
  function showToast(message, icon = '✓', duration = 3000) {
    // Remove any existing toast
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
      existingToast.remove();
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-message">${message}</div>
      <button class="toast-close" aria-label="Schließen">✕</button>
    `;

    // Add to body
    document.body.appendChild(toast);

    // Show animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.classList.add('show');
      });
    });

    // Close button handler
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    });

    // Auto-hide after duration
    if (duration > 0) {
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
      }, duration);
    }
  }

  const state = {
    originalImage: null,
    imageBitmap: null,
    previewCanvas: null,
    previewCtx: null,
    pixelResolution: 32,
    paletteSize: 16,
    dithering: 'none',
    brightness: 0,
    orientation: 'portrait',
    selectedSize: null,
    price: 0,
    history: [],
    cartCount: 0,
    cart: [], // Array of cart items: { imageDataUrl, size, price, orientation, timestamp }
    crop: {
      active: false,
      // crop rect in image space
      x: 0, y: 0, w: 0, h: 0,
      // interactions
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    },
    // Image rendering info in canvas (for crop overlay positioning)
    render: {
      dx: 0,    // x offset of image in canvas
      dy: 0,    // y offset of image in canvas
      dw: 0,    // rendered width of image in canvas
      dh: 0,    // rendered height of image in canvas
    },
  };

  function setText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }

  // Calculate how the image is rendered in the canvas (centered, aspect-preserved)
  function calculateImageRenderInfo(imageWidth, imageHeight, canvasWidth, canvasHeight) {
    const aspect = imageWidth / imageHeight;
    let dw, dh;
    if (aspect >= 1) { 
      dw = canvasWidth; 
      dh = Math.round(canvasWidth / aspect); 
      if (dh > canvasHeight) { 
        dh = canvasHeight; 
        dw = Math.round(canvasHeight * aspect); 
      } 
    } else { 
      dh = canvasHeight; 
      dw = Math.round(canvasHeight * aspect); 
      if (dw > canvasWidth) { 
        dw = canvasWidth; 
        dh = Math.round(canvasWidth / aspect); 
      } 
    }
    const dx = Math.floor((canvasWidth - dw) / 2);
    const dy = Math.floor((canvasHeight - dh) / 2);
    return { dx, dy, dw, dh };
  }

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
    // NOTE: Never apply crop to preview - user should see full image with overlay!
    // Crop is only applied when: exporting, adding to cart, or buying
    const result = window.Pixelate.processToPreview(bitmap, {
      gridSize: state.pixelResolution,
      paletteSize: state.paletteSize,
      dithering: state.dithering,
      brightness: state.brightness,
      outWidth: canvas.width,
      outHeight: canvas.height,
      crop: null, // Always null for preview - crop overlay shows the selection visually
    });
    console.log('Pixelate processing done, drawing to canvas');
    ctx.drawImage(result.canvas, 0, 0);
    console.log('Canvas drawn, updating history');
    // Calculate and store render info for crop overlay
    state.render = calculateImageRenderInfo(bitmap.width, bitmap.height, canvas.width, canvas.height);
    console.log('Render info:', state.render);
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
        // Detect image orientation
        const isLandscape = state.imageBitmap.width > state.imageBitmap.height;
        state.orientation = isLandscape ? 'landscape' : 'portrait';
        console.log('Image orientation detected:', state.orientation, `(${state.imageBitmap.width}x${state.imageBitmap.height})`);
        // Note: Poster format is always 5:7 portrait, regardless of image orientation
        // Populate sizes dropdown and enable it
        populateSizeDropdown();
        sizeOrientation.textContent = 'Hochformat (Poster 5:7)';
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
        console.log('Drawing preview first (to calculate render info)');
        await drawToPreview(state.imageBitmap);
        console.log('Checking crop compliance');
        ensureCropCompliance();
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
      // Calculate total
      const total = state.cart.reduce((sum, item) => sum + item.price, 0);
      // Fill brief with cart summary
      const mSize = document.getElementById('modalSize');
      const mOrientation = document.getElementById('modalOrientation');
      const mPrice = document.getElementById('modalPrice');
      if (mSize) mSize.textContent = `${state.cart.length} Artikel`;
      if (mOrientation) mOrientation.textContent = 'Hochformat';
      if (mPrice) mPrice.textContent = `€${total.toFixed(2)}`;
      // Render cart items
      renderCartItems();
      dispatchOrderUpdated();
    }

    function renderCartItems() {
      // Find or create cart items container in modal
      let cartContainer = document.getElementById('cartItemsContainer');
      if (!cartContainer) {
        // Insert before the form
        const modalForm = document.getElementById('modalForm');
        cartContainer = document.createElement('div');
        cartContainer.id = 'cartItemsContainer';
        cartContainer.className = 'cart-items-container';
        modalForm.parentNode.insertBefore(cartContainer, modalForm);
      }
      // Clear and render
      cartContainer.innerHTML = '';
      const modalForm = document.getElementById('modalForm');
      if (state.cart.length === 0) {
        cartContainer.innerHTML = '<p class="cart-empty">Ihr Warenkorb ist leer. Bitte erstellen Sie zuerst ein Pixel-Art Poster.</p>';
        // Hide form when cart is empty
        if (modalForm) modalForm.style.display = 'none';
        return;
      }
      // Show form when cart has items
      if (modalForm) modalForm.style.display = 'block';
      // Calculate total
      const total = state.cart.reduce((sum, item) => sum + item.price, 0);
      // Add title and items
      const titleHTML = `<h4 class="cart-title">Ihre Poster (${state.cart.length})</h4>`;
      const itemsHTML = state.cart.map((item, index) => {
        return `
          <div class="cart-item">
            <img src="${item.imageDataUrl}" alt="Poster ${index + 1}" class="cart-item-image">
            <div class="cart-item-info">
              <div class="cart-item-size">${item.size}</div>
              <div class="cart-item-orientation">${item.orientation === 'portrait' ? 'Hochformat' : 'Querformat'}</div>
              <div class="cart-item-price">€${item.price.toFixed(2)}</div>
            </div>
            <button class="cart-item-remove" data-index="${index}" type="button" aria-label="Entfernen">✕</button>
          </div>
        `;
      }).join('');
      const totalHTML = `<div class="cart-total"><span>Gesamtsumme:</span> <strong>€${total.toFixed(2)}</strong></div>`;
      cartContainer.innerHTML = titleHTML + itemsHTML + totalHTML;
      // Add event listeners for remove buttons
      cartContainer.querySelectorAll('.cart-item-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const index = parseInt(e.target.dataset.index, 10);
          removeCartItem(index);
        });
      });
    }

    function removeCartItem(index) {
      state.cart.splice(index, 1);
      state.cartCount = state.cart.length;
      const cartCount = document.getElementById('cartCount');
      if (cartCount) cartCount.textContent = String(state.cartCount);
      // Re-render
      renderCartItems();
      // Update totals
      const total = state.cart.reduce((sum, item) => sum + item.price, 0);
      const mSize = document.getElementById('modalSize');
      const mPrice = document.getElementById('modalPrice');
      if (mSize) mSize.textContent = `${state.cart.length} Artikel`;
      if (mPrice) mPrice.textContent = `€${total.toFixed(2)}`;
      // Show feedback
      showToast('Artikel wurde entfernt', '🗑️', 2000);
    }
    function closeModal() {
      const modal = document.getElementById('checkoutModal');
      modal.classList.remove('is-open');
    }
    document.querySelectorAll('[data-close-modal]').forEach(el => el.addEventListener('click', closeModal));
    cartBtn?.addEventListener('click', openModal);
    addToCartBtn?.addEventListener('click', () => {
      if (!state.selectedSize || !state.previewCanvas || !state.imageBitmap) return;
      
      // Create a canvas with the crop area (print area) only
      let imageDataUrl;
      if (state.crop.active && state.crop.w > 0 && state.crop.h > 0) {
        // Extract the crop area from the ALREADY PIXELATED preview canvas
        // This ensures the cart image looks exactly like what the user sees
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = 400;
        cropCanvas.height = 400;
        const cropCtx = cropCanvas.getContext('2d');
        
        // Calculate scale factors from image space to rendered canvas space
        const scaleX = state.render.dw / state.imageBitmap.width;
        const scaleY = state.render.dh / state.imageBitmap.height;
        
        // Transform crop coordinates from image space to canvas space
        const srcX = state.render.dx + (state.crop.x * scaleX);
        const srcY = state.render.dy + (state.crop.y * scaleY);
        const srcW = state.crop.w * scaleX;
        const srcH = state.crop.h * scaleY;
        
        // Copy the crop area from preview canvas to new canvas (scaled to fit)
        cropCtx.imageSmoothingEnabled = false; // Keep pixels sharp
        cropCtx.drawImage(
          state.previewCanvas,
          srcX, srcY, srcW, srcH,  // source rect in preview canvas
          0, 0, cropCanvas.width, cropCanvas.height  // destination rect (full canvas)
        );
        
        imageDataUrl = cropCanvas.toDataURL('image/png');
      } else {
        // No crop active, use full preview
        imageDataUrl = state.previewCanvas.toDataURL('image/png');
      }
      
      // Add to cart
      state.cart.push({
        imageDataUrl: imageDataUrl,
        size: state.selectedSize,
        price: state.price,
        orientation: state.orientation,
        timestamp: Date.now(),
      });
      state.cartCount = state.cart.length;
      const cartCount = document.getElementById('cartCount');
      if (cartCount) cartCount.textContent = String(state.cartCount);
      // Show feedback
      showToast('Druckbereich wurde zum Warenkorb hinzugefügt!', '🛒');
    });
    buyNowBtn?.addEventListener('click', () => {
      if (!state.selectedSize || !state.previewCanvas || !state.imageBitmap) return;
      
      // Create a canvas with the crop area (print area) only
      let imageDataUrl;
      if (state.crop.active && state.crop.w > 0 && state.crop.h > 0) {
        // Extract the crop area from the ALREADY PIXELATED preview canvas
        // This ensures the cart image looks exactly like what the user sees
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = 400;
        cropCanvas.height = 400;
        const cropCtx = cropCanvas.getContext('2d');
        
        // Calculate scale factors from image space to rendered canvas space
        const scaleX = state.render.dw / state.imageBitmap.width;
        const scaleY = state.render.dh / state.imageBitmap.height;
        
        // Transform crop coordinates from image space to canvas space
        const srcX = state.render.dx + (state.crop.x * scaleX);
        const srcY = state.render.dy + (state.crop.y * scaleY);
        const srcW = state.crop.w * scaleX;
        const srcH = state.crop.h * scaleY;
        
        // Copy the crop area from preview canvas to new canvas (scaled to fit)
        cropCtx.imageSmoothingEnabled = false; // Keep pixels sharp
        cropCtx.drawImage(
          state.previewCanvas,
          srcX, srcY, srcW, srcH,  // source rect in preview canvas
          0, 0, cropCanvas.width, cropCanvas.height  // destination rect (full canvas)
        );
        
        imageDataUrl = cropCanvas.toDataURL('image/png');
      } else {
        // No crop active, use full preview
        imageDataUrl = state.previewCanvas.toDataURL('image/png');
      }
      
      state.cart.push({
        imageDataUrl: imageDataUrl,
        size: state.selectedSize,
        price: state.price,
        orientation: state.orientation,
        timestamp: Date.now(),
      });
      state.cartCount = state.cart.length;
      const cartCount = document.getElementById('cartCount');
      if (cartCount) cartCount.textContent = String(state.cartCount);
      // Open checkout
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
    const brightness = document.getElementById('brightness');
    const brightnessValue = document.getElementById('brightnessValue');
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
    brightness.addEventListener('input', () => {
      state.brightness = parseInt(brightness.value, 10);
      brightnessValue.textContent = brightness.value > 0 ? `+${brightness.value}` : brightness.value;
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
        brightness: state.brightness,
        cmWidth: o.w,
        cmHeight: o.h,
        orientation: state.orientation,
        dpi: 300,
        crop: state.crop && state.crop.active && state.crop.w > 0 && state.crop.h > 0 ? { x: state.crop.x, y: state.crop.y, w: state.crop.w, h: state.crop.h } : null,
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
    
    // Calculate render info if not already available
    if (!state.render.dw || !state.render.dh) {
      const canvas = state.previewCanvas;
      if (canvas) {
        state.render = calculateImageRenderInfo(state.imageBitmap.width, state.imageBitmap.height, canvas.width, canvas.height);
        console.log('Render info calculated in ensureCropCompliance:', state.render);
      }
    }
    
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
    // Double-check: if calculated height exceeds image height, recalculate from height
    if (cropH > state.imageBitmap.height) {
      cropH = state.imageBitmap.height;
      cropW = Math.round(cropH * (5/7));
    }
    state.crop.w = cropW; 
    state.crop.h = cropH;
    // Center the crop area, ensuring it stays within bounds
    state.crop.x = Math.max(0, Math.min(state.imageBitmap.width - cropW, Math.round((state.imageBitmap.width - cropW) / 2)));
    state.crop.y = Math.max(0, Math.min(state.imageBitmap.height - cropH, Math.round((state.imageBitmap.height - cropH) / 2)));
    
    console.log('Crop initialized:', { x: state.crop.x, y: state.crop.y, w: state.crop.w, h: state.crop.h });
    console.log('Render info at crop init:', state.render);
    
    wireCropInteractions();
    
    // Draw the overlay immediately to show correct position
    drawCropOverlay();
    
    return true;
  }

  let cropInteractionsWired = false;
  
  function wireCropInteractions() {
    if (cropInteractionsWired) {
      console.log('Crop interactions already wired, skipping');
      return;
    }
    cropInteractionsWired = true;
    
    const overlay = document.getElementById('cropOverlay');
    let dragging = false; 
    let resizing = false;
    let resizeHandle = null;
    let lastX = 0; 
    let lastY = 0;
    
    // Handle resize handles
    const handles = overlay.querySelectorAll('.resize-handle');
    handles.forEach(handle => {
      handle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        resizing = true;
        resizeHandle = e.target.dataset.handle;
        lastX = e.clientX;
        lastY = e.clientY;
      });
    });
    
    // Handle dragging (moving the crop area)
    overlay.addEventListener('mousedown', (e) => { 
      if (resizing) return;
      dragging = true; 
      lastX = e.clientX; 
      lastY = e.clientY; 
    });
    
    window.addEventListener('mouseup', () => { 
      // Note: No need to redraw preview when crop changes
      // Preview shows the full pixelated image, crop overlay shows the selection
      dragging = false;
      resizing = false;
      resizeHandle = null;
    });
    
    window.addEventListener('mousemove', (e) => {
      if (!state.crop.active) return;
      
      const canvas = state.previewCanvas; 
      const rect = canvas.getBoundingClientRect();
      
      // Scale factors: canvas pixels to rendered image pixels
      const canvasScaleX = canvas.width / rect.width;
      const canvasScaleY = canvas.height / rect.height;
      
      // Scale factors: rendered image pixels to original image pixels
      const imageScaleX = state.imageBitmap.width / state.render.dw;
      const imageScaleY = state.imageBitmap.height / state.render.dh;
      
      if (resizing && resizeHandle) {
        // Convert mouse movement to image space coordinates
        const dx = (e.clientX - lastX) * canvasScaleX * imageScaleX;
        const dy = (e.clientY - lastY) * canvasScaleY * imageScaleY;
        lastX = e.clientX;
        lastY = e.clientY;
        
        const ratio = 7/5; // height/width ratio for 5:7
        const minW = 50;
        const minH = Math.round(minW * ratio);
        
        let newX = state.crop.x;
        let newY = state.crop.y;
        let newW = state.crop.w;
        let newH = state.crop.h;
        
        // Handle different resize directions
        switch (resizeHandle) {
          case 'se': // bottom-right corner
            newW = Math.max(minW, Math.min(state.imageBitmap.width - newX, newW + dx));
            newH = Math.round(newW * ratio);
            // Ensure height doesn't exceed bottom boundary
            if (newY + newH > state.imageBitmap.height) {
              newH = state.imageBitmap.height - newY;
              newW = Math.round(newH / ratio);
            }
            break;
          case 'sw': // bottom-left corner
            const potentialW_sw = newW - dx;
            const potentialX_sw = newX + dx;
            if (potentialW_sw >= minW && potentialX_sw >= 0) {
              const potentialH_sw = Math.round(potentialW_sw * ratio);
              // Check if new height would fit within image bounds
              if (newY + potentialH_sw <= state.imageBitmap.height) {
                newW = potentialW_sw;
                newX = potentialX_sw;
                newH = potentialH_sw;
              }
            }
            break;
          case 'ne': // top-right corner
            const potentialH_ne = newH - dy;
            const potentialY_ne = newY + dy;
            if (potentialH_ne >= minH && potentialY_ne >= 0) {
              const potentialW_ne = Math.round(potentialH_ne / ratio);
              // Check if new width would fit within image bounds
              if (newX + potentialW_ne <= state.imageBitmap.width) {
                newH = potentialH_ne;
                newY = potentialY_ne;
                newW = potentialW_ne;
              }
            }
            break;
          case 'nw': // top-left corner
            const potentialW_nw = newW - dx;
            const potentialX_nw = newX + dx;
            if (potentialW_nw >= minW && potentialX_nw >= 0) {
              const potentialH_nw = Math.round(potentialW_nw * ratio);
              const heightChange = newH - potentialH_nw;
              const potentialY_nw = newY + heightChange;
              // Check if new position and dimensions fit within bounds
              if (potentialY_nw >= 0 && potentialY_nw + potentialH_nw <= state.imageBitmap.height) {
                newW = potentialW_nw;
                newH = potentialH_nw;
                newX = potentialX_nw;
                newY = potentialY_nw;
              }
            }
            break;
          case 'e': // right edge
            newW = Math.max(minW, Math.min(state.imageBitmap.width - newX, newW + dx));
            newH = Math.round(newW * ratio);
            // Ensure height doesn't exceed image bounds, if so adjust from width
            if (newY + newH > state.imageBitmap.height) {
              newH = state.imageBitmap.height - newY;
              newW = Math.round(newH / ratio);
            }
            break;
          case 'w': // left edge
            const potentialW_w = newW - dx;
            const potentialX_w = newX + dx;
            if (potentialW_w >= minW && potentialX_w >= 0) {
              const potentialH_w = Math.round(potentialW_w * ratio);
              // Check if new height fits within bounds
              if (newY + potentialH_w <= state.imageBitmap.height) {
                newW = potentialW_w;
                newX = potentialX_w;
                newH = potentialH_w;
              }
            }
            break;
          case 'n': // top edge
            const potentialH_n = newH - dy;
            const potentialY_n = newY + dy;
            if (potentialH_n >= minH && potentialY_n >= 0) {
              const potentialW_n = Math.round(potentialH_n / ratio);
              // Check if new width fits within bounds
              if (newX + potentialW_n <= state.imageBitmap.width) {
                newH = potentialH_n;
                newY = potentialY_n;
                newW = potentialW_n;
              }
            }
            break;
          case 's': // bottom edge
            newH = Math.max(minH, Math.min(state.imageBitmap.height - newY, newH + dy));
            newW = Math.round(newH / ratio);
            // Ensure width doesn't exceed right boundary
            if (newX + newW > state.imageBitmap.width) {
              newW = state.imageBitmap.width - newX;
              newH = Math.round(newW * ratio);
            }
            break;
        }
        
        // Ensure dimensions stay within image bounds
        if (newW > state.imageBitmap.width) {
          newW = state.imageBitmap.width;
          newH = Math.round(newW * ratio);
        }
        if (newH > state.imageBitmap.height) {
          newH = state.imageBitmap.height;
          newW = Math.round(newH / ratio);
        }
        
        // Apply position constraints - ensure crop stays fully within image
        newX = Math.max(0, Math.min(newX, state.imageBitmap.width - newW));
        newY = Math.max(0, Math.min(newY, state.imageBitmap.height - newH));
        
        // Final check: if crop area would exceed image bounds, adjust position
        if (newX + newW > state.imageBitmap.width) {
          newX = state.imageBitmap.width - newW;
        }
        if (newY + newH > state.imageBitmap.height) {
          newY = state.imageBitmap.height - newH;
        }
        
        // Ensure no negative positions
        newX = Math.max(0, newX);
        newY = Math.max(0, newY);
        
        state.crop.x = newX;
        state.crop.y = newY;
        state.crop.w = newW;
        state.crop.h = newH;
        
        drawCropOverlay();
      } else if (dragging) {
        const dx = e.clientX - lastX; 
        const dy = e.clientY - lastY; 
        lastX = e.clientX; 
        lastY = e.clientY;
        
        // Convert mouse movement to image space coordinates and translate crop rectangle
        const imageDx = dx * canvasScaleX * imageScaleX;
        const imageDy = dy * canvasScaleY * imageScaleY;
        
        state.crop.x = Math.max(0, Math.min(state.imageBitmap.width - state.crop.w, state.crop.x + imageDx));
        state.crop.y = Math.max(0, Math.min(state.imageBitmap.height - state.crop.h, state.crop.y + imageDy));
        drawCropOverlay();
      }
    });
    
    overlay.addEventListener('wheel', (e) => {
      if (!state.crop.active) return;
      e.preventDefault();
      const zoom = e.deltaY < 0 ? 1.04 : 0.96;
      const ratio = 7/5; // 5:7 ratio means height/width = 7/5
      
      // Calculate new dimensions while maintaining 5:7 ratio
      let newW = Math.round(state.crop.w * zoom);
      let newH = Math.round(newW * ratio);
      
      // Ensure both dimensions stay within image bounds
      if (newW > state.imageBitmap.width) {
        newW = state.imageBitmap.width;
        newH = Math.round(newW * ratio);
      }
      if (newH > state.imageBitmap.height) {
        newH = state.imageBitmap.height;
        newW = Math.round(newH / ratio);
      }
      
      // Minimum size
      const minW = 50;
      const minH = Math.round(minW * ratio);
      if (newW < minW) {
        newW = minW;
        newH = minH;
      }
      
      // Calculate the center point of current crop area
      const centerX = state.crop.x + state.crop.w / 2;
      const centerY = state.crop.y + state.crop.h / 2;
      
      // Update dimensions
      state.crop.w = newW;
      state.crop.h = newH;
      
      // Try to keep the same center point
      let newCropX = centerX - newW / 2;
      let newCropY = centerY - newH / 2;
      
      // Ensure the crop area stays fully within image bounds
      newCropX = Math.max(0, Math.min(state.imageBitmap.width - newW, newCropX));
      newCropY = Math.max(0, Math.min(state.imageBitmap.height - newH, newCropY));
      
      state.crop.x = newCropX;
      state.crop.y = newCropY;
      drawCropOverlay();
      
      // Note: No need to redraw preview when zooming crop
      // Preview shows the full pixelated image, crop overlay shows the selection
    }, { passive: false });
  }

  function drawCropOverlay() {
    const overlay = document.getElementById('cropOverlay');
    if (!overlay || !state.crop.active) return;
    const canvas = state.previewCanvas; 
    const rect = canvas.getBoundingClientRect();
    
    // Calculate scale from image space to rendered space in canvas
    const scaleX = state.render.dw / state.imageBitmap.width;
    const scaleY = state.render.dh / state.imageBitmap.height;
    
    // Transform crop coordinates from image space to canvas space
    // Include the render offsets (dx, dy) to account for centered image
    const canvasScaleX = rect.width / canvas.width;
    const canvasScaleY = rect.height / canvas.height;
    
    const x = Math.round((state.render.dx + state.crop.x * scaleX) * canvasScaleX);
    const y = Math.round((state.render.dy + state.crop.y * scaleY) * canvasScaleY);
    const w = Math.round((state.crop.w * scaleX) * canvasScaleX);
    const h = Math.round((state.crop.h * scaleY) * canvasScaleY);
    
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


