// Pixel processing module: scaling, k-means quantization, dithering
(function () {
  function createCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h; return c;
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function getImageData(canvas) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  function adjustBrightness(imageData, brightness) {
    if (brightness === 0) return imageData;
    const { data } = imageData;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 16) continue; // skip transparent pixels
      data[i] = clamp(data[i] + brightness, 0, 255);     // R
      data[i+1] = clamp(data[i+1] + brightness, 0, 255); // G
      data[i+2] = clamp(data[i+2] + brightness, 0, 255); // B
    }
    return imageData;
  }

  function putImageData(canvas, imageData) {
    const ctx = canvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
  }

  function distanceSq(c1, c2) {
    const dr = c1[0] - c2[0];
    const dg = c1[1] - c2[1];
    const db = c1[2] - c2[2];
    return dr*dr + dg*dg + db*db;
  }

  function nearestColorIdx(color, palette) {
    let minD = Infinity, idx = 0;
    for (let i = 0; i < palette.length; i++) {
      const d = distanceSq(color, palette[i]);
      if (d < minD) { minD = d; idx = i; }
    }
    return idx;
  }

  function kMeansPalette(imageData, k = 16, maxIters = 10, sampleRate = 4) {
    const { data, width, height } = imageData;
    const pixels = [];
    for (let y = 0; y < height; y += sampleRate) {
      for (let x = 0; x < width; x += sampleRate) {
        const i = (y * width + x) * 4;
        const a = data[i + 3];
        if (a < 16) continue;
        pixels.push([data[i], data[i + 1], data[i + 2]]);
      }
    }
    if (pixels.length === 0) return [[0,0,0]];
    // Initialize centroids by random samples
    const centroids = [];
    for (let i = 0; i < k; i++) {
      const p = pixels[(Math.random() * pixels.length) | 0];
      centroids.push(p.slice());
    }
    const assignments = new Array(pixels.length).fill(0);
    for (let iter = 0; iter < maxIters; iter++) {
      // Assign
      for (let p = 0; p < pixels.length; p++) {
        assignments[p] = nearestColorIdx(pixels[p], centroids);
      }
      // Update
      const sums = new Array(k).fill(0).map(() => [0, 0, 0, 0]);
      for (let p = 0; p < pixels.length; p++) {
        const c = assignments[p];
        const px = pixels[p];
        sums[c][0] += px[0];
        sums[c][1] += px[1];
        sums[c][2] += px[2];
        sums[c][3] += 1;
      }
      for (let c = 0; c < k; c++) {
        if (sums[c][3] === 0) continue;
        centroids[c][0] = (sums[c][0] / sums[c][3]) | 0;
        centroids[c][1] = (sums[c][1] / sums[c][3]) | 0;
        centroids[c][2] = (sums[c][2] / sums[c][3]) | 0;
      }
    }
    return centroids;
  }

  const BAYER_8 = [
    [0, 48, 12, 60, 3, 51, 15, 63],
    [32, 16, 44, 28, 35, 19, 47, 31],
    [8, 56, 4, 52, 11, 59, 7, 55],
    [40, 24, 36, 20, 43, 27, 39, 23],
    [2, 50, 14, 62, 1, 49, 13, 61],
    [34, 18, 46, 30, 33, 17, 45, 29],
    [10, 58, 6, 54, 9, 57, 5, 53],
    [42, 26, 38, 22, 41, 25, 37, 21],
  ];

  function applyQuantization(imageData, palette, dithering = 'none') {
    const { data, width, height } = imageData;
    if (dithering === 'none') {
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a < 16) continue;
        const idx = nearestColorIdx([data[i], data[i+1], data[i+2]], palette);
        const c = palette[idx];
        data[i] = c[0]; data[i+1] = c[1]; data[i+2] = c[2];
      }
      return imageData;
    }

    if (dithering === 'bayer') {
      // Ordered dithering per channel, then map to nearest palette
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const a = data[i + 3];
          if (a < 16) continue;
          const t = (BAYER_8[y % 8][x % 8] / 64 - 0.5) * 32; // threshold tweak
          const r = clamp(data[i] + t, 0, 255);
          const g = clamp(data[i+1] + t, 0, 255);
          const b = clamp(data[i+2] + t, 0, 255);
          const idx = nearestColorIdx([r, g, b], palette);
          const c = palette[idx];
          data[i] = c[0]; data[i+1] = c[1]; data[i+2] = c[2];
        }
      }
      return imageData;
    }

    if (dithering === 'floyd') {
      const errMul = [[1, 0, 7/16],[ -1,1,3/16],[0,1,5/16],[1,1,1/16]]; // (dx,dy,weight)
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const a = data[i + 3];
          if (a < 16) continue;
          const old = [data[i], data[i+1], data[i+2]];
          const idx = nearestColorIdx(old, palette);
          const newC = palette[idx];
          const err = [old[0]-newC[0], old[1]-newC[1], old[2]-newC[2]];
          data[i] = newC[0]; data[i+1] = newC[1]; data[i+2] = newC[2];
          for (const [dx, dy, w] of errMul) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            const j = (ny * width + nx) * 4;
            data[j] = clamp(data[j] + err[0] * w, 0, 255);
            data[j+1] = clamp(data[j+1] + err[1] * w, 0, 255);
            data[j+2] = clamp(data[j+2] + err[2] * w, 0, 255);
          }
        }
      }
      return imageData;
    }

    return imageData;
  }

  function drawImageToGridCanvas(image, gridSize) {
    // gridSize is the number of pixels on the shorter side
    const aspect = image.width / image.height;
    let gw, gh;
    if (aspect >= 1) { // landscape
      gh = gridSize;
      gw = Math.max(1, Math.round(gridSize * aspect));
    } else {
      gw = gridSize;
      gh = Math.max(1, Math.round(gridSize / aspect));
    }
    const canvas = createCanvas(gw, gh);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(image, 0, 0, gw, gh);
    return canvas;
  }

  function processToPreview(image, options) {
    const { gridSize = 32, paletteSize = 16, dithering = 'none', brightness = 0, outWidth = 480, outHeight = 480, crop } = options;
    // 1) Scale image to small grid canvas (maintain aspect)
    const source = crop ? (() => {
      const s = createCanvas(crop.w, crop.h);
      const sctx = s.getContext('2d');
      sctx.drawImage(image, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
      return s;
    })() : image;
    const gridCanvas = drawImageToGridCanvas(source, gridSize);
    // 2) Adjust brightness if needed
    let gridData = getImageData(gridCanvas);
    if (brightness !== 0) {
      gridData = adjustBrightness(gridData, brightness);
      putImageData(gridCanvas, gridData);
    }
    // 3) Build palette with k-means
    const palette = kMeansPalette(gridData, paletteSize, 8, Math.max(1, Math.round(gridSize / 16)));
    // 4) Quantize + Dither on grid
    const quantized = applyQuantization(gridData, palette, dithering);
    putImageData(gridCanvas, quantized);
    // 4) Scale up to preview output with nearest-neighbor, centered
    const out = createCanvas(outWidth, outHeight);
    const octx = out.getContext('2d');
    octx.clearRect(0, 0, outWidth, outHeight);
    octx.imageSmoothingEnabled = false;
    // Fit within output while preserving aspect
    const aspect = gridCanvas.width / gridCanvas.height;
    let dw, dh;
    if (aspect >= 1) { dw = outWidth; dh = Math.round(outWidth / aspect); if (dh > outHeight) { dh = outHeight; dw = Math.round(outHeight * aspect); } }
    else { dh = outHeight; dw = Math.round(outHeight * aspect); if (dw > outWidth) { dw = outWidth; dh = Math.round(outWidth / aspect); } }
    const dx = Math.floor((outWidth - dw) / 2);
    const dy = Math.floor((outHeight - dh) / 2);
    octx.drawImage(gridCanvas, 0, 0, gridCanvas.width, gridCanvas.height, dx, dy, dw, dh);
    return { canvas: out, palette, gridCanvas };
  }

  function exportForPrint(image, options) {
    // options: { gridSize, paletteSize, dithering, brightness, cmWidth, cmHeight, orientation }
    const { gridSize = 64, paletteSize = 16, dithering = 'none', brightness = 0, cmWidth = 29.7, cmHeight = 42, orientation = 'portrait', dpi = 300 } = options;
    const inPerCm = 0.3937007874;
    const wIn = cmWidth * inPerCm;
    const hIn = cmHeight * inPerCm;
    const pxW = Math.round(wIn * dpi);
    const pxH = Math.round(hIn * dpi);
    // Process to grid first
    const processed = processToPreview(image, { gridSize, paletteSize, dithering, brightness, outWidth: pxW, outHeight: pxH, crop: options.crop });
    return processed.canvas;
  }

  window.Pixelate = {
    processToPreview,
    exportForPrint,
  };
})();


