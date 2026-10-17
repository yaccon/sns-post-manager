import { DurableObject } from "cloudflare:workers";
import worker from "./worker.mjs";
import { reserveDailyQuota } from "./quota.mjs";
export default worker;
export class GlobalDailyBudget extends DurableObject {
 async reserve(){
  return reserveDailyQuota(this.ctx.storage);
 }
}
