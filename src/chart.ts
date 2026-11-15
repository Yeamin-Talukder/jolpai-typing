// The speed-over-time chart, shared by the result screen and the result details.

/** SVG content for a chart of speed and raw speed each second, with mistakes marked. */
export function speedChart(W: number, H: number, wpm: number[], raw: number[], errors: number[], idPrefix = 'c'): string {
  const n = wpm.length;
  if (n === 0) return '';
  const padL = 36, padR = 30, padT = 10, padB = 24;
  const maxY = Math.max(10, ...wpm, ...raw);
  const top = Math.ceil(maxY / 20) * 20;
  const maxE = Math.max(1, ...errors);
  const x = (i: number) => padL + (n === 1 ? 0 : (i / (n - 1)) * (W - padL - padR));
  const y = (v: number) => padT + (1 - v / top) * (H - padT - padB);
  const line = (vs: number[]) => vs.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');

  let g = '';
  for (let v = 0; v <= top; v += top / 4) {
    g += `<line x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${padL - 8}" y="${y(v) + 4}" class="axis" text-anchor="end">${Math.round(v)}</text>`;
  }
  const step = Math.max(1, Math.ceil(n / 10));
  for (let i = 0; i < n; i += step) g += `<text x="${x(i)}" y="${H - 6}" class="axis" text-anchor="middle">${i + 1}</text>`;
  let errs = '';
  errors.forEach((e, i) => {
    if (!e) return;
    const ey = padT + (1 - e / maxE) * (H - padT - padB) * 0.9;
    errs += `<g class="err" transform="translate(${x(i)},${ey})"><path d="M-3,-3L3,3M3,-3L-3,3"/><title>${e} error${e > 1 ? 's' : ''} in second ${i + 1}</title></g>`;
  });
  const base = y(0).toFixed(1);
  const area = `${line(wpm)}L${x(n - 1).toFixed(1)},${base}L${x(0).toFixed(1)},${base}Z`;
  const fill = `${idPrefix}-fill`;
  return `<defs><linearGradient id="${fill}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="fill-top"/><stop offset="1" class="fill-bottom"/></linearGradient></defs>`
    + `${g}<path d="${area}" class="area" fill="url(#${fill})"/><path d="${line(raw)}" class="raw"/><path d="${line(wpm)}" class="wpm"/>${errs}`;
}
