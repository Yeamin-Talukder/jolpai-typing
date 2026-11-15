// The "share profile" panel: link, QR code, share, download and stop sharing.
import { icon } from './icons';

export interface ShareActions {
  signedIn(): boolean;
  shareId(): string | null;
  name(): string;
  start(): Promise<string>;
  stop(): Promise<void>;
  signIn(): void;
}

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/** The link that opens a shared profile. */
export const shareLink = (id: string) => `${location.origin}${location.pathname}?p=${encodeURIComponent(id)}`;

// the olive logo, drawn in the middle of the QR code
const LOGO_BODY = 'M16 7a9 11 0 1 0 0.01 0z';
const LOGO_LEAF = 'M16 7c2-4 6-5 9-4-1 4-5 6-9 4z';

type QR = { getModuleCount(): number; isDark(r: number, c: number): boolean };

async function makeQr(text: string): Promise<QR> {
  const mod = await import('qrcode-generator');
  const qrcode = (mod as unknown as { default: (t: 0, e: 'H') => QR & { addData(s: string): void; make(): void } }).default;
  const qr = qrcode(0, 'H'); // high error correction, so the logo in the middle does not matter
  qr.addData(text);
  qr.make();
  return qr;
}

/** How much of the middle the logo covers, in modules (kept odd so it centres). */
const logoModules = (n: number) => { const k = Math.round(n * 0.22); return k % 2 ? k : k + 1; };

function qrSvg(qr: QR): string {
  const n = qr.getModuleCount(), m = 2, size = n + m * 2;
  const k = logoModules(n), lo = (n - k) / 2;
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (r >= lo && r < lo + k && c >= lo && c < lo + k) continue; // room for the logo
    if (qr.isDark(r, c)) d += `M${c + m} ${r + m}h1v1h-1z`;
  }
  const s = k / 32; // logo is drawn on a 32 grid
  return `<svg class="qr" viewBox="0 0 ${size} ${size}" role="img" aria-label="QR code for the profile link" shape-rendering="crispEdges">
    <rect width="${size}" height="${size}" fill="#fff"/><path d="${d}" fill="#141611"/>
    <g transform="translate(${lo + m} ${lo + m}) scale(${s})" shape-rendering="geometricPrecision">
      <rect x="1" y="1" width="30" height="30" rx="7" fill="#fff"/>
      <path d="${LOGO_BODY}" fill="#7f9a2c"/><path d="${LOGO_LEAF}" fill="#4d5a35"/>
    </g></svg>`;
}

/** A PNG of the QR code with a caption, for saving or sending. */
async function qrPng(qr: QR, caption: string): Promise<Blob> {
  const n = qr.getModuleCount(), m = 3, cell = 12, w = (n + m * 2) * cell, h = w + 70;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#141611';
  const k = logoModules(n), lo = (n - k) / 2;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (r >= lo && r < lo + k && c >= lo && c < lo + k) continue;
    if (qr.isDark(r, c)) g.fillRect((c + m) * cell, (r + m) * cell, cell, cell);
  }
  g.save();
  g.translate((lo + m) * cell, (lo + m) * cell);
  g.scale((k * cell) / 32, (k * cell) / 32);
  g.fillStyle = '#7f9a2c'; g.fill(new Path2D(LOGO_BODY));
  g.fillStyle = '#4d5a35'; g.fill(new Path2D(LOGO_LEAF));
  g.restore();
  g.fillStyle = '#141611';
  g.textAlign = 'center';
  g.font = '600 22px "Lexend Deca", system-ui, sans-serif';
  g.fillText(caption, w / 2, w + 22);
  g.fillStyle = '#6b7353';
  g.font = '16px "Lexend Deca", system-ui, sans-serif';
  g.fillText('Jolpai Type · Bangla & English typing', w / 2, w + 50);
  return new Promise(res => cv.toBlob(b => res(b!), 'image/png'));
}

export class SharePanel {
  private dlg: HTMLDialogElement;
  private body: HTMLElement;
  private qr: QR | null = null;

  constructor(private act: ShareActions, private onChange: () => void) {
    this.dlg = document.createElement('dialog');
    this.dlg.className = 'share-dlg';
    this.dlg.setAttribute('aria-label', 'Share your profile');
    this.dlg.innerHTML = `
      <div class="sh-top"><h2>${icon('share', 18)}share your profile</h2>
        <button class="sh-close" aria-label="Close">${icon('x', 18)}</button></div>
      <div class="sh-body"></div>`;
    document.body.appendChild(this.dlg);
    this.body = this.dlg.querySelector('.sh-body')!;
    this.dlg.addEventListener('click', e => {
      if (e.target === this.dlg) { this.dlg.close(); return; } // click on the backdrop
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (b) this.onButton(b);
    });
  }

