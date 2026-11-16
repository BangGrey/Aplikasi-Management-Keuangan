// Trial access intentionally does not grant premium benefits.
export function hasPaidSubscription(profile,session,now=Date.now()){
 return !!(session?.user?.id&&profile?.id===session.user.id&&profile?.paid_until&&Number.isFinite(Date.parse(profile.paid_until))&&Date.parse(profile.paid_until)>now);
}
