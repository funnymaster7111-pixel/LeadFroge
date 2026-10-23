#!/usr/bin/env node
// Usage: npm run ads -- --config clinic.json [--out out] [--only price-dual,quiz-card]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { ADS, esc } from './ads.js';
import { buildTheme, page, SIZES, DISCLAIMER, MAX_TEXT_COVERAGE } from './theme.js';
import { lint, LIMITS, CTAS } from './compliance.js';

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const [k, v] = a.slice(2).split('=');
    out[k] = v ?? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true);
  }
  return out;
}

const slugify = (s) =>
  String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.gif': 'image/gif' };

function dataUri(file) {
  const mime = MIME[path.extname(file).toLowerCase()];
  if (!mime) throw new Error(`Unsupported image type: ${file} (use png, jpg, webp or svg)`);
  return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
}

function loadConfig(file) {
  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) throw new Error(`Config not found: ${abs}`);
  const cfg = JSON.parse(fs.readFileSync(abs, 'utf8'));
  const dir = path.dirname(abs);
  const required = ['clinicName', 'city', 'phone', 'semaglutidePrice', 'tirzepatidePrice', 'newClientOffer', 'brandColors'];
  const missing = required.filter((k) => !cfg[k]);
  for (const k of ['primary', 'accent', 'background']) if (!cfg.brandColors?.[k]) missing.push(`brandColors.${k}`);
  if (missing.length) throw new Error(`clinic config is missing: ${missing.join(', ')}`);
  cfg.neighborhoods = (cfg.neighborhoods || []).filter(Boolean);
  cfg.fonts = { heading: 'Fraunces', body: 'Inter', ...(cfg.fonts || {}) };
  const resolve = (p) => {
    const f = path.resolve(dir, p);
    if (!fs.existsSync(f)) throw new Error(`File not found: ${p} (resolved to ${f})`);
    return f;
  };
  cfg._logo = cfg.logoPath ? dataUri(resolve(cfg.logoPath)) : null;
  cfg._photos = (cfg.photoPaths || []).filter(Boolean).map((p) => dataUri(resolve(p)));
  return cfg;
}

