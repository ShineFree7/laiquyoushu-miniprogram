function pixelRatio() {
  try {
    if (wx.getWindowInfo) return wx.getWindowInfo().pixelRatio;
    return wx.getSystemInfoSync().pixelRatio;
  } catch (e) {
    return 2;
  }
}

function toCanvas(that, id, draw) {
  return new Promise((resolve) => {
    wx.createSelectorQuery().in(that)
      .select(`#${id}`)
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          resolve(false);
          return;
        }
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = pixelRatio();
        canvas.width = res[0].width * dpr;
        canvas.height = res[0].height * dpr;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, res[0].width, res[0].height);
        draw(ctx, res[0].width, res[0].height);
        resolve(true);
      });
  });
}

function toCanvasImage(that, id, draw) {
  return new Promise((resolve) => {
    wx.createSelectorQuery().in(that)
      .select(`#${id}`)
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          resolve('');
          return;
        }
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = pixelRatio();
        canvas.width = res[0].width * dpr;
        canvas.height = res[0].height * dpr;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, res[0].width, res[0].height);
        draw(ctx, res[0].width, res[0].height);
        wx.canvasToTempFilePath({
          canvas,
          destWidth: res[0].width * dpr,
          destHeight: res[0].height * dpr,
          success: (r) => resolve(r.tempFilePath),
          fail: () => resolve('')
        });
      });
  });
}

