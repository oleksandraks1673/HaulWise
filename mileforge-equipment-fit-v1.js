/* MileForge compatibility is advisory, not a carrier-safety certification.
   One deterministic evaluator for community jobs, backhauls and licensed feeds. */
(function(global){
  'use strict';
  function positiveNumber(value){
    if(value===null||value===undefined||value==='')return null;
    const x=Number(value);return Number.isFinite(x)&&x>0?x:null;
  }
  const pretty={length:'length',width:'width',height:'height'};
  function evaluate(load,equipment){
    if(!equipment)return {status:'setup',label:'Add equipment profile',reason:'Save your vehicle, trailer and verified cargo limit to compare loads.'};
    if(!load||typeof load!=='object')return {status:'review',label:'Details need review',reason:'Load requirements unavailable.'};
    const required=String(load.trailer_type||'').trim().toLowerCase();
    const available=String(equipment.trailer_type||'').trim().toLowerCase();
    if(required&&available&&required!==available)return {status:'blocked',label:'Equipment mismatch',reason:'Load requires '+required+'; your saved trailer is '+available+'.'};
    const missing=[];
    if(!required||!available)missing.push('Trailer requirement or saved trailer type missing');
    const weight=positiveNumber(load.cargo_weight_kg??load.cargo_kg);
    const capacity=positiveNumber(equipment.cargo_capacity_kg);
    if(!capacity)missing.push('Verified cargo capacity missing from My Truck');
    if(!weight)missing.push('Cargo weight not provided');
    if(weight&&capacity&&weight>capacity)return {status:'blocked',label:'Over cargo limit',reason:'Cargo '+weight.toLocaleString('en-CA')+' kg exceeds saved cargo capacity '+capacity.toLocaleString('en-CA')+' kg.'};
    for(const dimension of ['length','width','height']){
      const loadSize=positiveNumber(load['cargo_'+dimension+'_m']);
      const safeSize=positiveNumber(equipment['cargo_'+dimension+'_m']);
      if(loadSize&&safeSize&&loadSize>safeSize)return {status:'blocked',label:'Dimensions exceed limit',reason:'Cargo '+pretty[dimension]+' '+loadSize+' m exceeds saved usable '+pretty[dimension]+' '+safeSize+' m.'};
      if(!loadSize)missing.push('Load '+pretty[dimension]+' unlisted');
      else if(!safeSize)missing.push('Saved usable '+pretty[dimension]+' missing');
    }
    if(missing.length)return {status:'review',label:'Needs equipment verification',reason:missing.slice(0,2).join('; ')+(missing.length>2?'; plus other missing measurements':'')+'.'};
    return {status:'preliminary',label:'Possible equipment match',reason:'Saved trailer, weight and dimensions pass this initial check. Confirm towing/axle ratings, securement, licensing, permits and insurance.'};
  }
  global.MileForgeFit=Object.freeze({evaluate});
})(window);
