/* HaulWise official-provider loads. Read-only until authorized credentials and licensed inventory exist. */
(function(){
  'use strict';

  let providerConnected = false;
  let requestVersion = 0;
  let statusCheckedAt = 0;

  function el(id){return document.getElementById(id);}
  function message(value, state){
    const note = el('haulwisePartnerMessage');
    if(note){note.textContent = String(value || '');note.dataset.state = state || '';}
  }
  function pill(value, state){
    const node = el('haulwisePartnerPill');
    if(node){node.textContent = String(value || '');node.dataset.state = state || '';}
  }
  function setSearchEnabled(enabled){
    providerConnected = enabled === true;
    const btn = el('haulwisePartnerSearchButton');
    if(btn) btn.disabled = !providerConnected;
    const fields = el('haulwisePartnerSearchForm');
    if(fields) fields.classList.toggle('partner-search-unavailable', !providerConnected);
  }
  function clearResults(){
    const results = el('haulwisePartnerResults');
    if(results) results.replaceChildren();
  }
  async function readProviderState(force){
    const panel = el('haulwisePartnerPanel');
    if(!panel || panel.closest('#find')?.classList.contains('hidden')) return;
    if(!user?.id){
      setSearchEnabled(false);
      pill('Sign in to check connection', 'pending');
      message('Sign in to check the 123Loadboard partnership status.', 'pending');
      return;
    }
    // Avoid repeated API status requests as users move among the app sections.
    if(!force && statusCheckedAt && Date.now() - statusCheckedAt < 45000) return;
    const uid = user.id, version = ++requestVersion;
    setSearchEnabled(false);
    pill('Checking connection…', 'checking');
    message('Checking MileForge partner authorization status.', 'checking');
    const refreshButton = el('haulwisePartnerRefresh');
    if(refreshButton) refreshButton.disabled = true;
    try{
      const {data,error} = await api.functions.invoke('haulwise-loads', {body:{action:'status'}});
      if(version !== requestVersion || user?.id !== uid) return;
      if(error || data?.error) throw Error('Cannot confirm the provider connection right now.');
      statusCheckedAt = Date.now();
      const connected = data?.enabled === true && data?.status === 'connected' && data?.providerId === '123loadboard';
      setSearchEnabled(connected);
      pill(connected ? 'Authorized feed connected' : data?.status === 'suspended' ? 'Provider access paused' : 'Awaiting 123Loadboard approval',
        connected ? 'connected' : 'pending');
      message(connected
        ? 'Partner-authorized loads can now be searched inside MileForge. Rates and availability must be verified with the posting broker.'
        : 'API request submitted. Waiting for 123Loadboard to authorize the integration and issue credentials. Search their official load board using the link below in the meantime.',
        connected ? 'connected' : 'pending');
      if(!connected) clearResults();
    }catch(_error){
      if(version !== requestVersion || user?.id !== uid) return;
      setSearchEnabled(false);
      pill('Unable to verify connection', 'error');
      message('Could not reach the MileForge load API. Use the external load board links or try refreshing connection status.', 'error');
    }finally{
      if(version === requestVersion && refreshButton) refreshButton.disabled = false;
    }
  }

  function safeProviderURL(value){
    try{
      const url = new URL(String(value || ''));
      if(url.protocol !== 'https:') return null;
      if(url.hostname === '123loadboard.com' || url.hostname.endsWith('.123loadboard.com')) return url.href;
    }catch(_error){}
    return null;
  }
  function addText(parent, tag, text, className){
    const node = document.createElement(tag);
    if(className) node.className = className;
    node.textContent = text == null ? '' : String(text);
    parent.appendChild(node);
    return node;
  }
  function renderProviderResults(rows){
    const container = el('haulwisePartnerResults');
    if(!container) return;
    container.replaceChildren();
    if(!Array.isArray(rows) || !rows.length){
      addText(container, 'p', 'No recently verified partner loads match this search. Try another route or open 123Loadboard to continue searching.', 'partner-empty');
      return;
    }
    for(const row of rows.slice(0, 30)){
      const card = document.createElement('article');
      card.className = 'partner-load-card';
      addText(card,'span','123Loadboard · Provider listing','partner-load-source');
      addText(card,'h4',row.title || 'Freight opportunity');
      const origin = [row.pickup_city,row.pickup_region].filter(Boolean).join(', ');
      const destination = [row.dropoff_city,row.dropoff_region].filter(Boolean).join(', ');
      addText(card,'p',origin + ' → ' + destination,'partner-load-route');
      const details = [
        row.trailer_type ? 'Equipment: ' + row.trailer_type : null,
        Number.isFinite(Number(row.cargo_weight_kg)) && row.cargo_weight_kg != null ? 'Cargo: ' + Number(row.cargo_weight_kg).toLocaleString('en-CA') + ' kg' : null,
        Number.isFinite(Number(row.distance_km)) && row.distance_km != null ? 'Loaded: ' + Number(row.distance_km).toLocaleString('en-CA') + ' km' : null,
        row.pickup_date ? 'Pickup: ' + row.pickup_date : null
      ].filter(Boolean).join(' · ');
      if(details) addText(card,'p',details,'partner-load-details');
      const amount = Number(row.offered_amount);
      if(row.offered_amount != null && Number.isFinite(amount) && amount >= 0 && ['CAD','USD'].includes(row.offered_currency)){
        addText(card,'strong', new Intl.NumberFormat('en-CA',{style:'currency',currency:row.offered_currency}).format(amount) + ' offered', 'partner-load-rate');
      } else {
        addText(card,'span','Rate not listed', 'partner-load-rate-pending');
      }
      const link = safeProviderURL(row.source_url);
      if(link){
        const anchor = document.createElement('a');
        anchor.href = link;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.className = 'partner-load-link';
        anchor.textContent = 'View on 123Loadboard ↗';
        card.appendChild(anchor);
      }
      container.appendChild(card);
    }
    addText(container,'p','Always verify availability, insurance, carrier requirements and total hauling costs with the posting broker.','partner-load-footnote');
  }
  async function searchPartnerLoads(event){
    if(event) event.preventDefault();
    if(!user || !providerConnected){
      message('Partner loads are not available until 123Loadboard authorizes the API. External search links remain available.', 'pending');
      return;
    }
    const uid = user.id, version = ++requestVersion;
    const form = el('haulwisePartnerSearchForm');
    const fields = new FormData(form);
    const button = el('haulwisePartnerSearchButton');
    if(button) button.disabled = true;
    message('Searching authorized 123Loadboard inventory…', 'checking');
    clearResults();
    try{
      const filters = {
        pickupCity: String(fields.get('pickupCity') || '').trim().slice(0,60),
        dropoffCity: String(fields.get('dropoffCity') || '').trim().slice(0,60),
        trailerType: String(fields.get('trailerType') || '').trim(),
        limit: 20
      };
      const {data,error} = await api.functions.invoke('haulwise-loads',{body:{action:'search',filters}});
      if(version !== requestVersion || user?.id !== uid) return;
      if(error || data?.error) throw Error('The load search was unavailable.');
      if(data?.enabled !== true || data?.status !== 'connected'){
        providerConnected = false;
        setSearchEnabled(false);
        pill('Awaiting 123Loadboard approval','pending');
        message('The partner API has not been authorized. Please use the official 123Loadboard link.','pending');
        return;
      }
      const rows = Array.isArray(data.listings) ? data.listings : [];
      renderProviderResults(rows);
      message(rows.length + ' recently verified load' + (rows.length===1?'':'s') + ' returned from the authorized provider feed.', 'connected');
    }catch(_error){
      if(version !== requestVersion || user?.id !== uid) return;
      message('Could not complete this search. Try refreshing the provider connection, or use the official load board link.', 'error');
    }finally{
      if(version === requestVersion && button) button.disabled = !providerConnected;
    }
  }

  document.getElementById('haulwisePartnerSearchForm')?.addEventListener('submit', searchPartnerLoads);
  document.getElementById('haulwisePartnerRefresh')?.addEventListener('click', () => readProviderState(true));

  const previousTab = tab;
  tab = function(name,...args){
    const result = previousTab(name,...args);
    if(name === 'find' && user?.id){
      void readProviderState(false);
    }
    return result;
  };
  const previousLoadSource = haulwiseShowLoadSource;
  haulwiseShowLoadSource = function(source){
    previousLoadSource(source);
    if(source !== 'community' && user?.id) void readProviderState(false);
  };
})();