function fill(template, cfg) {
  const n = cfg.neighborhoods;
  const vars = {
    clinic: cfg.clinicName,
    city: cfg.city,
    phone: cfg.phone,
    sema: cfg.semaglutidePrice,
    tirz: cfg.tirzepatidePrice,
    offer: cfg.newClientOffer,
    n1: n[0] || cfg.city,
    n2: n[1] || n[0] || cfg.city,
  };
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

// First variant that fits the limit after filling in clinic details.
function pickCopy(variants, cfg, limit, label) {
  const filled = variants.map((v) => fill(v, cfg));
  const hit = filled.find((t) => t.length <= limit);
  if (!hit) throw new Error(`${label}: no variant fits ${limit} chars for this clinic (shortest is ${Math.min(...filled.map((t) => t.length))}).`);
  return hit;
}

function copyMd(cfg, results) {
  const lines = [
    `# ${cfg.clinicName} — GLP-1 / Medical Weight Loss Ad Set`,
    '',
    `${cfg.city} · ${results.length} ads · each as 1080×1080 (feed) and 1080×1350 (portrait)`,
    '',
    '> Before launching: target 18+ only (Meta requires this for weight-loss ads), confirm prices/offer with the clinic, and note that Meta may require LegitScript certification for prescription-drug ads.',
    `> Every image carries: *"${DISCLAIMER}"*`,
    '',
  ];
  results.forEach((r, i) => {
    lines.push(
      `## ${String(i + 1).padStart(2, '0')} · ${r.category} — \`${r.id}\``,
      '',
      `Images: \`${r.files.feed}\` · \`${r.files.portrait}\``,
      '',
      `**Primary text** (${r.copy.primary.length}/${LIMITS.primary} chars)`,
      '',
      r.copy.primary,
      '',
      `**Headline** (${r.copy.headline.length}/${LIMITS.headline} chars): ${r.copy.headline}`,
      '',
      `**CTA button:** ${r.copy.cta}`,
      '',
      `<sub>Text coverage — feed ${r.coverage.feed}% · portrait ${r.coverage.portrait}%</sub>`,
      ''
    );
  });
  return lines.join('\n');
}

function previewHtml(cfg, results) {
  const tiles = results
    .map(
      (r, i) => `<section><h2>${i + 1}. ${esc(r.category)} <code>${r.id}</code></h2>
      <div class="imgs"><img src="${r.files.feed}"><img src="${r.files.portrait}"></div>
      <p><b>Primary:</b> ${esc(r.copy.primary)}</p><p><b>Headline:</b> ${esc(r.copy.headline)} · <b>CTA:</b> ${r.copy.cta}</p></section>`
    )
    .join('');
  return `<!doctype html><meta charset="utf-8"><title>${esc(cfg.clinicName)} ads</title>
<style>body{font:15px/1.5 system-ui;margin:32px auto;max-width:1100px;padding:0 16px;color:#222}section{margin:0 0 40px}
.imgs{display:flex;gap:16px;align-items:flex-start}.imgs img{width:calc(50% - 8px);height:auto;border:1px solid #ddd;border-radius:6px}
h2{font-size:18px}code{color:#888;font-size:13px}</style><h1>${esc(cfg.clinicName)} — ad set</h1>${tiles}`;
}

async function main() {
  const opts = args(process.argv.slice(2));
  if (!opts.config) {
    console.error('Usage: npm run ads -- --config clinic.json [--out out] [--only id1,id2]');
    process.exit(1);
  }
  const cfg = loadConfig(opts.config);
  const theme = buildTheme(cfg);
  const slug = slugify(cfg.clinicName);
  const outDir = path.resolve(opts.out || 'out', slug);
  fs.mkdirSync(outDir, { recursive: true });
  const only = typeof opts.only === 'string' ? opts.only.split(',') : null;
  const ads = only ? ADS.filter((a) => only.includes(a.id)) : ADS;

  const problems = [];
  for (const [k, v] of Object.entries({ clinicName: cfg.clinicName, city: cfg.city, newClientOffer: cfg.newClientOffer, neighborhoods: cfg.neighborhoods.join(', ') }))
    for (const p of lint(v)) problems.push(`config.${k}: ${p}`);

  const browser = await chromium.launch();
  const ctxt = await browser.newContext({ deviceScaleFactor: 1 });
  const tab = await ctxt.newPage();
  const results = [];
  let photoIdx = 0;

  try {
    for (const [i, ad] of ads.entries()) {
      const num = String(ADS.indexOf(ad) + 1).padStart(2, '0');
      const copy = {
        primary: pickCopy(ad.copy.primary, cfg, LIMITS.primary, `${ad.id} primary text`),
        headline: pickCopy(ad.copy.headline, cfg, LIMITS.headline, `${ad.id} headline`),
        cta: ad.copy.cta,
      };
      if (!CTAS.includes(copy.cta)) problems.push(`${ad.id}: CTA "${copy.cta}" is not one of ${CTAS.join(', ')}`);
      for (const p of [...lint(copy.primary), ...lint(copy.headline)]) problems.push(`${ad.id} copy: ${p}`);

      const photo = ad.usesPhoto && cfg._photos.length ? cfg._photos[photoIdx++ % cfg._photos.length] : null;
      const r = { id: ad.id, category: ad.category, copy, files: {}, coverage: {} };

      for (const size of Object.values(SIZES)) {
        const { css, body, footStyle } = ad.render({ cfg, theme, size, photo, logo: cfg._logo });
        const html = page({ cfg, theme, size, adClass: ad.id, css, body, footStyle });
        await tab.setViewportSize({ width: size.w, height: size.h });
        await tab.setContent(html, { waitUntil: 'networkidle' });
        const audit = await tab.evaluate((max) => window.__fit(max), MAX_TEXT_COVERAGE);
        const file = `${num}-${ad.id}-${size.key}.png`;
        await tab.screenshot({ path: path.join(outDir, file), clip: { x: 0, y: 0, width: size.w, height: size.h } });

        const tag = `${file}`;
        r.files[size.key] = file;
        r.coverage[size.key] = Math.round(audit.coverage * 100);
        for (const issue of audit.issues) problems.push(`${tag}: ${issue}`);
        if (audit.coverage > 0.25) problems.push(`${tag}: text covers ${r.coverage[size.key]}% of the image (limit ~25%)`);
        if (!audit.text.replace(/\s+/g, ' ').includes(DISCLAIMER)) problems.push(`${tag}: disclaimer missing`);
        for (const p of lint(audit.text)) problems.push(`${tag} image text: ${p}`);
        const note = audit.shrink ? ` (headline auto-shrunk ${audit.shrink}%)` : '';
        console.log(`  ✓ ${file}  text ${r.coverage[size.key]}%${note}`);
      }
      results.push(r);
    }
  } finally {
    await browser.close();
  }

  fs.writeFileSync(path.join(outDir, 'copy.md'), copyMd(cfg, results));
  fs.writeFileSync(path.join(outDir, 'preview.html'), previewHtml(cfg, results));
  console.log(`\n${results.length} ads × 2 sizes → ${path.relative(process.cwd(), outDir) || outDir}/ (copy.md, preview.html)`);

  if (problems.length) {
    console.error(`\n⚠ ${problems.length} issue(s) need attention:\n` + problems.map((p) => `  - ${p}`).join('\n'));
    process.exit(2);
  }
  console.log('All layout + compliance checks passed.');
}

main().catch((e) => {
  console.error(`Error: ${e.message}`);
  process.exit(1);
});
