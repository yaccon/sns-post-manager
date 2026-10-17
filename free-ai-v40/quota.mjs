/* Global daily generation budget, shared across every Cloudflare location.
 * The Cloudflare Durable Object performs the single-writer atomic reservation.
 * Stores only a UTC day and count, never user prompts or IP addresses.
 */
export const MAX_PUBLIC_DAILY_GENERATIONS = 12;
export async function reserveDailyQuota(storage, now=new Date(), maximum=MAX_PUBLIC_DAILY_GENERATIONS) {
 const cap=Math.min(MAX_PUBLIC_DAILY_GENERATIONS,Number(maximum));
 if(!Number.isInteger(cap)||cap<1)throw new Error("Invalid daily quota");
 const day=now.toISOString().slice(0,10);
 const previous=await storage.get("daily-budget");
 const used=previous?.day===day&&Number.isInteger(previous.used)?previous.used:0;
 if(used>=cap)return {allowed:false,used,limit:cap,day};
 await storage.put("daily-budget",{day,used:used+1});
 return {allowed:true,used:used+1,limit:cap,day};
}
