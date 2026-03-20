import { createTRPCRouter } from "./create-context.ts";
import hiRoute from "./routes/example/hi/route.ts";
import membershipUpgradeRoute from "./routes/membership/upgrade/route.ts";
import creditsBuyRoute from "./routes/credits/buy/route.ts";
import themeUnlockRoute from "./routes/themes/unlock/route.ts";
import paymentVerifyRoute from "./routes/payment/verify/route.ts";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  membership: createTRPCRouter({
    upgrade: membershipUpgradeRoute,
  }),
  credits: createTRPCRouter({
    buy: creditsBuyRoute,
  }),
  themes: createTRPCRouter({
    unlock: themeUnlockRoute,
  }),
  payment: createTRPCRouter({
    verify: paymentVerifyRoute,
  }),
});

export type AppRouter = typeof appRouter;