function niceMax(v) {
  if (v <= 0) return 1;
  if (v <= 5) return 5;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

function shortNum(v) {
  if (v >= 10000) return `${(v / 10000).toFixed(1)}w`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(Math.round(v * 100) / 100);
}

function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

function chartTheme(theme) {
  if (theme === 'theme2') {
    return {
      bgStart: '#FFFFFF',
      bgEnd: '#F7F9FF',
      paperLight: 'rgba(255, 255, 255, 0.8)',
      paperDark: 'rgba(65, 105, 225, 0.05)',
      emptyRing: '#E3E8F3',
      grid: '#E8ECF5',
      gridZero: '#C6D2EE',
      axis: '#1F2D3D',
      label: '#1F2D3D',
      pieLabel: '#263447',
      muted: '#8A94A6',
      pointFill: '#FFFFFF'
    };
  }
  return {
    bgStart: '#F5E9D6',
    bgEnd: '#F0E6D6',
    paperLight: 'rgba(255, 255, 255, 0.16)',
    paperDark: 'rgba(93, 64, 55, 0.04)',
    emptyRing: '#EADDC4',
    grid: '#E7D5B5',
    gridZero: '#C9B084',
    axis: '#212121',
    label: '#212121',
    pieLabel: '#212121',
    muted: '#8D7B63',
    pointFill: '#FDF7EB'
  };
}

function drawPie(ctx, w, h, items, options) {
  const opts = options || {};
  const t = chartTheme(opts.theme);
  const cx = w / 2;
  const cy = h / 2;
  const outer = Math.min(w, h) / 2 - 26;
  const inner = outer * 0.62;
  const total = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, t.bgStart);
  bg.addColorStop(1, t.bgEnd);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // subtle paper fibers
  ctx.save();
  for (let i = 0; i < 9; i++) {
    ctx.strokeStyle = i % 2 === 0 ? t.paperLight : t.paperDark;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const y = (h / 8) * i + 4;
    ctx.moveTo(6, y);
    ctx.bezierCurveTo(w * 0.32, y + 2, w * 0.65, y - 2, w - 6, y + 1);
    ctx.stroke();
  }
  ctx.restore();

  function annulus() {
    ctx.beginPath();
    ctx.arc(cx, cy, outer, 0, Math.PI * 2);
    ctx.arc(cx, cy, inner, Math.PI * 2, 0, true);
    ctx.closePath();
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (!items.length || total <= 0) {
    ctx.save();
    ctx.shadowColor = 'rgba(74, 50, 42, 0.14)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    annulus();
    ctx.fillStyle = t.emptyRing;
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = t.muted;
    ctx.font = '11px Helvetica, sans-serif';
    ctx.fillText('暂无数据', cx, cy);
    return;
  }

  // soft shadow behind the ring
  ctx.save();
  ctx.shadowColor = 'rgba(62, 42, 31, 0.22)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  annulus();
  ctx.fillStyle = '#EADDC4';
  ctx.fill();
  ctx.restore();

  let start = -Math.PI / 2;
  items.forEach((item) => {
    const amount = Number(item.amount) || 0;
    const angle = (amount / total) * Math.PI * 2;
    if (angle <= 0) return;
    ctx.beginPath();
    ctx.arc(cx, cy, outer, start, start + angle);
    ctx.arc(cx, cy, inner, start + angle, start, true);
    ctx.closePath();
    ctx.fillStyle = item.color;
    ctx.fill();
    start += angle;
  });

  // unified light from upper right
  const highlight = ctx.createRadialGradient(cx + outer * 0.28, cy - outer * 0.34, inner * 0.2, cx, cy, outer);
  highlight.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
  highlight.addColorStop(0.55, 'rgba(255, 255, 255, 0)');
  annulus();
  ctx.fillStyle = highlight;
  ctx.fill();
  const shade = ctx.createRadialGradient(cx - outer * 0.3, cy + outer * 0.36, inner * 0.2, cx, cy, outer);
  shade.addColorStop(0, 'rgba(74, 50, 42, 0.10)');
  shade.addColorStop(0.55, 'rgba(74, 50, 42, 0)');
  annulus();
  ctx.fillStyle = shade;
  ctx.fill();

  const labelR = outer + 14;
  start = -Math.PI / 2;
  items.forEach((item) => {
    const amount = Number(item.amount) || 0;
    const angle = (amount / total) * Math.PI * 2;
    const percent = Math.round((amount / total) * 100);
    if (angle > 0 && percent >= 4) {
      const mid = start + angle / 2;
      const ex = cx + Math.cos(mid) * outer;
      const ey = cy + Math.sin(mid) * outer;
      const lx = cx + Math.cos(mid) * labelR;
      const ly = cy + Math.sin(mid) * labelR;
      ctx.strokeStyle = 'rgba(33, 33, 33, 0.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(lx, ly);
      ctx.stroke();
      ctx.fillStyle = t.pieLabel;
      ctx.font = "bold 10px 'PingFang SC', 'Microsoft YaHei', sans-serif";
      ctx.fillText(String(item.name || ''), lx, ly - 5);
      ctx.font = "9px 'Helvetica Neue', Arial, sans-serif";
      ctx.fillText(`${percent}%`, lx, ly + 5);
    }
    start += angle;
  });

  if (opts.centerTitle || opts.centerAmount) {
    ctx.textAlign = 'center';
    ctx.fillStyle = t.pieLabel;
    ctx.font = "10px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    if (opts.centerTitle) ctx.fillText(opts.centerTitle, cx, cy - 11);
    ctx.fillStyle = t.pieLabel;
    ctx.font = "bold 15px 'DIN Alternate', 'Helvetica Neue', Arial, sans-serif";
    if (opts.centerAmount) ctx.fillText(opts.centerAmount, cx, cy + 8);
  }
}

function drawBars(ctx, w, h, labels, values, posColor, negColor, theme, opts) {
  const o = opts || {};
  const t = chartTheme(theme);
  const padL = 38;
  const padR = 12;
  const padT = 26;
  const padB = 26;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const nums = values.map(Number);
  const rawMax = Math.max.apply(null, nums.concat([0]));
  const rawMin = Math.min.apply(null, nums.concat([0]));
  const hasNeg = rawMin < 0;
  const max = niceMax(Math.max(rawMax, Math.abs(rawMin)));
  const range = hasNeg ? max * 2 : max;
  const zeroY = hasNeg ? padT + plotH / 2 : padT + plotH;
  ctx.font = 'bold 10px Helvetica, sans-serif';
  ctx.textBaseline = 'middle';
  const gridAt = hasNeg ? [-1, 0, 1] : [0, 0.5, 1];
  gridAt.forEach((f) => {
    const y = hasNeg ? zeroY - f * (plotH / 2) : padT + plotH * (1 - f);
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.strokeStyle = f === 0 ? t.gridZero : t.grid;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = t.axis;
    ctx.textAlign = 'right';
    ctx.fillText(shortNum(max * f), padL - 6, y);
  });
  const n = nums.length;
  const step = n ? plotW / n : 0;
  const bw = Math.min(step * 0.55, 36);
  const labelEvery = Math.max(1, Math.ceil(n / 8));
  const selected = typeof o.selected === 'number' ? o.selected : -1;
  nums.forEach((v, i) => {
    const x = padL + step * i + (step - bw) / 2;
    const bh = plotH * Math.abs(v) / range;
    const y = v >= 0 ? zeroY - bh : zeroY;
    ctx.fillStyle = i === selected
      ? (o.selectedColor || '#000000')
      : (v >= 0 ? (posColor || '#212121') : (negColor || '#212121'));
    ctx.beginPath();
    roundRectPath(ctx, x, y, bw, Math.max(bh, 1), Math.min(bw / 2, 6));
    ctx.fill();
    const atCadence = i % labelEvery === 0 || i === n - 1;
    const nearSelected = selected >= 0 && Math.abs(i - selected) <= 1;
    if (v !== 0 && atCadence && !nearSelected) {
      ctx.fillStyle = t.label;
      ctx.font = "bold 10px 'Helvetica Neue', Arial, sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText(shortNum(v), x + bw / 2, v >= 0 ? y - 8 : y + bh + 12);
    }
    if (atCadence) {
      ctx.fillStyle = t.axis;
      ctx.font = '10px Helvetica, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(labels[i], x + bw / 2, padT + plotH + 14);
    }
  });

  if (selected >= 0 && selected < n) {
    const v = nums[selected];
    const x = padL + step * selected + (step - bw) / 2;
    const bh = plotH * Math.abs(v) / range;
    const y = v >= 0 ? zeroY - bh : zeroY;
    const py = v >= 0 ? y - 8 : y + bh + 12;
    const px = x + bw / 2;
    ctx.font = "bold 10px 'Helvetica Neue', Arial, sans-serif";
    ctx.textAlign = 'center';
    const text = shortNum(v);
    const tw = ctx.measureText ? ctx.measureText(text).width : 30;
    ctx.fillStyle = t.axis;
    roundRectPath(ctx, px - tw / 2 - 4, py - 7, tw + 8, 14, 5);
    ctx.fill();
    ctx.fillStyle = t.pointFill;
    ctx.fillText(text, px, py);
  }

  if (typeof o.avg === 'number' && o.avg >= 0 && o.avg <= max && !hasNeg) {
    const yAvg = zeroY - o.avg * (plotH / range);
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = t.gridZero;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, yAvg);
    ctx.lineTo(padL + plotW, yAvg);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = t.muted;
    ctx.font = '9px Helvetica, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`日均 ${shortNum(o.avg)}`, padL + plotW - 2, yAvg - 5);
    ctx.restore();
  }
}

