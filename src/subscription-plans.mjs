// Shared catalog for the UI and checkout. Prices/durations are also constrained in SQL.
export const subscriptionPlans=Object.freeze([
 Object.freeze({id:'monthly',label:'30 hari',amount:29000,months:0,days:30}),
 Object.freeze({id:'quarterly',label:'3 bulan',amount:60000,months:3,days:0}),
 Object.freeze({id:'half-yearly',label:'6 bulan',amount:150000,months:6,days:0}),
 Object.freeze({id:'yearly',label:'1 tahun',amount:299000,months:12,days:0}),
]);
export const findSubscriptionPlan=id=>subscriptionPlans.find(plan=>plan.id===id)||null;
export function subscriptionExpiry(paidUntil,plan,now=new Date()){
 const paid=Date.parse(paidUntil),date=new Date(Math.max(Number.isFinite(paid)?paid:0,new Date(now).getTime()));
 const day=date.getUTCDate();date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()+plan.months);
 const lastDay=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();
 date.setUTCDate(Math.min(day,lastDay));date.setUTCDate(date.getUTCDate()+plan.days);return date.toISOString();
}
