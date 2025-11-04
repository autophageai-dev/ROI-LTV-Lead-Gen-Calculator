(() => {
  'use strict';

  /* === PRESETS (unchanged except conv range already 10–20% in your flow) === */
  const PRESETS = {
    technology:  { sale:500,  margin:80, conv:20, annual:0 },
    roofing:     { sale:12000, margin:25, conv:18, annual:900 },
    solar:       { sale:18000, margin:22, conv:15, annual:300 },
    hvac:        { sale:6500,  margin:28, conv:22, annual:450 },
    plumbing:    { sale:3500,  margin:30, conv:25, annual:300 },
    landscaping: { sale:2500,  margin:35, conv:25, annual:600 },
    pool:        { sale:8500,  margin:27, conv:20, annual:700 },
    realestate:  { sale:15000, margin:40, conv:8,  annual:0   },
    insurance:   { sale:2000,  margin:50, conv:10, annual:600 },
    legal:       { sale:8000,  margin:45, conv:12, annual:0   },
    coaching:    { sale:6000,  margin:60, conv:12, annual:1200},
    dental:      { sale:4500,  margin:30, conv:20, annual:300 },
    medspa:      { sale:3500,  margin:35, conv:22, annual:600 },
    fitness:     { sale:1200,  margin:55, conv:18, annual:600 },
    automotive:  { sale:5500,  margin:25, conv:20, annual:350 },
    other:       { sale:0,     margin:0,  conv:0,  annual:0   }
  };

  /* === DISCOUNTS (unchanged) === */
  function getDiscount(volume){
    if (volume >= 250) return { percent: 50, label: '50% Volume Discount' };
    if (volume >= 100) return { percent: 40, label: '40% Volume Discount' };
    if (volume >= 50)  return { percent: 25, label: '25% Volume Discount' };
    if (volume >= 25)  return { percent: 10, label: '10% Volume Discount'  };
    return { percent: 0, label: 'Standard Rate' };
  }

  /* === DOM === */
  const $ = id => document.getElementById(id);
  const els = {
    tiles: $('tiles'), volSlider: $('volSlider'), volVal: $('volVal'),
    vbLeads: $('vbLeads'), vbDisc: $('vbDisc'), vbCPL: $('vbCPL'), vbSpend: $('vbSpend'),
    liveCPL: $('liveCPL'), liveTotal: $('liveTotal'),
    liveCPL_m: $('liveCPL_m'), liveTotal_m: $('liveTotal_m'), // NEW mobile mirrors

    retTiles: $('retTiles'), years: $('years'),

    company: $('company'), ind: $('ind'), sale: $('sale'),
    margin: $('margin'), conv: $('conv'), annual: $('annual'),
    marginVal: $('marginVal'), convVal: $('convVal'),
    growth: $('growth'), growthVal: $('growthVal'), // NEW growth slider

    btnCalc: $('btnCalc'),

    panelResults: $('panelResults'),
    r_sales: $('r_sales'), r_rev: $('r_rev'), r_cpl_be: $('r_cpl_be'), r_cpl: $('r_cpl'),
    r_profit: $('r_profit'), r_roi: $('r_roi'), roiBigVal: $('roiBigVal'), narr: $('narr'),

    chartSpend: $('chartSpend'), chartLtv: $('chartLtv'), emptySpend: $('emptySpend'), emptyLtv: $('emptyLtv'),

    lockPanel: $('lockPanel'), lockWas: $('lockWas'), lockNow: $('lockNow'),
    btnLock: $('btnLock'), btnCopyLink: $('btnCopyLink'),
    lockTimer: $('lockTimer'),

    emailToken: $('emailToken')
  };

  const clamp = (v,min,max)=>Math.min(max, Math.max(min,v));
  const fmt = (n, d=2) => (isFinite(n)?Number(n):0).toFixed(d);

  function animateNumber(el, start, end, duration=700, decimals=2){
    if (!el) return;
    const t0 = performance.now();
    const ease = t=>1-Math.pow(1-t,3);
    function f(t){
      const p = clamp((t - t0)/duration, 0, 1);
      const val = start + (end - start) * ease(p);
      el.textContent = (decimals===0 ? Math.round(val) : val.toFixed(decimals));
      el.classList.remove('countup'); void el.offsetWidth; el.classList.add('countup');
      if (p<1) requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
  }

  /* === STATE === */
  let calc = {
    sale:0, margin:0, conv:0, years:3, annual:0,
    growth:1.2, // NEW
    profitPerSale:0, cplBE:0, ourCPL:0, predictedSales:0, sRevenue:0, sSpend:0, sProfit:0, sROI:0,
    lRevenue:0, lProfit:0, lVPL:0, lROI:0,
    volume:25 // Default to 25 (changed from 50)
  };

  /* === CHARTS (unchanged visuals) === */
  let charts = { spend:null, ltv:null };
  function initCharts(){
    charts.spend = new Chart(els.chartSpend.getContext('2d'), {
      type:'line',
      data:{ labels:[], datasets:[
        {
          label:'Revenue', data:[],
          borderColor:'#00e6e6', backgroundColor:'rgba(0,230,230,.18)',
          borderWidth:2, tension:.3, fill:true, pointRadius:3, pointBackgroundColor:'#00ff80'
        },
        {
          label:'Break-even (Revenue = Spend)', data:[],
          borderColor:'rgba(255,255,255,.35)', borderDash:[6,6], fill:false, tension:0, pointRadius:0
        }
      ]},
      options:{
        responsive:true, maintainAspectRatio:false,
        animation:{ duration:800, easing:'easeOutCubic' },
        plugins:{ legend:{ labels:{ color:'#cfe' } }, tooltip:{ mode:'index', intersect:false } },
        scales:{
          x:{ ticks:{ color:'#cfe' }, grid:{ color:'rgba(255,255,255,.08)' } },
          y:{ ticks:{ color:'#cfe' }, grid:{ color:'rgba(255,255,255,.08)' }, beginAtZero:true }
        }
      }
    });

    charts.ltv = new Chart(els.chartLtv.getContext('2d'), {
      type:'bar',
      data:{ labels:[], datasets:[
        { label:'Lifetime Profit by Year', data:[], backgroundColor:'rgba(0,255,128,.28)', borderColor:'#00ff80', borderWidth:2 }
      ]},
      options:{
        responsive:true, maintainAspectRatio:false,
        animation:{ duration:800, easing:'easeOutCubic' },
        plugins:{ legend:{ labels:{ color:'#cfe' } } },
        scales:{
          x:{ ticks:{ color:'#cfe' }, grid:{ color:'rgba(255,255,255,.08)' } },
          y:{ ticks:{ color:'#cfe' }, grid:{ color:'rgba(255,255,255,.08)' }, beginAtZero:true }
        }
      }
    });
  }
  initCharts();

  /* === PRESET FILL === */
  function applyPreset(key){
    const p = PRESETS[key];
    if(!p) return;
    els.sale.value   = p.sale;
    els.margin.value = p.margin;
    els.conv.value   = p.conv;
    els.annual.value = p.annual || '';
    els.marginVal.textContent = p.margin + '%';
    els.convVal.textContent   = p.conv + '%';
    updateLivePrice();
  }
  els.ind.addEventListener('change', ()=> applyPreset(els.ind.value));
  els.margin.addEventListener('input', ()=> { els.marginVal.textContent = els.margin.value + '%'; updateLivePrice(); });
  els.conv.addEventListener('input',   ()=> { els.convVal.textContent   = els.conv.value   + '%'; updateLivePrice(); });
  els.sale.addEventListener('input', updateLivePrice);
  els.annual.addEventListener('input', updateLivePrice);

  // NEW: Growth slider UI
  els.growth?.addEventListener('input', ()=>{
    const g = parseFloat(els.growth.value) || 1;
    calc.growth = g;
    if (els.growthVal) els.growthVal.textContent = g.toFixed(2)+'x';
  });

  /* === RETENTION TILES === */
  function setRetentionYears(y){
    calc.years = y;
    els.years.value = y;
    (els.retTiles.querySelectorAll('.tile')||[]).forEach(t=>{
      t.classList.toggle('active', parseInt(t.dataset.years,10)===y);
    });
  }
  els.retTiles?.addEventListener('click', (e)=>{
    const tile = e.target.closest('.tile'); if(!tile) return;
    setRetentionYears(parseInt(tile.dataset.years,10)||1);
  });

  /* === VOLUME UI === */
  const tileEls = Array.from(els.tiles?.querySelectorAll('.tile')||[]);
  function setTiles(v){ tileEls.forEach(t=>t.classList.toggle('active', parseInt(t.dataset.vol,10)===v)); }
  function computeOurCPLFromInputs(){
    const sale   = parseFloat(els.sale.value)   || 0;
    const margin = (parseFloat(els.margin.value)||0) / 100;
    const conv   = (parseFloat(els.conv.value)  ||0) / 100;
    if (sale<=0 || margin<=0 || conv<=0) return 0;
    const profitPerSale = sale * margin;
    const cplBreakEven  = profitPerSale * conv;
    return cplBreakEven * 0.5; // our baseline CPL
  }
  function updateLockPrices(currentCPL){
    const was = calc.ourCPL || 0;
    const now = (currentCPL!=null) ? currentCPL : was;
    els.lockWas && (els.lockWas.textContent = fmt(was));
    els.lockNow && (els.lockNow.textContent = fmt(now));
  }
  function mirrorLive(cpl,total){
    if (els.liveCPL)   animateNumber(els.liveCPL,   parseFloat(els.liveCPL?.textContent)||0,   cpl||0, 400, 2);
    if (els.liveTotal) animateNumber(els.liveTotal, parseFloat(els.liveTotal?.textContent)||0, total||0, 400, 2);
    // Mobile mirrors:
    if (els.liveCPL_m)   els.liveCPL_m.textContent   = (isFinite(cpl)?cpl:0).toFixed(2);
    if (els.liveTotal_m) els.liveTotal_m.textContent = (isFinite(total)?total:0).toFixed(2);
  }
  function updateVolumeBar(){
    const v = calc.volume||0;
    setTiles(v);
    els.vbLeads && (els.vbLeads.textContent = v);
    const {percent} = getDiscount(v);
    els.vbDisc && (els.vbDisc.textContent = percent + '%');

    const base = computeOurCPLFromInputs();
    const cpl = base * (1 - percent/100);
    els.vbCPL && (els.vbCPL.textContent = base ? '$'+fmt(cpl) : '—');
    els.vbSpend && (els.vbSpend.textContent = base ? '$'+fmt(cpl*v) : '—');

    mirrorLive(cpl, (cpl||0)*v);

    if (calc.ourCPL > 0) updateLockPrices(cpl);
  }
  function updateLivePrice(){
    const base = computeOurCPLFromInputs();
    const {percent} = getDiscount(calc.volume||0);
    const cpl = base * (1 - percent/100);
    mirrorLive(cpl, (cpl||0) * (calc.volume||0));
    els.vbCPL && (els.vbCPL.textContent = base ? '$'+fmt(cpl) : '—');
    els.vbSpend && (els.vbSpend.textContent = base ? '$'+fmt(cpl*(calc.volume||0)) : '—');
  }
  els.volSlider?.addEventListener('input', ()=>{
    const v = parseInt(els.volSlider.value,10)||0;
    els.volVal && (els.volVal.textContent = v + ' Leads');
    calc.volume = v;
    updateVolumeBar();
  });
  els.tiles?.addEventListener('click', (e)=>{
    const tile = e.target.closest('.tile'); if(!tile) return;
    const v = parseInt(tile.dataset.vol,10)||0;
    els.volSlider && (els.volSlider.value = v);
    els.volVal && (els.volVal.textContent = v + ' Leads');
    calc.volume = v;
    updateVolumeBar();
  });

  /* === CALCULATE (unchanged flow, with growth applied to revenue) === */
  let countdownTimer = null;
  function startCountdown(seconds=300){
    clearInterval(countdownTimer);
    const end = Date.now() + seconds*1000;
    const tick = () => {
      const remain = Math.max(0, Math.floor((end - Date.now())/1000));
      const m = String(Math.floor(remain/60)).padStart(2,'0');
      const s = String(remain%60).padStart(2,'0');
      if (els.lockTimer) els.lockTimer.textContent = `${m}:${s}`;
      if (remain<=0){
        clearInterval(countdownTimer);
        if (els.btnLock) { els.btnLock.disabled = true; }
        const note = document.getElementById('lockNote');
        if (note) note.textContent = 'Offer expired — recalculate to generate a new special.';
      }
    };
    tick();
    countdownTimer = setInterval(tick, 300);
  }

  function calculate(){
    // Ensure live price & discount are current
    updateVolumeBar();

    const company= (els.company.value||'').trim();
    const sale   = parseFloat(els.sale.value)   || 0;
    const margin = (parseFloat(els.margin.value)|| 0)/100;
    const conv   = (parseFloat(els.conv.value)  || 0)/100;
    const years  = parseFloat(els.years.value)  || 1;
    const annual = parseFloat(els.annual.value) || 0;
    const growth = parseFloat(els.growth?.value)|| calc.growth || 1;

    if (sale<=0){ alert('Please enter a valid Avg. Sale Value.'); return; }

    // Use actual selected volume & discounted CPL
    const leads  = calc.volume || parseInt(els.volSlider.value,10) || 25;
    const profitPerSale = sale * margin;
    const cplBreakEven  = profitPerSale * conv;
    const baseCPL       = cplBreakEven * 0.5;
    const { percent }   = getDiscount(leads);
    const discountedCPL = baseCPL * (1 - percent/100);

    // Short-term campaign metrics
    const predictedSales= leads * conv;
    const sRevenueBase  = sale * predictedSales;
    const sRevenue      = sRevenueBase * growth;   // apply growth multiplier (conservative)
    const sSpend        = discountedCPL * leads;   // spend unchanged
    const sProfit       = sRevenue - sSpend;
    const sROI          = sSpend>0 ? sRevenue / sSpend : 0;

    // Lifetime value contribution
    const lRevenue      = annual * years;
    const lProfit       = lRevenue * margin;
    const lVPL          = lProfit * conv;
    const lROI          = sSpend>0 ? (lProfit * predictedSales) / sSpend : 0;

    calc = { sale, margin, conv, years, annual, growth,
      profitPerSale, cplBE:cplBreakEven, ourCPL:baseCPL,
      predictedSales, sRevenue, sSpend, sProfit, sROI,
      lRevenue, lProfit, lVPL, lROI,
      volume: leads
    };

    els.panelResults.style.display = 'block';
    els.lockPanel.style.display = 'flex';
    els.btnLock.disabled = false;

    animateNumber(els.r_sales,  0, predictedSales, 900, 1);
    animateNumber(els.r_rev,    0, sRevenue,      900, 2);
    animateNumber(els.r_cpl_be, 0, cplBreakEven,  900, 2);
    animateNumber(els.r_cpl,    0, discountedCPL, 900, 2);
    animateNumber(els.r_profit, 0, sProfit,       900, 2);
    animateNumber(els.r_roi,    0, sROI,          900, 1);
    animateNumber(els.roiBigVal,0, sROI,          900, 1);

    const cName = company ? `<strong>${company}</strong> could` : `You could`;
    els.narr.innerHTML = `
      ${cName} expect about <strong>${predictedSales.toFixed(1)} new customers</strong> from a <strong>${leads}-lead campaign</strong> at a
      <strong>${(conv*100).toFixed(0)}%</strong> close rate, with an average sale value of <strong>$${sale.toLocaleString()}</strong>.
      Accounting for a growth multiplier of <strong>${growth.toFixed(2)}x</strong>, projected revenue is <strong>$${sRevenue.toFixed(2)}</strong>.
      With a <strong>${(margin*100).toFixed(0)}%</strong> profit margin, your break-even CPL is <strong>$${cplBreakEven.toFixed(2)}</strong>.
      Based on your selected volume, the discounted CPL is <strong>$${discountedCPL.toFixed(2)}</strong>, producing a short-term ROI of <strong>${sROI.toFixed(1)}x</strong>.
      Assuming customers stay <strong>${years}</strong> years and spend <strong>$${annual.toLocaleString()}</strong> per year,
      the lifetime profit per customer is ~<strong>$${lProfit.toFixed(2)}</strong>, or <strong>$${lVPL.toFixed(2)}</strong> in value per lead.
    `;

    // Update lock price visuals to match discounted CPL
    if (els.lockWas) els.lockWas.textContent = fmt(baseCPL);
    if (els.lockNow) els.lockNow.textContent = fmt(discountedCPL);

    updateCharts();
    startCountdown(300);

    // Smooth scroll (slightly less than full anchor so graphs remain in view)
    setTimeout(()=>{
      const band = document.querySelector('.convert-band');
      if (band) {
        const y = band.getBoundingClientRect().top + window.scrollY - 180;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 120);
  }
  $('btnCalc')?.addEventListener('click', calculate);

  function updateCharts(){
    if(!charts.spend || !charts.ltv) return;
    const vols = [10,20,30,40,50,60,70,80,90,100];
    const rev = [], spend = [];
    vols.forEach(v=>{
      const baseCPL = calc.ourCPL || computeOurCPLFromInputs();
      const {percent} = getDiscount(v);
      const cpl = baseCPL * (1 - percent/100);
      const s = cpl * v;
      const r = (v * calc.conv) * calc.sale * (calc.growth||1); // growth applied to revenue series too
      spend.push(s); rev.push(r);
    });
    els.emptySpend.style.display = 'none';
    charts.spend.data.labels = spend.map(v=>'$'+fmt(v));
    charts.spend.data.datasets[0].data = rev;
    charts.spend.data.datasets[1].data = spend;
    charts.spend.update();

    const yrs = Math.max(1, Math.round(calc.years));
    const labels = Array.from({length: yrs}, (_,i)=> (i+1)+'y');
    const bars = labels.map((_,i)=> (calc.annual * (i+1) * calc.margin));
    els.emptyLtv.style.display = 'none';
    charts.ltv.data.labels = labels;
    charts.ltv.data.datasets[0].data = bars;
    charts.ltv.update();
  }

  /* === LOCK / SHARE (unchanged) === */
  function getCurrentDiscountedCPL(){
    const {percent} = getDiscount(calc.volume||0);
    const base = calc.ourCPL || computeOurCPLFromInputs();
    return base * (1 - percent/100);
  }
  function buildShareURL(){
    const params = new URLSearchParams({
      company: $('company').value || '',
      industry: $('ind').value || '',
      sale: $('sale').value || '',
      margin: $('margin').value || '',
      conv: $('conv').value || '',
      years: $('years').value || '',
      annual: $('annual').value || '',
      volume: calc.volume || '',
      growth: $('growth')?.value || ''
    });
    return `${location.origin}${location.pathname}?${params.toString()}`;
  }
  function genToken(){
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let t = 'RATE-';
    for(let i=0;i<6;i++) t += chars[Math.floor(Math.random()*chars.length)];
    return t;
  }
  $('btnLock')?.addEventListener('click', ()=>{
    const {percent} = getDiscount(calc.volume||0);
    const finalCPL = getCurrentDiscountedCPL();
    const totalCost = finalCPL * (calc.volume||0);
    const token = genToken();
    const deal = {
      token,
      company: $('company').value || '',
      industry: $('ind').value || '',
      sale: parseFloat($('sale').value)||0,
      margin: parseFloat($('margin').value)||0,
      conv: parseFloat($('conv').value)||0,
      years: parseFloat($('years').value)||0,
      annual: parseFloat($('annual').value)||0,
      growth: parseFloat($('growth')?.value)||calc.growth||1,
      leads: calc.volume || 0,
      discountPercent: percent,
      finalCPL: finalCPL,
      totalCost: totalCost,
      timestamp: Date.now()
    };
    try{ localStorage.setItem('autophageDeal', JSON.stringify(deal)); } catch(e){}
    $('emailToken') && ($('emailToken').value = `Deal ${deal.token} — ${deal.leads} leads @ $${finalCPL.toFixed(2)}/lead (disc ${percent}%).`);
    window.location.href = '/pages/deal-checkout?deal_token=' + encodeURIComponent(token);
  });
  $('btnCopyLink')?.addEventListener('click', async ()=>{
    const url = buildShareURL();
    try{ await navigator.clipboard.writeText(url); $('lockNote').textContent = 'Share link copied to clipboard.'; }
    catch{ $('lockNote').textContent = url; }
    $('emailToken') && ($('emailToken').value = url);
  });

  /* === INIT === */
  function firstMount(){
    applyPreset('technology');
    setRetentionYears(3);
    // Default volume 25 (tile + slider + summaries)
    calc.volume = 25;
    if ($('volSlider')) $('volSlider').value = 25;
    if ($('volVal')) $('volVal').textContent = '25 Leads';
    // activate 25 tile
    (els.tiles?.querySelectorAll('.tile')||[]).forEach(t=>t.classList.toggle('active', t.dataset.vol==='25'));
    // Set growth UI
    if (els.growthVal) els.growthVal.textContent = (calc.growth||1.2).toFixed(2)+'x';
    updateVolumeBar(); // primes live badges (desktop+mobile)
  }
  firstMount();

})();