function barIndexAt(w, n, x) {
  const padL = 38;
  const padR = 12;
  if (!n || w <= padL + padR) return -1;
  const plotW = w - padL - padR;
  if (x < padL || x > padL + plotW) return -1;
  const step = plotW / n;
  const i = Math.min(n - 1, Math.floor((x - padL) / step));
  return i;
}

function drawLines(ctx, w, h, labels, values, color, theme) {
  const t = chartTheme(theme);
  const padL = 38;
  const padR = 12;
  const padT = 24;
  const padB = 26;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const nums = values.map(Number);
  const rawMax = Math.max.apply(null, nums.concat([0]));
  const rawMin = Math.min.apply(null, nums.concat([0]));
  const hasNeg = rawMin < 0;
  const max = niceMax(Math.max(rawMax, Math.abs(rawMin)));
  const zeroY = hasNeg ? padT + plotH / 2 : padT + plotH;
  const scale = hasNeg ? (plotH / 2) / max : plotH / max;
  ctx.font = 'bold 10px Helvetica, sans-serif';
  ctx.textBaseline = 'middle';
  const gridAt = hasNeg ? [-1, 0, 1] : [0, 0.5, 1];
  gridAt.forEach((f) => {
    const y = hasNeg ? zeroY - f * (plotH / 2) : padT + plotH * (1 - f);
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.strokeStyle = f === 0 ? t.gridZero : t.grid;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = t.axis;
    ctx.textAlign = 'right';
    ctx.fillText(shortNum(max * f), padL - 6, y);
  });
  const n = labels.length;
  const step = n > 1 ? plotW / (n - 1) : 0;
  const labelEvery = Math.max(1, Math.ceil(n / 8));
  ctx.beginPath();
  nums.forEach((v, i) => {
    const x = padL + step * i;
    const y = zeroY - v * scale;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color || '#212121';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();
  nums.forEach((v, i) => {
    const x = padL + step * i;
    const y = zeroY - v * scale;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = t.pointFill;
    ctx.fill();
    ctx.strokeStyle = color || '#212121';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (i % labelEvery === 0 || i === n - 1) {
      ctx.fillStyle = t.label;
      ctx.font = "bold 10px 'Helvetica Neue', Arial, sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText(shortNum(v), x, y - 9);
    }
  });
  labels.forEach((label, i) => {
    if (i % labelEvery === 0 || i === n - 1) {
      ctx.fillStyle = t.axis;
      ctx.font = '10px Helvetica, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, padL + step * i, padT + plotH + 14);
    }
  });
}

module.exports = {
  toCanvas,
  toCanvasImage,
  drawPie,
  drawBars,
  barIndexAt,
  drawLines
};
