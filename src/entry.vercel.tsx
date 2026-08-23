import { createQwikCity } from "@builder.io/qwik-city/middleware/node";
import qwikCityPlan from "@qwik-city-plan";
import render from "./entry.ssr";

const { router } = createQwikCity({ render, qwikCityPlan, checkOrigin: "lax-proto" });

export default router;