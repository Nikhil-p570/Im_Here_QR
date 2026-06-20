export const ensureQrLib = async () => {
  if (typeof window.qrcode !== 'undefined') return true;
  const urls = [
    'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/2.0.4/qrcode.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.js'
  ];
  const loadScript = (src) => {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  };
  for (const u of urls) {
    try {
      await loadScript(u);
      if (typeof window.qrcode !== 'undefined') return true;
    } catch {
      // try next
    }
  }
  return false;
};

export const roundRectPath = (ctx, x, y, w, h, r) => {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
};

export const fillShape = (ctx, x, y, size, color, shape) => {
  ctx.fillStyle = color;
  if (shape === 'circle') {
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (shape === 'rounded') {
    roundRectPath(ctx, x, y, size, size, size * 0.28);
    ctx.fill();
  } else {
    ctx.fillRect(x, y, size, size);
  }
};

export const isFinderArea = (row, col, n) => {
  return (row < 7 && col < 7) || (row < 7 && col >= n - 7) || (row >= n - 7 && col < 7);
};

export const drawDot = (ctx, row, col, margin, moduleSize, color, shape, offsetY, sizePct) => {
  const x = (col + margin) * moduleSize;
  const y = (row + margin) * moduleSize + offsetY;
  const s = moduleSize * sizePct;
  const inset = (moduleSize - s) / 2;
  if (shape === 'square') {
    ctx.fillStyle = color;
    ctx.fillRect(x + inset, y + inset, s, s);
  } else if (shape === 'circle') {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + moduleSize / 2, y + moduleSize / 2, s / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    fillShape(ctx, x + inset, y + inset, s, color, 'rounded');
  }
};

export const drawFinder = (ctx, row, col, margin, moduleSize, dColor, bColor, shape, offsetY) => {
  const x = (col + margin) * moduleSize;
  const y = (row + margin) * moduleSize + offsetY;
  const outer = 7 * moduleSize;
  fillShape(ctx, x, y, outer, dColor, shape);
  const mid = moduleSize;
  fillShape(ctx, x + mid, y + mid, outer - 2 * mid, bColor, shape);
  const inOff = 2 * moduleSize, inner = 3 * moduleSize;
  fillShape(ctx, x + inOff, y + inOff, inner, dColor, shape);
};

export const drawLogo = (ctx, logoCanvas, qrSize, offsetY, pct, bColor) => {
  const logoSize = qrSize * pct;
  const pad = logoSize * 0.18;
  const plate = logoSize + pad * 2;
  const px = (qrSize - plate) / 2;
  const py = offsetY + (qrSize - plate) / 2;

  ctx.save();
  roundRectPath(ctx, px, py, plate, plate, plate * 0.18);
  ctx.fillStyle = bColor;
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRectPath(ctx, px + pad, py + pad, logoSize, logoSize, logoSize * 0.18);
  ctx.clip();
  ctx.drawImage(logoCanvas, px + pad, py + pad, logoSize, logoSize);
  ctx.restore();
};

export const drawBanner = (ctx, qrSize, bannerH, text, bannerBgColor, bannerTextColor, offsetY) => {
  const pillH = 50;
  ctx.save();
  ctx.font = "bold 20px ui-monospace, Menlo, Consolas, monospace";
  const textMetrics = ctx.measureText(text);
  const textW = textMetrics.width;
  
  // Calculate layout parameters
  const badgeSize = 32;
  const paddingLeft = 14;
  const gap = 12;
  const paddingRight = 14;
  const pillW = paddingLeft + badgeSize + gap + textW + paddingRight;
  
  const pillX = 30;
  const pillY = offsetY + (bannerH - pillH) / 2;

  // Draw pill background
  roundRectPath(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fillStyle = bannerBgColor;
  ctx.fill();
  
  // Draw pill border
  ctx.strokeStyle = bannerTextColor;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Draw yellow circle badge
  const badgeRadius = badgeSize / 2;
  const badgeCx = pillX + paddingLeft + badgeRadius;
  const badgeCy = pillY + pillH / 2;
  
  ctx.beginPath();
  ctx.arc(badgeCx, badgeCy, badgeRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#facc15'; // Vibrant yellow
  ctx.fill();

  // Draw phone receiver icon inside the yellow badge
  const phonePathStr = "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z";
  const phonePath = new Path2D(phonePathStr);
  
  const iconSize = 15;
  const iconScale = iconSize / 24;
  const iconX = badgeCx - iconSize / 2;
  const iconY = badgeCy - iconSize / 2;
  
  ctx.translate(iconX, iconY);
  ctx.scale(iconScale, iconScale);
  ctx.fillStyle = '#000000'; // Black phone icon
  ctx.fill(phonePath);
  ctx.restore();

  // Draw text next to the yellow badge
  ctx.save();
  ctx.fillStyle = bannerTextColor;
  ctx.font = "bold 20px ui-monospace, Menlo, Consolas, monospace";
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, pillX + paddingLeft + badgeSize + gap, pillY + pillH / 2 + 1);
  ctx.restore();
};

export const makeQR = (text) => {
  const levels = ['H', 'Q', 'M', 'L'];
  for (const lvl of levels) {
    for (let t = 0; t <= 40; t++) {
      try {
        const q = window.qrcode(t, lvl);
        q.addData(text);
        q.make();
        return { qr: q, level: lvl };
      } catch {
        // try next
      }
    }
  }
  throw new Error('Text too long to encode as a QR code.');
};
