(function(root){
 'use strict';
 const MAX=100000000;
 function read(v,optional=false){if(v===''||v==null)return optional?0:null;const n=Number(v);return Number.isFinite(n)&&n>=0&&n<=MAX?n:null;}
 function calculate(values){
  const required=['payment','loadedKm','emptyKm'];const n={};for(const key of required){n[key]=read(values[key]);if(n[key]===null)return {valid:false,message:'Enter the offered payment, loaded distance and empty distance. Use 0 when there is no empty travel.'};}
  if(n.loadedKm+n.emptyKm<=0)return {valid:false,message:'Enter a total travel distance greater than zero.'};
  n.extras=read(values.extras,true);n.target=read(values.target,true);if(n.extras===null||n.target===null)return {valid:false,message:'Enter valid, non-negative costs and a profit target.'};
  const mode=values.mode==='detailed'?'detailed':'allin',targetType=values.targetType==='percent'?'percent':'amount';
  if(targetType==='percent'&&n.target>=100)return {valid:false,message:'A target margin must be less than 100% of revenue.'};
  const totalKm=n.loadedKm+n.emptyKm;let drivingCost,fuelCost=null,nonFuelCost=0,timeCost=0,costPerKm;
  if(mode==='allin'){n.operatingRate=read(values.operatingRate);if(n.operatingRate===null)return {valid:false,message:'Enter your all-in operating cost per kilometre, or use the detailed cost breakdown.'};costPerKm=n.operatingRate;drivingCost=totalKm*costPerKm;}
  else{for(const key of ['litresPer100Km','fuelPrice','nonFuelRate']){n[key]=read(values[key]);if(n[key]===null)return {valid:false,message:'Enter fuel consumption, fuel price and non-fuel costs. Use 0 for a cost you intentionally exclude.'};}
   n.hours=read(values.hours,true);n.hourlyRate=read(values.hourlyRate,true);if(n.hours===null||n.hourlyRate===null)return {valid:false,message:'Enter valid driver hours and an hourly cost.'};if((n.hours>0&&n.hourlyRate===0)||(n.hourlyRate>0&&n.hours===0))return {valid:false,message:'Enter both driver hours and an hourly cost, or leave both at zero.'};
   fuelCost=totalKm/100*n.litresPer100Km*n.fuelPrice;nonFuelCost=totalKm*n.nonFuelRate;costPerKm=n.litresPer100Km/100*n.fuelPrice+n.nonFuelRate;drivingCost=fuelCost+nonFuelCost;timeCost=n.hours*n.hourlyRate;
  }
  const totalCost=drivingCost+timeCost+n.extras,remaining=n.payment-totalCost;
  const requiredPayment=targetType==='percent'?totalCost/(1-n.target/100):totalCost+n.target;
  const minimumPayment=Math.ceil((requiredPayment-1e-9)*100)/100;
  const targetRemaining=targetType==='percent'?n.payment*n.target/100:n.target;
  const targetGap=minimumPayment-n.payment;
  if(![totalCost,remaining,minimumPayment].every(Number.isFinite))return {valid:false,message:'These inputs are outside the supported calculation range.'};
  return {valid:true,mode,targetType,inputs:n,totalKm,drivingCost,fuelCost,nonFuelCost,timeCost,costPerKm,totalCost,remaining,minimumPayment,breakEven:Math.ceil((totalCost-1e-9)*100)/100,marginPercent:n.payment>0?remaining/n.payment*100:null,paymentPerLoadedKm:n.loadedKm>0?n.payment/n.loadedKm:null,requiredPerLoadedKm:n.loadedKm>0?minimumPayment/n.loadedKm:null,remainingPerTotalKm:remaining/totalKm,emptyDrivingCost:n.emptyKm*costPerKm,emptyPercent:n.emptyKm/totalKm*100,targetRemaining,targetGap,meetsTarget:targetGap<=0.005,status:remaining<-.005?'loss':targetGap>.005?'below':'meets'};
 }
 function snapshot(result,formatMoney){if(!result?.valid)return '';const n=result.inputs,m=formatMoney||((v)=>'CAD '+Number(v).toFixed(2));return 'Trip planning estimate (not recorded expenses): '+(result.mode==='allin'?'all-in operating rate '+m(n.operatingRate)+'/km.':'fuel '+n.litresPer100Km+' L/100 km at '+m(n.fuelPrice)+'/L; non-fuel '+m(n.nonFuelRate)+'/km; driver time '+n.hours+' hours at '+m(n.hourlyRate)+'/hour.')+' Offered payment '+m(n.payment)+'; loaded '+n.loadedKm+' km; empty '+n.emptyKm+' km; other trip costs '+m(n.extras)+'. Estimated total cost '+m(result.totalCost)+'; estimated remaining '+m(result.remaining)+'. Target '+(result.targetType==='percent'?n.target+'% margin':m(n.target)+' remaining')+'; minimum payment for target '+m(result.minimumPayment)+'. Excludes taxes and any costs not entered.';}
 const api={calculate,snapshot};root.HaulWiseProfit=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
