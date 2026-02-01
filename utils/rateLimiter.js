const last=new Map();
export function shouldNotify(key, cooldownMs=60000){const now=Date.now(),prev=last.get(key)||0; if(now-prev<cooldownMs) return false; last.set(key,now); return true;}