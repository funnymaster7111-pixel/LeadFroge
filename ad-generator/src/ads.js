// The 10 ad concepts: copy (with length-safe fallbacks) + an HTML layout per concept.
// Layouts receive ctx = { cfg, theme, size, photo, logo } and return { css, body, footStyle? }.

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const svg = (inner, size = 40, stroke = 'currentColor', sw = 2) =>
  `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

const ICON = {
  pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.6"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  shield: '<path d="M12 3l7.5 3v5.5c0 4.6-3.1 8.3-7.5 9.5-4.4-1.2-7.5-4.9-7.5-9.5V6L12 3z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  phone: '<path d="M5 4h3.5l1.8 4.4-2.3 1.5a11 11 0 0 0 6.1 6.1l1.5-2.3L20 15.5V19a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4z"/>',
  clipboard: '<rect x="5" y="4.5" width="14" height="16.5" rx="2.5"/><path d="M9 4.5V3.5h6v1M8.5 11l2 2 4-4M8.5 16.5h7"/>',
};

const brand = (ctx, { onDark = false } = {}) => {
  if (ctx.logo) {
    const pill = onDark ? 'style="background:#fff;padding:10px 20px;border-radius:16px;height:84px"' : '';
    return `<div class="brand" ${pill}><img src="${ctx.logo}" alt="${esc(ctx.cfg.clinicName)} logo"></div>`;
  }
  return `<div class="brand"><span class="wordmark t" data-name="wordmark">${esc(ctx.cfg.clinicName)}</span></div>`;
};

const cta = (text) => `<span class="cta t" data-name="cta">${esc(text)}${svg(ICON.arrow, 26, 'currentColor', 2.4)}</span>`;

// "$99/week" -> { main: "$99", unit: "/week" }
const splitPrice = (p) => {
  const m = String(p).match(/^(.*?)(\s*\/\s*.+)$/);
  return m ? { main: m[1].trim(), unit: m[2].replace(/\s+/g, '') } : { main: String(p), unit: '' };
};

// ---------- LOCAL + MEDICALLY SUPERVISED ----------

const localProvider = {
  id: 'local-provider',
  category: 'Local + medically supervised',
  usesPhoto: true,
  copy: {
    primary: [
      'Medically supervised GLP-1 programs in {city}, led by licensed local providers. Start with a free consultation.',
      'Medically supervised GLP-1 care in {city} with licensed local providers. Free consultation.',
      'Local, provider-led GLP-1 care in {city}. Free consultation.',
    ],
    headline: ['Medical Weight Loss in {city}', 'Local Medical Weight Loss'],
    cta: 'Book Now',
  },
  render: (ctx) => {
    const { cfg, size, photo } = ctx;
    const pt = size.key === 'portrait';
    const visual = photo
      ? `<img class="ph" src="${photo}" alt="">`
      : `<div class="art">
          <svg viewBox="0 0 400 400" class="rings" aria-hidden="true">${[60, 105, 150, 195, 240]
            .map((r, i) => `<circle cx="200" cy="200" r="${r}" fill="none" stroke="currentColor" stroke-opacity="${0.28 - i * 0.045}" stroke-width="1.5"/>`)
            .join('')}</svg>
          <div class="pin">${svg(ICON.pin, pt ? 110 : 120, 'currentColor', 1.5)}</div>
        </div>`;
    return {
      css: `
      .local-provider .vis{position:absolute;left:0;top:0;bottom:var(--foot);width:40%;background:var(--deep);color:var(--accentOnDeep);overflow:hidden}
      .local-provider.portrait .vis{width:auto;right:0;bottom:auto;height:47%}
      .local-provider .ph{width:100%;height:100%;object-fit:cover;display:block}
      .local-provider .art{position:absolute;inset:0;display:grid;place-items:center}
      .local-provider .rings{position:absolute;width:150%;height:150%;color:var(--onDeep)}
      .local-provider .pin{position:relative;width:200px;height:200px;border-radius:50%;background:var(--accent);color:var(--onAccent);display:grid;place-items:center;box-shadow:0 0 0 18px rgba(255,255,255,.06)}
      .local-provider .stage{left:40%;display:flex;flex-direction:column;padding:64px 64px 56px}
      .local-provider.portrait .stage{left:0;top:47%;padding:60px 72px 52px}
      .local-provider .h{font-size:74px;margin:26px 0 26px}
      .local-provider.portrait .h{font-size:82px;margin:22px 0 22px}
      .local-provider .grow{flex:1}
      .local-provider .points{list-style:none;display:flex;flex-direction:column;gap:14px;margin-bottom:36px}
      .local-provider.portrait .points{flex-direction:row;gap:30px;margin-bottom:0}
      .local-provider .points li{display:flex;align-items:center;gap:12px;font-size:27px;font-weight:500;color:var(--ink)}
      .local-provider .points svg{color:var(--accentInk);flex:none}
      .local-provider.portrait .row{display:flex;align-items:center;justify-content:space-between;gap:24px}
      .local-provider .row .brand{flex:0 1 auto;min-width:0;align-self:center;justify-content:flex-end;text-align:right}
      .local-provider .row .cta{flex:none}
      `,
      body: `
      <div class="vis">${visual}</div>
      <div class="stage" data-bounds>
        ${pt ? '' : brand(ctx)}
        <p class="kicker t" style="margin-top:${pt ? 0 : 46}px">${esc(cfg.city)} · Medical weight loss</p>
        <h1 class="h t" data-fit>Medically supervised <em class="n">GLP-1</em> care, right here in ${esc(cfg.city)}</h1>
        <div class="grow"></div>
        ${pt ? '<div class="row">' : ''}
        <ul class="points">
          <li class="t">${svg(ICON.shield, 30, 'currentColor', 2)}Licensed local providers</li>
          <li class="t">${svg(ICON.calendar, 30, 'currentColor', 2)}Free consultation</li>
        </ul>
        ${pt ? '</div>' : ''}
        ${pt ? `<div class="row" style="margin-top:34px">${cta('Book a free consult')}${brand(ctx)}</div>` : cta('Book a free consult')}
      </div>`,
    };
  },
};

const localNeighborhoods = {
  id: 'local-neighborhoods',
  category: 'Local + medically supervised',
  copy: {
    primary: [
      'Now serving {n1}, {n2} & nearby. Provider-guided GLP-1 care close to home. Book a free consult.',
      'Serving {n1} & all of {city}. Provider-guided GLP-1 care close to home. Book a free consult.',
      'Provider-guided GLP-1 care close to home in {city}. Book a free consult.',
    ],
    headline: ["{city}'s Local GLP-1 Clinic", 'Your Local GLP-1 Clinic'],
    cta: 'Book Now',
  },
  render: (ctx) => {
    const { cfg, size } = ctx;
    const pt = size.key === 'portrait';
    const hoods = (cfg.neighborhoods || []).slice(0, pt ? 6 : 4);
    return {
      css: `
      .local-neighborhoods .radar{position:absolute;right:-260px;top:-260px;width:820px;height:820px;color:var(--primary)}
      .local-neighborhoods .stage{display:flex;flex-direction:column}
      .local-neighborhoods .badge{width:96px;height:96px;border-radius:28px;background:var(--accent);color:var(--onAccent);display:grid;place-items:center;margin:${pt ? 150 : 76}px 0 34px}
      .local-neighborhoods .h{font-size:${pt ? 92 : 84}px;max-width:860px;margin:18px 0 0}
      .local-neighborhoods .chips{display:flex;flex-wrap:wrap;gap:14px;margin-top:${pt ? 54 : 40}px;max-width:900px}
      .local-neighborhoods .chip{display:flex;align-items:center;gap:10px;font-size:26px;font-weight:500;padding:14px 22px;border-radius:999px;background:var(--card);border:1.5px solid var(--line);white-space:nowrap}
      .local-neighborhoods .chip i{width:10px;height:10px;border-radius:50%;background:var(--accent);display:block}
      .local-neighborhoods .grow{flex:1}
      .local-neighborhoods .row{display:flex;align-items:center;gap:30px}
      .local-neighborhoods .tel{display:flex;align-items:center;gap:10px;font-size:28px;font-weight:600;color:var(--ink)}
      .local-neighborhoods .tel svg{color:var(--accentInk)}
      `,
      body: `
      <svg class="radar" viewBox="0 0 400 400" aria-hidden="true">${[50, 90, 130, 170, 200]
        .map((r) => `<circle cx="200" cy="200" r="${r}" fill="none" stroke="currentColor" stroke-opacity=".12" stroke-width="1.2"/>`)
        .join('')}</svg>
      <div class="stage" data-bounds>
        ${brand(ctx)}
        <div class="badge">${svg(ICON.pin, 52, 'currentColor', 1.8)}</div>
        <p class="kicker t">Now serving ${esc(cfg.city)}</p>
        <h1 class="h t" data-fit>Provider-guided <em class="n">GLP-1</em> care, close to home</h1>
        ${hoods.length ? `<div class="chips">${hoods.map((n) => `<span class="chip t"><i></i>${esc(n)}</span>`).join('')}</div>` : ''}
        <div class="grow"></div>
        <div class="row">${cta('Book a free consult')}${cfg.phone ? `<span class="tel t">${svg(ICON.phone, 28, 'currentColor', 2)}${esc(cfg.phone)}</span>` : ''}</div>
      </div>`,
    };
  },
};

const localSeal = {
  id: 'local-seal',
  category: 'Local + medically supervised',
  usesPhoto: true,
  copy: {
    primary: [
      'Real, licensed providers right here in {city}. Your free consultation includes a medical review and a plan for you.',
      'Real, licensed providers in {city}. Free consultation with a medical review.',
      'Real, licensed local providers. Free consultation.',
    ],
    headline: ['Real Providers. Right Here.', 'Real Local Providers'],
    cta: 'Book Now',
  },
  render: (ctx) => {
    const { cfg, size, photo } = ctx;
    const pt = size.key === 'portrait';
    const D = pt ? 420 : 330;
    const ring = 'MEDICALLY SUPERVISED  •  LICENSED LOCAL PROVIDERS  •  ';
    return {
      footStyle: 'dark',
      css: `
      .local-seal{background:var(--deep);color:var(--onDeep)}
      .local-seal .stage{display:flex;flex-direction:column;align-items:center;text-align:center}
      .local-seal .seal{position:relative;width:${D}px;height:${D}px;margin:${pt ? 64 : 34}px 0 ${pt ? 54 : 34}px;flex:none}
      .local-seal .seal svg.ringtext{position:absolute;inset:0;width:100%;height:100%}
      .local-seal .core{position:absolute;inset:${D * 0.17}px;border-radius:50%;overflow:hidden;background:var(--accent);color:var(--onAccent);display:grid;place-items:center}
      .local-seal .core img{width:100%;height:100%;object-fit:cover}
      .local-seal .h{font-size:${pt ? 86 : 72}px;max-width:900px}
      .local-seal .h em{color:var(--accentOnDeep)}
      .local-seal .sub{color:${'var(--onDeep)'};opacity:.78;margin-top:22px;max-width:760px;font-size:${pt ? 32 : 29}px}
      .local-seal .brand{align-self:center}
      .local-seal .grow{flex:1}
      .local-seal .cta{align-self:center}
      `,
      body: `
      <div class="stage" data-bounds>
        ${brand(ctx, { onDark: true })}
        <div class="seal">
          <svg class="ringtext" viewBox="0 0 400 400" aria-hidden="true">
            <defs><path id="ring" d="M200,200 m-168,0 a168,168 0 1,1 336,0 a168,168 0 1,1 -336,0"/></defs>
            <circle cx="200" cy="200" r="194" fill="none" stroke="currentColor" stroke-opacity=".25" stroke-width="1.5"/>
            <text font-family="${esc(cfg.fonts.body)}, sans-serif" font-size="19.5" font-weight="600" letter-spacing="4.1" fill="currentColor" fill-opacity=".9"><textPath href="#ring">${ring}${ring}</textPath></text>
          </svg>
          <div class="core">${photo ? `<img src="${photo}" alt="">` : svg(ICON.shield, D * 0.3, 'currentColor', 1.4)}</div>
        </div>
        <h1 class="h t" data-fit>Real providers. Right here in <em>${esc(cfg.city)}</em>.</h1>
        <p class="sub t" data-fit data-min=".8">A free consultation with a licensed provider who knows your community.</p>
        <div class="grow"></div>
        ${cta('Book a free consult')}
      </div>`,
    };
  },
};

// ---------- FREE CONSULTATION (no price) ----------

const consultStart = {
  id: 'consult-where-to-start',
  category: 'Free consultation',
  copy: {
    primary: [
      'Not sure if GLP-1 medication is right for you? Start with a free, no-pressure consultation at {clinic}.',
      'Not sure if GLP-1 medication is right for you? Start with a free, no-pressure consultation.',
    ],
    headline: ['Free Weight Loss Consultation', 'Free Consultation'],
    cta: 'Book Now',
  },
  render: (ctx) => {
    const { size } = ctx;
    const pt = size.key === 'portrait';
    return {
      css: `
      .consult-where-to-start{background:var(--tint)}
      .consult-where-to-start .path{position:absolute;right:0;bottom:calc(var(--foot) + ${pt ? 150 : 40}px);width:${pt ? 1000 : 700}px;height:${pt ? 480 : 400}px}
      .consult-where-to-start .stage{display:flex;flex-direction:column}
      .consult-where-to-start .h{font-size:${pt ? 128 : 112}px;line-height:.98;margin-top:${pt ? 120 : 70}px;max-width:820px}
      .consult-where-to-start .sub{margin-top:34px;max-width:${pt ? 760 : 560}px}
      .consult-where-to-start .grow{flex:1}
      `,
      body: `
      <svg class="path" viewBox="0 0 760 430" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
        <path d="M70 380 C 230 380, 220 250, 380 250 S 520 120, 690 110" fill="none" stroke="${ctx.theme.ink}" stroke-opacity=".28" stroke-width="3" stroke-dasharray="2 14" stroke-linecap="round"/>
        <circle cx="70" cy="380" r="16" fill="none" stroke="${ctx.theme.ink}" stroke-opacity=".45" stroke-width="3"/>
        <circle cx="690" cy="110" r="44" fill="${ctx.theme.accent}" fill-opacity=".18"/>
        <circle cx="690" cy="110" r="22" fill="${ctx.theme.accent}"/>
      </svg>
      <div class="stage" data-bounds>
        ${brand(ctx)}
        <h1 class="h t" data-fit>Not sure where to <em>start?</em></h1>
        <p class="sub t" data-fit data-min=".8">Talk it through with a licensed provider. Free consultation, no pressure.</p>
        <div class="grow"></div>
        ${cta('Book Now')}
      </div>`,
    };
  },
};

const consultSteps = {
  id: 'consult-steps',
  category: 'Free consultation',
  copy: {
    primary: [
      "Here's how it works: a free consult, a licensed provider review, and a plan made for you. Book today in {city}.",
      "Here's how it works: a free consult, a licensed provider review, and a plan made for you.",
    ],
    headline: ['Your First Step Is Free', 'Start With a Free Consult'],
    cta: 'Book Now',
  },
  render: (ctx) => {
    const { size } = ctx;
    const pt = size.key === 'portrait';
    const steps = [
      ['Free consultation', 'Share your goals and health history.'],
      ['Provider review', 'A licensed provider checks if GLP-1 care fits.'],
      ['A plan for you', 'Personalized, medically supervised care.'],
    ];
    return {
      css: `
      .consult-steps .stage{display:flex;flex-direction:column}
      .consult-steps .top{display:flex;justify-content:space-between;align-items:center;gap:24px}
      .consult-steps .top .brand{flex:0 1 auto;min-width:0}
      .consult-steps .h{font-size:${pt ? 96 : 80}px;margin-top:${pt ? 84 : 48}px;max-width:820px}
      .consult-steps ol{list-style:none;margin-top:${pt ? 70 : 44}px;position:relative;display:flex;flex-direction:column;gap:${pt ? 40 : 26}px}
      .consult-steps ol:before{content:"";position:absolute;left:31px;top:30px;bottom:30px;border-left:2px dashed var(--line)}
      .consult-steps li{display:flex;gap:30px;align-items:center;position:relative}
      .consult-steps .n{flex:none;width:64px;height:64px;border-radius:50%;background:var(--card);border:2px solid var(--accent);color:var(--accentInk);display:grid;place-items:center;font-family:var(--head),serif;font-size:30px;font-weight:500}
      .consult-steps li:first-child .n{background:var(--accent);color:var(--onAccent)}
      .consult-steps .s1{font-size:${pt ? 36 : 33}px;font-weight:600;line-height:1.15}
      .consult-steps .s2{font-size:${pt ? 26 : 24}px;color:var(--muted);margin-top:4px;line-height:1.3}
      .consult-steps .grow{flex:1}
      .consult-steps .free{flex:none;white-space:nowrap;font-size:22px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--accentInk);background:var(--accentTint);padding:10px 18px;border-radius:999px}
      `,
      body: `
      <div class="stage" data-bounds>
        <div class="top">${brand(ctx)}<span class="free t">No cost to start</span></div>
        <h1 class="h t" data-fit>Your first step is <em>free.</em></h1>
        <div class="lead" style="flex:.3"></div>
        <ol>${steps
          .map(([a, b], i) => `<li><span class="n t">${i + 1}</span><div><p class="s1 t">${a}</p><p class="s2 t">${b}</p></div></li>`)
          .join('')}</ol>
        <div class="grow"></div>
        ${cta('Book your free consult')}
      </div>`,
    };
  },
};

const consultQuestions = {
  id: 'consult-questions',
  category: 'Free consultation',
  copy: {
    primary: [
      'Have questions about semaglutide or tirzepatide? Ask a licensed provider at your free consultation in {city}.',
      'Have questions about semaglutide or tirzepatide? Ask a licensed provider at a free consultation.',
    ],
    headline: ['Questions? Ask a Provider.', 'Ask a Licensed Provider'],
    cta: 'Book Now',
  },
  render: (ctx) => {
    const { size } = ctx;
    const pt = size.key === 'portrait';
    const qs = ['Is GLP-1 medication right for me?', 'What does the process look like?', 'Where do I even begin?'];
    return {
      css: `
      .consult-questions .stage{display:flex;flex-direction:column}
      .consult-questions .h{font-size:${pt ? 92 : 78}px;margin-top:${pt ? 70 : 44}px;max-width:860px}
      .consult-questions .chat{display:flex;flex-direction:column;gap:${pt ? 22 : 16}px;margin-top:${pt ? 64 : 40}px}
      .consult-questions .b{font-size:${pt ? 29 : 27}px;line-height:1.25;padding:${pt ? '22px 30px' : '18px 28px'};border-radius:30px;max-width:640px;white-space:nowrap}
      .consult-questions .q{background:var(--card);border:1.5px solid var(--line);border-bottom-left-radius:8px;align-self:flex-start;color:var(--ink)}
      .consult-questions .q:nth-child(2){margin-left:70px}
      .consult-questions .a{background:var(--deep);color:var(--onDeep);border-bottom-right-radius:8px;align-self:flex-end;font-weight:600}
      .consult-questions .grow{flex:1}
      `,
      body: `
      <div class="stage" data-bounds>
        ${brand(ctx)}
        <div class="lead"></div>
        <h1 class="h t" data-fit>Questions? Ask a <em>licensed provider.</em></h1>
        <div class="chat">
          ${qs.slice(0, pt ? 3 : 2).map((q) => `<p class="b q t">${q}</p>`).join('')}
          <p class="b a t">Let's talk. Your consultation is free.</p>
        </div>
        <div class="grow"></div>
        ${cta('Book Now')}
      </div>`,
    };
  },
};

// ---------- PRICE CARDS ----------

const priceDual = {
  id: 'price-dual',
  category: 'Price card',
  copy: {
    primary: [
      'Provider-supervised GLP-1 programs in {city}. Semaglutide from {sema}. Tirzepatide from {tirz}. New clients: {offer}.',
      'Provider-supervised GLP-1 programs in {city}. Semaglutide from {sema}. New clients: {offer}.',
      'GLP-1 programs from {sema}. New clients: {offer}.',
    ],
    headline: ['{offer} for New Clients', 'New Client Offer'],
    cta: 'Get Offer',
  },
  render: (ctx) => {
    const { cfg, size } = ctx;
    const pt = size.key === 'portrait';
    const card = (name, price) => {
      const p = splitPrice(price);
      return `<div class="pc"><p class="nm t">${name}</p><p class="fr t">Programs from</p>
        <p class="pr t" data-fit data-min=".7"><span>${esc(p.main)}</span><small>${esc(p.unit)}</small></p></div>`;
    };
    return {
      css: `
      .price-dual{background:var(--tint)}
      .price-dual .stage{display:flex;flex-direction:column}
      .price-dual .h{font-size:${pt ? 90 : 74}px;margin-top:${pt ? 70 : 42}px;max-width:820px}
      .price-dual .cards{display:flex;gap:28px;margin-top:${pt ? 64 : 40}px}
      .price-dual .pc{flex:1;min-width:0;background:var(--card);border-radius:30px;padding:${pt ? '44px 40px' : '34px 36px'};box-shadow:0 1px 0 var(--line),0 18px 40px -26px rgba(0,0,0,.25)}
      .price-dual .pc:first-child{border-top:6px solid var(--accent)}
      .price-dual .pc:last-child{border-top:6px solid var(--primary)}
      .price-dual .nm{font-size:30px;font-weight:600}
      .price-dual .fr{font-size:22px;color:var(--muted);margin-top:${pt ? 34 : 20}px;text-transform:uppercase;letter-spacing:.12em;font-weight:600}
      .price-dual .pr{font-family:var(--head),serif;font-size:${pt ? 104 : 92}px;line-height:1;letter-spacing:-0.03em;margin-top:8px;white-space:nowrap}
      .price-dual .pr small{font-family:var(--body),sans-serif;font-size:.3em;letter-spacing:0;color:var(--muted);margin-left:6px;font-weight:500}
      .price-dual .grow{flex:1}
      .price-dual .row{display:flex;align-items:center;justify-content:space-between;gap:24px}
      .price-dual .offer{display:flex;align-items:center;gap:12px;font-size:28px;font-weight:600;color:var(--ink)}
      .price-dual .offer i{font-style:normal;font-size:20px;letter-spacing:.14em;text-transform:uppercase;color:var(--accentInk)}
      `,
      body: `
      <div class="stage" data-bounds>
        ${brand(ctx)}
        <div class="lead"></div>
        <h1 class="h t" data-fit>Medically supervised <em class="n">GLP-1</em> programs</h1>
        <div class="cards">${card('Semaglutide', cfg.semaglutidePrice)}${card('Tirzepatide', cfg.tirzepatidePrice)}</div>
        <div class="grow"></div>
        <div class="row"><p class="offer t" data-fit data-min=".75"><i>New clients</i>${esc(cfg.newClientOffer)}</p>${cta('Get Offer')}</div>
      </div>`,
    };
  },
};

const priceFrom = {
  id: 'price-from',
  category: 'Price card',
  copy: {
    primary: [
      'Semaglutide programs from {sema}, supervised by licensed providers in {city}. New clients: {offer}.',
      'Semaglutide programs from {sema} in {city}. New clients: {offer}.',
      'Semaglutide programs from {sema}. New client offer inside.',
    ],
    headline: ['GLP-1 Programs From {sema}', 'GLP-1 Programs, Clearly Priced'],
    cta: 'Get Offer',
  },
  render: (ctx) => {
    const { cfg, size } = ctx;
    const pt = size.key === 'portrait';
    const p = splitPrice(cfg.semaglutidePrice);
    const topH = pt ? 640 : 520;
    return {
      css: `
      .price-from .top{position:absolute;left:0;right:0;top:0;height:${topH}px;background:var(--deep);color:var(--onDeep);padding:64px 72px;display:flex;flex-direction:column}
      .price-from .top .kicker{color:var(--accentOnDeep);margin-top:auto}
      .price-from .big{font-family:var(--head),serif;font-weight:400;letter-spacing:-0.04em;line-height:.9;font-size:${pt ? 250 : 220}px;margin-top:14px;white-space:nowrap;font-variation-settings:"opsz" 144}
      .price-from .big small{font-family:var(--body),sans-serif;font-size:.2em;letter-spacing:0;margin-left:14px;opacity:.75;font-weight:500}
      .price-from .from{font-size:34px;font-weight:500;opacity:.85}
      .price-from .stage{top:${topH}px;display:flex;flex-direction:column;padding:${pt ? '56px 72px 52px' : '44px 72px 44px'}}
      .price-from .label{font-size:${pt ? 40 : 36}px;font-weight:600;line-height:1.2}
      .price-from .coupon{margin-top:${pt ? 34 : 24}px;display:flex;align-items:center;gap:18px;border:2.5px dashed var(--accent);border-radius:20px;padding:20px 26px;align-self:flex-start;background:var(--accentTint)}
      .price-from .coupon b{font-size:20px;letter-spacing:.14em;text-transform:uppercase;color:var(--accentInk)}
      .price-from .coupon span{font-size:30px;font-weight:600;white-space:nowrap}
      .price-from .grow{flex:1}
      .price-from .row{display:flex;align-items:center;justify-content:space-between}
      .price-from .brandslot{position:absolute;top:56px;right:72px}
      `,
      body: `
      <div class="top" data-bounds>
        ${brand(ctx, { onDark: true })}
        <p class="kicker t">${esc(cfg.city)} · Semaglutide</p>
        <p class="from t">Programs from</p>
        <p class="big t" data-fit data-min=".6">${esc(p.main)}<small>${esc(p.unit)}</small></p>
      </div>
      <div class="stage" data-bounds>
        <p class="label t" data-fit data-min=".75">Medically supervised GLP-1 programs</p>
        <div class="coupon"><b class="t">New clients</b><span class="t" data-fit data-min=".7">${esc(cfg.newClientOffer)}</span></div>
        <div class="grow"></div>
        ${cta('Get Offer')}
      </div>`,
    };
  },
};

// ---------- 2-MINUTE QUIZ ----------

const quizCard = {
  id: 'quiz-card',
  category: '2-minute quiz',
  copy: {
    primary: [
      'Take our 2-minute quiz to see if GLP-1 medication may be right for you. A licensed provider reviews every answer.',
      'Take our 2-minute quiz to see if GLP-1 medication may be right for you.',
    ],
    headline: ['See If You Qualify', 'Take the 2-Minute Quiz'],
    cta: 'Learn More',
  },
  render: (ctx) => {
    const { size } = ctx;
    const pt = size.key === 'portrait';
    const opts = ['Yes', 'No', 'Not sure yet'];
    return {
      css: `
      .quiz-card{background:var(--tint2)}
      .quiz-card .stage{display:flex;flex-direction:column}
      .quiz-card .h{font-size:${pt ? 98 : 82}px;margin-top:${pt ? 60 : 36}px}
      .quiz-card .sub{margin-top:14px}
      .quiz-card .card{margin-top:${pt ? 56 : 34}px;background:var(--card);border-radius:32px;padding:${pt ? '40px 44px' : '30px 38px'};box-shadow:0 30px 60px -36px rgba(0,0,0,.35)}
      .quiz-card .prog{display:flex;align-items:center;justify-content:space-between;font-size:21px;font-weight:600;color:var(--muted);letter-spacing:.08em;text-transform:uppercase}
      .quiz-card .bar{height:8px;border-radius:8px;background:var(--line);margin-top:14px;overflow:hidden}
      .quiz-card .bar i{display:block;height:100%;width:17%;background:var(--accent);border-radius:8px}
      .quiz-card .qq{font-size:${pt ? 34 : 31}px;font-weight:600;line-height:1.25;margin:${pt ? 30 : 22}px 0 ${pt ? 22 : 16}px}
      .quiz-card .opt{display:flex;align-items:center;gap:18px;font-size:${pt ? 28 : 26}px;padding:${pt ? 18 : 13}px 22px;border:1.5px solid var(--line);border-radius:16px;margin-top:${pt ? 14 : 10}px}
      .quiz-card .opt i{width:26px;height:26px;border-radius:50%;border:2px solid var(--line);flex:none}
      .quiz-card .opt.on{border-color:var(--accent);background:var(--accentTint)}
      .quiz-card .opt.on i{border:8px solid var(--accent)}
      .quiz-card .grow{flex:1}
      .quiz-card .row{display:flex;align-items:center;justify-content:space-between}
      `,
      body: `
      <div class="stage" data-bounds>
        ${brand(ctx)}
        <div class="lead"></div>
        <h1 class="h t" data-fit>See if you <em>qualify.</em></h1>
        <p class="sub t">A 2-minute quiz, reviewed by a licensed provider.</p>
        <div class="card">
          <div class="prog"><span class="t">Question 1 of 6</span><span class="t">2 min</span></div>
          <div class="bar"><i></i></div>
          <p class="qq t" data-fit data-min=".8">Have you talked with a provider about GLP-1 medication before?</p>
          ${opts.slice(0, pt ? 3 : 2).map((o, i) => `<div class="opt${i === 1 ? ' on' : ''}"><i></i><span class="t">${o}</span></div>`).join('')}
        </div>
        <div class="grow"></div>
        ${cta('Start the quiz')}
      </div>`,
    };
  },
};

const quizTimer = {
  id: 'quiz-timer',
  category: '2-minute quiz',
  copy: {
    primary: [
      'Curious about semaglutide or tirzepatide? Our quick quiz helps you see if you may qualify. Free and private.',
      'Curious about GLP-1 medication? Take our quick quiz to see if you may qualify.',
    ],
    headline: ['Take the 2-Minute Quiz', 'See If You Qualify'],
    cta: 'Learn More',
  },
  render: (ctx) => {
    const { size } = ctx;
    const pt = size.key === 'portrait';
    const R = 150;
    const C = 2 * Math.PI * R;
    const items = ['Quick, private online quiz', 'Reviewed by a licensed provider', 'No cost, no obligation'];
    return {
      css: `
      .quiz-timer .stage{display:flex;flex-direction:column}
      .quiz-timer .main{display:flex;gap:56px;align-items:center;margin-top:${pt ? 70 : 46}px}
      .quiz-timer.portrait .main{flex-direction:column;align-items:flex-start;gap:54px}
      .quiz-timer .dial{position:relative;flex:none;width:${pt ? 360 : 330}px;height:${pt ? 360 : 330}px}
      .quiz-timer .dial svg{position:absolute;inset:0;transform:rotate(-90deg)}
      .quiz-timer .dial .num{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
      .quiz-timer .dial b{font-family:var(--head),serif;font-weight:400;font-size:${pt ? 170 : 150}px;line-height:.85;letter-spacing:-0.04em}
      .quiz-timer .dial span{font-size:24px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);margin-top:8px}
      .quiz-timer .h{font-size:${pt ? 88 : 66}px}
      .quiz-timer ul{list-style:none;margin-top:${pt ? 54 : 40}px;display:flex;flex-direction:column;gap:${pt ? 20 : 16}px}
      .quiz-timer li{display:flex;align-items:center;gap:16px;font-size:${pt ? 30 : 28}px;font-weight:500}
      .quiz-timer li svg{flex:none;color:var(--onAccent);background:var(--accent);border-radius:50%;padding:6px}
      .quiz-timer .grow{flex:1}
      `,
      body: `
      <div class="stage" data-bounds>
        ${brand(ctx)}
        <div class="lead"></div>
        <div class="main">
          <div class="dial">
            <svg viewBox="0 0 340 340" aria-hidden="true">
              <circle cx="170" cy="170" r="${R}" fill="none" stroke="${ctx.theme.line}" stroke-width="14"/>
              <circle cx="170" cy="170" r="${R}" fill="none" stroke="${ctx.theme.accent}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${(C * 0.62).toFixed(1)} ${C.toFixed(1)}"/>
            </svg>
            <div class="num"><b class="t">2</b><span class="t">minutes</span></div>
          </div>
          <h1 class="h t" data-fit>Could <em class="n">GLP-1</em> medication be right for you?</h1>
        </div>
        <ul>${items.map((i) => `<li class="t">${svg(ICON.check, 34, 'currentColor', 2.6)}${i}</li>`).join('')}</ul>
        <div class="grow"></div>
        ${cta('Take the quiz')}
      </div>`,
    };
  },
};

export const ADS = [
  localProvider,
  localNeighborhoods,
  localSeal,
  consultStart,
  consultSteps,
  consultQuestions,
  priceDual,
  priceFrom,
  quizCard,
  quizTimer,
];
