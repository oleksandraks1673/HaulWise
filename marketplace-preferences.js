/* HaulWise return load planning for real member-posted listings. */
(function () {
  'use strict';
  const find = document.getElementById('find');
  const destination = document.getElementById('filterDestination');
  if (!find || !destination || document.getElementById('returnLoadScout')) return;

  const style = document.createElement('style');
  style.textContent = '.return-scout{margin-top:15px;background:linear-gradient(135deg,#092d40,#071d30);border:1px solid #168b9e;box-shadow:0 7px 26px #00c8d71a}.return-scout-heading{display:flex;gap:12px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap}.return-scout h2{margin:0 0 5px;font-size:21px;color:#f3fcff}.return-scout p{margin:6px 0 11px;color:#b0cfdb;font-size:13px;line-height:1.5}.return-scout .return-tag{border:1px solid #147b87;border-radius:25px;padding:5px 10px;color:#7bf9ec;white-space:nowrap;font-size:11px;font-weight:800;letter-spacing:.04em}.return-scout-controls{display:flex;align-items:end;gap:10px;flex-wrap:wrap}.return-scout-controls label{flex:1 1 185px;margin:0;font-size:12px;color:#d1e7f0}.return-scout-controls input{margin-top:7px;width:100%;min-height:45px}.return-scout-controls button{min-height:45px;margin:0;white-space:normal}.return-scout #returnScoutStatus{min-height:20px;margin:10px 0 2px;font-size:12px;color:#92ebed}@media(max-width:540px){.return-scout-controls{display:grid;grid-template-columns:1fr 1fr}.return-scout-controls label{grid-column:1/-1}.return-scout-controls button{width:100%;padding:10px}.return-scout h2{font-size:19px}}';
  document.head.appendChild(style);

  const card = document.createElement('section');
  card.id = 'returnLoadScout';
  card.className = 'panel return-scout';
  card.setAttribute('aria-labelledby', 'returnScoutTitle');
  card.innerHTML =
    '<div class="return-scout-heading"><div><h2 id="returnScoutTitle">Find a load heading home</h2>' +
    '<p>Filter real HaulWise member listings by destination city and reduce empty return miles.</p></div>' +
    '<span class="return-tag">RETURN LOAD FINDER</span></div>' +
    '<div class="return-scout-controls"><label for="returnScoutCity">My home / return city' +
    '<input id="returnScoutCity" type="text" maxlength="120" autocomplete="address-level2" placeholder="e.g. Stratford" spellcheck="false"></label>' +
    '<button id="returnScoutFind" type="button">Find return loads →</button>' +
    '<button id="returnScoutSave" class="secondary" type="button">Save my city</button></div>' +
    '<p id="returnScoutStatus" role="status" aria-live="polite">Enter a city to find loads heading that way.</p>' +
    '<p class="work-note">Destination-city text matching only, not GPS route planning. External load boards are not connected.</p>';
  const badge = find.querySelector('.market-free');
  if (badge) badge.insertAdjacentElement('afterend', card);
  else find.insertBefore(card, find.firstChild);

  const input = document.getElementById('returnScoutCity');
  const saveButton = document.getElementById('returnScoutSave');
  const status = document.getElementById('returnScoutStatus');
  let loadedId = null, pending = null, generation = 0;
  const msg = value => { status.textContent = value; };
  const city = () => input.value.trim().replace(/\s+/g, ' ');
  function resetState() {
    generation++; loadedId = null; pending = null; input.value = '';
    msg('Enter a city to find loads heading that way.');
  }
  async function loadPreference() {
    const uid = user?.id;
    if (!uid || loadedId === uid) return;
    if (pending?.uid === uid) return pending.promise;
    const epoch = generation;
    const promise = (async () => {
      try {
        const {data,error} = await api.from('marketplace_interest')
          .select('search_city').eq('user_id',uid).maybeSingle();
        if (user?.id !== uid || generation !== epoch) return;
        if (error) throw error;
        const saved = String(data?.search_city || '').trim();
        input.value = saved || String(equip?.home_city || '').trim();
        loadedId = uid;
        if (saved) msg('Your saved city is ready. Select Find return loads to apply it.');
      } catch (_) {
        if (user?.id === uid && generation === epoch)
          msg('Could not load your saved city. You can still search manually.');
      } finally { if (pending?.uid === uid) pending = null; }
    })();
    pending = {uid,promise};
    return promise;
  }
  function applySearch() {
    if (!user) { queuedSection = 'find'; showAuth(); return; }
    const value = city();
    if (value.length < 2) { msg('Enter your destination city first.'); input.focus(); return; }
    if (typeof resetMarketFilters === 'function') resetMarketFilters();
    destination.value = value;
    if (equip && document.getElementById('compatible'))
      document.getElementById('compatible').checked = true;
    renderLoads();
    msg('Showing member-posted loads with destinations matching “' + value + '”. Check the full route before booking.');
    const results = document.getElementById('marketResultCount');
    if (results) results.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  async function saveCity() {
    if (!user) { queuedSection = 'find'; showAuth(); return; }
    const value = city(), uid = user.id;
    if (value.length < 2) { msg('Enter at least two characters for your city.'); input.focus(); return; }
    saveButton.disabled = true; msg('Saving your city…');
    try {
      const {error} = await api.from('marketplace_interest')
        .upsert({user_id:uid,search_city:value,updated_at:new Date().toISOString()}, {onConflict:'user_id'});
      if (user?.id !== uid) return;
      if (error) throw error;
      loadedId = uid;
      msg('City saved to your private HaulWise account. No automatic alerts are active.');
    } catch (_) {
      if (user?.id === uid) msg('Could not save. Your current search still works; try again.');
    } finally { saveButton.disabled = false; }
  }

  document.getElementById('returnScoutFind').addEventListener('click',applySearch);
  saveButton.addEventListener('click',saveCity);
  input.addEventListener('keydown',e=>{
    if(e.key==='Enter'){e.preventDefault();applySearch();}
  });
  const previousTab = tab;
  tab = function(name) {
    const result = previousTab(name);
    if(name==='find' && user) loadPreference();
    return result;
  };
  const previousRefresh = refreshAuth;
  refreshAuth = async function(...args) {
    const oldId = user?.id || null;
    const result = await previousRefresh(...args);
    const newId = user?.id || null;
    if (newId !== oldId) { resetState(); if(newId) loadPreference(); }
    return result;
  };
  if (user) loadPreference();
})();