  open() {
    this.draw();
    if (!this.dlg.open) this.dlg.showModal();
  }

  private async draw() {
    const id = this.act.shareId();
    if (!this.act.signedIn()) {
      this.body.innerHTML = `
        <p class="sh-text">Sign in with Google to share your profile. People you share it with see your stats and progress, never your email.</p>
        <button class="btn primary sh-wide" data-act="signin">${icon('login', 15)}sign in to share</button>`;
      return;
    }
    if (!id) {
      this.body.innerHTML = `
        <p class="sh-text">Create a link that anyone can open to see your typing profile. It shows:</p>
        <ul class="sh-list">
          <li>${icon('user', 15)}your name, photo and join date</li>
          <li>${icon('trophy', 15)}personal bests, stats and the activity calendar</li>
          <li>${icon('clock', 15)}your last 500 results, kept up to date as you type</li>
        </ul>
        <p class="sh-note">${icon('shield', 14)}Your email is never shown. You can stop sharing at any time and the link stops working.</p>
        <button class="btn primary sh-wide" data-act="start">${icon('link', 15)}create share link</button>`;
      return;
    }
    const link = shareLink(id);
    this.body.innerHTML = `
      <div class="sh-qr-card"><div class="sh-qr">${this.qr ? qrSvg(this.qr) : '<div class="sh-qr-wait"></div>'}</div>
        <div class="sh-qr-cap">Scan to see <b>${esc(this.act.name())}</b>'s typing profile</div></div>
      <div class="sh-link"><input readonly value="${esc(link)}" aria-label="Profile link" />
        <button class="btn" data-act="copy">${icon('copy', 15)}<span>copy</span></button></div>
      <div class="sh-row">
        ${'share' in navigator ? `<button class="btn primary" data-act="share">${icon('share', 15)}share…</button>` : ''}
        <button class="btn" data-act="png">${icon('download', 15)}download QR</button>
        <a class="btn" href="${esc(link)}" target="_blank" rel="noopener">${icon('next', 15)}open</a>
      </div>
      <button class="sh-stop" data-act="stop">${icon('x', 14)}stop sharing</button>`;
    if (!this.qr) {
      this.qr = await makeQr(link);
      const box = this.body.querySelector('.sh-qr');
      if (box) box.innerHTML = qrSvg(this.qr);
    }
  }

  private async onButton(b: HTMLButtonElement) {
    if (b.classList.contains('sh-close')) { this.dlg.close(); return; }
    const id = this.act.shareId();
    switch (b.dataset.act) {
      case 'signin': this.dlg.close(); this.act.signIn(); break;
      case 'start':
        b.disabled = true; b.lastChild!.textContent = 'creating…';
        try { await this.act.start(); this.qr = null; this.onChange(); await this.draw(); }
        catch (err) { b.disabled = false; alert(`Could not share your profile: ${(err as Error).message}`); }
        break;
      case 'copy': {
        const input = this.body.querySelector('input')!;
        try { await navigator.clipboard.writeText(input.value); } catch { input.select(); document.execCommand('copy'); }
        const label = b.querySelector('span')!;
        label.textContent = 'copied!'; b.classList.add('done');
        setTimeout(() => { label.textContent = 'copy'; b.classList.remove('done'); }, 1600);
        break;
      }
      case 'share':
        if (id) navigator.share({ title: `${this.act.name()} on Jolpai Type`, text: `See my Bangla and English typing stats on Jolpai Type`, url: shareLink(id) }).catch(() => { /* cancelled */ });
        break;
      case 'png':
        if (this.qr) {
          const blob = await qrPng(this.qr, `${this.act.name()}'s typing profile`);
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'jolpai-type-profile-qr.png';
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        }
        break;
      case 'stop':
        if (!confirm('Stop sharing your profile? The link and QR code will stop working for everyone.')) return;
        b.disabled = true;
        try { await this.act.stop(); this.qr = null; this.onChange(); await this.draw(); }
        catch (err) { b.disabled = false; alert(`Could not stop sharing: ${(err as Error).message}`); }
        break;
    }
  }
}
