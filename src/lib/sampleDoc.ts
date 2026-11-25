/**
 * Generates a realistic skewed sample document on a wooden desk background
 * so users on desktop or without camera permissions can immediately test
 * auto edge detection, 4-corner perspective straightening, and filters.
 */
export function createSampleScanImageDataUrl(): string {
  const w = 900;
  const h = 1200;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Dark wooden desk background
  const bgGrad = ctx.createLinearGradient(0, 0, w, h);
  bgGrad.addColorStop(0, '#2a1f18');
  bgGrad.addColorStop(1, '#1a120d');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Subtle wood grain lines
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 2;
  for (let y = 0; y < h; y += 22) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(w * 0.3, y + 6, w * 0.7, y - 6, w, y);
    ctx.stroke();
  }

  // Perspective-like skewed paper polygon
  const tl = { x: 140, y: 150 };
  const tr = { x: 790, y: 115 };
  const br = { x: 825, y: 1055 };
  const bl = { x: 95, y: 1015 };

  // Drop shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur = 32;
  ctx.shadowOffsetX = 10;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = '#ebe6da';
  ctx.beginPath();
  ctx.moveTo(tl.x, tl.y);
  ctx.lineTo(tr.x, tr.y);
  ctx.lineTo(br.x, br.y);
  ctx.lineTo(bl.x, bl.y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Clip inside paper and draw realistic document contents
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(tl.x, tl.y);
  ctx.lineTo(tr.x, tr.y);
  ctx.lineTo(br.x, br.y);
  ctx.lineTo(bl.x, bl.y);
  ctx.closePath();
  ctx.clip();

  // Warm uneven ambient lighting gradient on paper
  const paperGrad = ctx.createRadialGradient(w * 0.35, h * 0.3, 80, w * 0.6, h * 0.65, 780);
  paperGrad.addColorStop(0, '#f8f5ec');
  paperGrad.addColorStop(0.65, '#e8e2d3');
  paperGrad.addColorStop(1, '#cfc7b4');
  ctx.fillStyle = paperGrad;
  ctx.fillRect(0, 0, w, h);

  // Transform slightly to match paper tilt
  ctx.translate(460, 580);
  ctx.rotate(-0.025);
  ctx.translate(-320, -410);

  // Header bar
  ctx.fillStyle = '#0f766e';
  ctx.fillRect(36, 36, 568, 8);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 34px "Kantumruy Pro", sans-serif';
  ctx.fillText('វិក្កយបត្រទូទាត់ប្រាក់ • P-SCAN', 40, 96);

  ctx.fillStyle = '#475569';
  ctx.font = '18px "Kantumruy Pro", sans-serif';
  ctx.fillText('លេខសម្គាល់៖ INV-2026-0891   |   កាលបរិច្ឆេទ៖ 25/11/2026', 40, 134);

  // Table header
  ctx.fillStyle = '#0f766e';
  ctx.fillRect(40, 170, 560, 42);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px "Kantumruy Pro", sans-serif';
  ctx.fillText('បរិយាយទំនិញ / សេវាកម្ម', 56, 198);
  ctx.fillText('ចំនួន', 370, 198);
  ctx.fillText('តម្លៃសរុប', 485, 198);

  const rows = [
    ['ម៉ាស៊ីនព្រីនឯកសារ LaserJet Pro', '1', '$245.00'],
    ['ក្រដាស A4 Double A (80gsm)', '5', '$22.50'],
    ['សេវាកម្មថែទាំ និងដំឡើងប្រព័ន្ធ', '1', '$35.00'],
    ['សៀវភៅកត់ត្រាការិយាល័យ', '4', '$14.00'],
  ];

  rows.forEach((row, idx) => {
    const y = 248 + idx * 54;
    ctx.fillStyle = idx % 2 === 0 ? 'rgba(15, 23, 42, 0.04)' : 'transparent';
    ctx.fillRect(40, y - 28, 560, 48);
    ctx.fillStyle = '#1e293b';
    ctx.font = '18px "Kantumruy Pro", sans-serif';
    ctx.fillText(row[0], 56, y);
    ctx.fillText(row[1], 385, y);
    ctx.fillText(row[2], 492, y);
  });

  // Total section
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, 478);
  ctx.lineTo(600, 478);
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 24px "Kantumruy Pro", sans-serif';
  ctx.fillText('សរុបរួម (Total):', 280, 526);
  ctx.fillStyle = '#0f766e';
  ctx.fillText('$316.50', 485, 526);

  // Red official stamp
  ctx.save();
  ctx.translate(470, 670);
  ctx.rotate(-0.18);
  ctx.strokeStyle = 'rgba(220, 38, 38, 0.78)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 58, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 48, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(220, 38, 38, 0.85)';
  ctx.font = 'bold 16px "Kantumruy Pro", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('បានទូទាត់', 0, -4);
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('PAID • VERIFIED', 0, 18);
  ctx.restore();

  // Signature line
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(60, 710);
  ctx.lineTo(240, 710);
  ctx.stroke();
  ctx.fillStyle = '#475569';
  ctx.font = '15px "Kantumruy Pro", sans-serif';
  ctx.fillText('ហត្ថលេខាអ្នកទទួលប្រាក់', 72, 736);

  ctx.restore();
  return canvas.toDataURL('image/jpeg', 0.92);
}
