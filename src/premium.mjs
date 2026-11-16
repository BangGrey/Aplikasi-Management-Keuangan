const validUntil=value=>Number.isFinite(Date.parse(value))?Date.parse(value):0;
export function hasPaidSubscription(profile,session,now=Date.now()){
 return !!(session?.user?.id&&profile?.id===session.user.id&&profile?.paid_until&&Number.isFinite(Date.parse(profile.paid_until))&&Date.parse(profile.paid_until)>now);
}
export function premiumAccessUntil(profile){return Math.max(validUntil(profile?.paid_until),validUntil(profile?.trial_ends_at))}
export function hasPremiumAccess(profile,session,now=Date.now()){
 return !!(session?.user?.id&&profile?.id===session.user.id&&premiumAccessUntil(profile)>now);
}
export function isPremiumTrial(profile,session,now=Date.now()){
 return hasPremiumAccess(profile,session,now)&&!hasPaidSubscription(profile,session,now);
}
