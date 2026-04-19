const LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Loads an image and strips its background color by making matching pixels fully transparent.
 *
 * Uses a flood-fill (BFS) seeded from every border pixel so only the connected background
 * region is removed. Interior pixels that happen to share a similar color are left untouched
 * because the BFS cannot reach them without crossing a non-background boundary.
 *
 * @param {string} src - Path or URL of the source image.
 * @param {number[]} bgRgb - The target background color as [r, g, b].
 * @param {number} tolerance - Maximum Euclidean color distance to treat a pixel as background.
 * @returns {Promise<string>} Resolves to a data-URL of the processed image with background removed.
 */
function removeImageBackground(src, bgRgb, tolerance) {
  if (tolerance === undefined) {
    tolerance = 50;
  }

  return new Promise(function(resolve) {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = function() {
      const canvas = document.createElement('canvas');
      canvas.width  = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // d is a flat RGBA array: [r0, g0, b0, a0, r1, g1, b1, a1, ...]
      const d = imageData.data;
      const w = canvas.width;
      const h = canvas.height;

      // Extract individual color components from the target background color
      const tr = bgRgb[0];
      const tg = bgRgb[1];
      const tb = bgRgb[2];

      // visited tracks which pixels have already been checked to avoid re-processing
      const visited = new Uint8Array(w * h);

      // queue holds the flat pixel indices that still need to be made transparent
      const queue = [];

      /**
       * Checks whether pixel (x, y) is close enough to the background color.
       * If so, and if not already visited, adds it to the BFS queue.
       * @param {number} x
       * @param {number} y
       */
      function enqueue(x, y) {
        const idx = y * w + x;

        if (visited[idx]) {
          return;
        }
        visited[idx] = 1;

        // Compute the flat array offset for this pixel's red channel
        const pi = idx * 4;

        // Euclidean distance in RGB color space between this pixel and the target color
        const dr = d[pi]     - tr;
        const dg = d[pi + 1] - tg;
        const db = d[pi + 2] - tb;
        const dist = Math.sqrt(dr * dr + dg * dg + db * db);

        if (dist < tolerance) {
          queue.push(idx);
        }
      }

      // Seed the BFS from every pixel on all four edges of the image
      for (let x = 0; x < w; x++) {
        enqueue(x, 0);       // top edge
        enqueue(x, h - 1);   // bottom edge
      }
      for (let y = 1; y < h - 1; y++) {
        enqueue(0, y);       // left edge
        enqueue(w - 1, y);   // right edge
      }

      // Process the queue: make each matched pixel transparent and spread to its four neighbors
      while (queue.length > 0) {
        const idx = queue.pop();
        const pi = idx * 4;

        // Set alpha channel to 0 (fully transparent)
        d[pi + 3] = 0;

        // Determine the (x, y) coordinates of this pixel from its flat index
        const px = idx % w;
        const py = Math.floor(idx / w);

        if (px > 0)     { enqueue(px - 1, py); }   // left neighbor
        if (px < w - 1) { enqueue(px + 1, py); }   // right neighbor
        if (py > 0)     { enqueue(px, py - 1); }   // top neighbor
        if (py < h - 1) { enqueue(px, py + 1); }   // bottom neighbor
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL());
    };

    img.src = src;
  });
}

/**
 * Generates an array of unique random keys of the specified type.
 *
 * Numbers: random integers between 1 and 999 (inclusive).
 * Letters: random characters drawn from the 52-character set a–z / A–Z.
 *          The maximum unique count is capped at 52.
 *
 * @param {number} size - The number of unique keys to generate.
 * @param {string} type - 'number' or 'letter'.
 * @returns {Array} An array of unique keys.
 */
function generateRandomKeys(size, type) {
  const pool = [];

  // Determine how many unique values are actually possible for this type
  let max;
  if (type === 'letter') {
    max = Math.min(size, LETTERS.length);
  } else {
    max = size;
  }

  // Keep generating random candidates until we have enough unique ones
  while (pool.length < max) {
    let key;

    if (type === 'letter') {
      key = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    } else {
      key = Math.floor(Math.random() * 999) + 1;
    }

    // Only add the key if it is not already in the pool
    let alreadyExists = false;
    for (let i = 0; i < pool.length; i++) {
      if (pool[i] === key) {
        alreadyExists = true;
        break;
      }
    }

    if (!alreadyExists) {
      pool.push(key);
    }
  }

  return pool;
}

/**
 * Parses a single user-typed key from a raw string input.
 *
 * Rules:
 *   - A string of digits (optionally prefixed with '-') is parsed as an integer.
 *   - A single letter (a–z or A–Z) is returned as-is.
 *   - Any other input returns null, indicating the input is invalid.
 *
 * @param {string} raw - The raw input string from the user.
 * @returns {number|string|null} The parsed key, or null if invalid.
 */
function parseKey(raw) {
  const s = raw.trim();

  if (/^-?\d+$/.test(s)) {
    return parseInt(s, 10);
  }

  if (/^[a-zA-Z]$/.test(s)) {
    return s;
  }

  return null;
}
