import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import membershipUpgradeRoute from "./routes/membership/upgrade/route";
import creditsBuyRoute from "./routes/credits/buy/route";
import themeUnlockRoute from "./routes/themes/unlock/route";
import paymentVerifyRoute from "./routes/payment/verify/route";

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