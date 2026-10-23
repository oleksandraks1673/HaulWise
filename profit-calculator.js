/* Shared calculator UI; public mode performs no account or database requests. */
let currentProfitEstimate=null,calculatorSource=null,calculatorProfileUser=null,calculatorProfilePending=null,calculatorCostsRevision=0,profitExampleActive=false;
const publicProfit=typeof HAULWISE_PUBLIC_CALCULATOR!=='undefined'&&HAULWISE_PUBLIC_CALCULATOR;
const profileFields=['calcCostMode','calcKm','calcFuelUse','calcFuelPrice','calcNonFuel','calcHourlyRate','calcTargetType','calcTarget'];
const profitValue=id=>document.getElementById(id).value;
const profitSet=(id,value)=>{document.getElementById(id).textContent=value;};
const profitMoney=n=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(n);
function readProfitValues(){return {payment:profitValue('calcRate'),loadedKm:profitValue('calcLoaded'),emptyKm:profitValue('calcDeadhead'),mode:profitValue('calcCostMode'),operatingRate:profitValue('calcKm'),litresPer100Km:profitValue('calcFuelUse'),fuelPrice:profitValue('calcFuelPrice'),nonFuelRate:profitValue('calcNonFuel'),hours:profitValue('calcHours'),hourlyRate:profitValue('calcHourlyRate'),extras:profitValue('calcExtras'),targetType:profitValue('calcTargetType'),target:profitValue('calcTarget')};}
computeProfit=function(){
 const r=HaulWiseProfit.calculate(readProfitValues());currentProfitEstimate=r.valid?r:null;
 document.getElementById('profitIncomplete').classList.toggle('hidden',r.valid);document.getElementById('profitResults').classList.toggle('hidden',!r.valid);
 const save=document.getElementById('saveProfitLoad');if(save)save.disabled=!r.valid;
 if(!r.valid){profitSet('profitIncomplete',r.message);return r;}
 profitSet('calcMargin',profitMoney(r.remaining));document.getElementById('calcMargin').style.color=r.status==='loss'?'#ffaaa6':'#60ffd4';
 profitSet('calcBreakEven',profitMoney(r.breakEven));profitSet('calcMinimum',profitMoney(r.minimumPayment));profitSet('calcTotalKm',r.totalKm.toLocaleString('en-CA',{maximumFractionDigits:1})+' km');profitSet('calcEmptyShare',r.emptyPercent.toFixed(1)+'%');profitSet('calcEmptyCost',profitMoney(r.emptyDrivingCost));profitSet('calcTravelCost',profitMoney(r.drivingCost));profitSet('calcFuelCost',r.fuelCost===null?'Included in operating rate':profitMoney(r.fuelCost));profitSet('calcTimeCost',r.mode==='allin'?'Covered only if included in your rate':profitMoney(r.timeCost));profitSet('calcExtraCost',profitMoney(r.inputs.extras));profitSet('calcFullCost',profitMoney(r.totalCost));profitSet('calcOfferedKm',r.paymentPerLoadedKm===null?'No loaded distance':profitMoney(r.paymentPerLoadedKm));profitSet('calcRequiredKm',r.requiredPerLoadedKm===null?'No loaded distance':profitMoney(r.requiredPerLoadedKm));profitSet('calcMarginKm',profitMoney(r.remainingPerTotalKm));profitSet('calcMarginPercent',r.marginPercent===null?'No offered payment':r.marginPercent.toFixed(1)+'%');
 const status=document.getElementById('profitTargetStatus');status.className='profit-target-status '+r.status;status.textContent=r.status==='loss'?'Below break-even by '+profitMoney(-r.remaining)+'.':r.status==='below'?'Increase the offered payment by '+profitMoney(r.targetGap)+' to meet your target.':'This offer meets your target using the costs entered.';
 return r;
};
function updateProfitTargetLabel(){const percent=profitValue('calcTargetType')==='percent';profitSet('calcTargetLabel',percent?'Target margin (% of revenue, optional)':'Target amount remaining (CAD, optional)');const input=document.getElementById('calcTarget');input.max=percent?'99.99':'1000000';input.placeholder=percent?'e.g. 25':'0 = cover entered costs';}
function changeProfitCostMode(){const detailed=profitValue('calcCostMode')==='detailed';document.getElementById('allInCosts').classList.toggle('hidden',detailed);document.getElementById('detailedCosts').classList.toggle('hidden',!detailed);computeProfit();}
function tryProfitExample(){calculatorSource=null;profitExampleActive=true;const data={calcRate:1600,calcLoaded:480,calcDeadhead:50,calcKm:.85,calcExtras:110,calcCostMode:'allin',calcFuelUse:30,calcFuelPrice:1.65,calcNonFuel:.35,calcHours:'',calcHourlyRate:'',calcTargetType:'percent',calcTarget:25};for(const [id,value]of Object.entries(data))document.getElementById(id).value=value;++calculatorCostsRevision;profitSet('calcSourceNotice','Example values only. Replace them with your own vehicle costs and trip details.');profitSet('calcLoadNote','');updateProfitTargetLabel();changeProfitCostMode();}
function clearProfitCalculation(){for(const id of ['calcRate','calcLoaded','calcDeadhead','calcExtras','calcHours'])document.getElementById(id).value='';if(profitExampleActive){for(const id of profileFields){if(document.getElementById(id).tagName!=='SELECT')document.getElementById(id).value='';}profitExampleActive=false;++calculatorCostsRevision;}calculatorSource=null;profitSet('calcSourceNotice','');profitSet('calcLoadNote','');computeProfit();}
function collectCostProfile(){return Object.fromEntries(profileFields.map(id=>[id,profitValue(id)]));}
function applyCostProfile(profile){if(!profile||typeof profile!=='object')return;for(const id of profileFields){if(profile[id]==null)continue;const value=String(profile[id]);if(id==='calcCostMode'&&!['allin','detailed'].includes(value))continue;if(id==='calcTargetType'&&!['amount','percent'].includes(value))continue;if(!['calcCostMode','calcTargetType'].includes(id)&&value!==''&&(!Number.isFinite(Number(value))||Number(value)<0))continue;document.getElementById(id).value=value;}updateProfitTargetLabel();changeProfitCostMode();}
async function loadCalculatorCostProfile(){
 if(publicProfit||!user||calculatorProfileUser===user.id)return;if(calculatorProfilePending?.uid===user.id)return calculatorProfilePending.promise;
 const uid=user.id,revision=calculatorCostsRevision;
 const promise=(async()=>{try{const {data,error}=await api.from('driver_app_state').select('data').eq('user_id',uid).maybeSingle();if(user?.id!==uid)return;if(error)throw error;calculatorProfileUser=uid;if(calculatorCostsRevision===revision){const profile=data?.data?.haulwise_calculator_costs_v1;if(profile){applyCostProfile(profile);profitSet('calcProfileMsg','Your saved cost settings are loaded. Enter the details for this trip.');}else if(profitValue('calcKm')===''&&equip?.running_cost_per_km!=null){document.getElementById('calcKm').value=equip.running_cost_per_km;computeProfit();}}}catch(e){if(user?.id===uid)profitSet('calcProfileMsg','Saved cost settings could not be loaded. You can enter your costs manually.');}finally{if(calculatorProfilePending?.uid===uid)calculatorProfilePending=null;}})();calculatorProfilePending={uid,promise};return promise;
}
async function writeCostProfile(apiClient,uid,profile,isCurrent){
 for(let attempt=0;attempt<3;attempt++){
  if(!isCurrent())throw Error('Account changed. Open the calculator again before saving.');
  const {data:previous,error}=await apiClient.from('driver_app_state').select('data,version').eq('user_id',uid).maybeSingle();if(error)throw error;if(!isCurrent())throw Error('Account changed. Open the calculator again before saving.');
  const data={...(previous?.data&&typeof previous.data==='object'&&!Array.isArray(previous.data)?previous.data:{loads:[],trucks:[],expenses:[]}),haulwise_calculator_costs_v1:profile};
  if(previous){const result=await apiClient.from('driver_app_state').update({data,version:Number(previous.version)+1,updated_at:new Date().toISOString()}).eq('user_id',uid).eq('version',previous.version).select('version').maybeSingle();if(result.error)throw result.error;if(result.data)return;}
  else{const result=await apiClient.from('driver_app_state').insert({user_id:uid,data,version:1}).select('version').maybeSingle();if(!result.error&&result.data)return;if(result.error?.code!=='23505')throw result.error||Error('Unable to save your settings.');}
 }
 throw Error('Your account was updated elsewhere. Please try saving again.');
}
async function saveCalculatorCostProfile(){
 if(publicProfit||!user)return;const uid=user.id,button=document.getElementById('saveCostProfile');if(button.disabled)return;
 const values=readProfitValues();const mode=values.mode;const fields=mode==='detailed'?['calcFuelUse','calcFuelPrice','calcNonFuel']:['calcKm'];if(fields.some(id=>profitValue(id)===''||!Number.isFinite(Number(profitValue(id)))||Number(profitValue(id))<0)||profileFields.filter(id=>!['calcCostMode','calcTargetType'].includes(id)).some(id=>profitValue(id)!==''&&(!Number.isFinite(Number(profitValue(id)))||Number(profitValue(id))<0||Number(profitValue(id))>100000000))||(values.targetType==='percent'&&Number(values.target)>=100)){profitSet('calcProfileMsg','Enter valid operating costs and a target margin below 100% before saving your settings.');return;}
 button.disabled=true;profitSet('calcProfileMsg','Saving your cost settings…');try{await writeCostProfile(api,uid,collectCostProfile(),()=>user?.id===uid);if(user?.id!==uid)return;calculatorProfileUser=uid;profitSet('calcProfileMsg','Cost settings saved to your HaulWise account.');}catch(e){if(user?.id===uid)profitSet('calcProfileMsg',e.message||'Unable to save your settings. Please try again.');}finally{button.disabled=false;}
}
saveCalculatorToLog=function(){
 if(publicProfit){location.assign('/?signup=1');return;}if(!user){showAuth();return;}const r=computeProfit();if(!r.valid)return;
 const preset={gross_revenue:r.inputs.payment,distance_km:r.totalKm,notes:(profitExampleActive?'Example scenario — replace with your own details. ':'')+HaulWiseProfit.snapshot(r)};if(calculatorSource){Object.assign(preset,{load_reference:calculatorSource.title,origin:calculatorSource.pickup_city+', '+calculatorSource.pickup_region,destination:calculatorSource.dropoff_city+', '+calculatorSource.dropoff_region,pickup_date:calculatorSource.pickup_date});preset.notes+=' From marketplace; this does not book or accept the load.';}
 tab('log');showTripEditor(null,preset);
};
if(!publicProfit){
 const priorProfitTab=tab;tab=function(name){priorProfitTab(name);if(user&&name==='profit')loadCalculatorCostProfile();};
 const priorProfitReset=resetWork;resetWork=function(){priorProfitReset();calculatorProfileUser=null;calculatorProfilePending=null;calculatorSource=null;profitExampleActive=false;++calculatorCostsRevision;for(const id of [...profileFields,'calcHours','calcRate','calcLoaded','calcDeadhead','calcExtras']){const el=document.getElementById(id);if(el&&el.tagName!=='SELECT')el.value='';}profitSet('calcProfileMsg','');profitSet('calcSourceNotice','');profitSet('calcLoadNote','');changeProfitCostMode();};
 marketplaceToCalculator=function(id){const l=loads.find(l=>l.id===id);if(!l)return;if(profitExampleActive)clearProfitCalculation();calculatorSource=l;tab('profit');document.getElementById('calcRate').value=l.pay_cad;document.getElementById('calcLoaded').value=l.distance_km;document.getElementById('calcDeadhead').value='';document.getElementById('calcExtras').value='';profitSet('calcSourceNotice','Marketplace load: '+l.title);profitSet('calcLoadNote','Enter empty travel and all additional costs before evaluating this offer.');computeProfit();};
 if(new URLSearchParams(location.search).get('signup')==='1')setAuthMode('signup');
}
for(const id of profileFields){const input=document.getElementById(id);input.addEventListener(input.tagName==='SELECT'?'change':'input',()=>{++calculatorCostsRevision;});}
updateProfitTargetLabel();changeProfitCostMode();
if(typeof module!=='undefined')module.exports={writeCostProfile};
