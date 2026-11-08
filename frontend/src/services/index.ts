import { USE_DEMO, type EllpApi } from "./api";
import { demoApi } from "./demoStore";
import { liveApi } from "./liveApi";

/** The data door the pages use (services/api.ts says what it does). */
export const api: EllpApi = USE_DEMO ? demoApi : liveApi;
export { USE_DEMO, visitorKey, readSessionId, writeSessionId } from "./api";
export type { ActivityResult, AdminStats, LeaderboardPeriod, PublicProgram } from "./api";
