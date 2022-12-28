// @ts-check
import * as dotenv from 'dotenv'
dotenv.config()
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import cookieParser from "cookie-parser";
import { Shopify, LATEST_API_VERSION } from "@shopify/shopify-api";
// import cron from 'cron';

import applyAuthMiddleware from "./middleware/auth.js";
import verifyRequest from "./middleware/verify-request.js";
import { setupGDPRWebHooks } from "./gdpr.js";
import redirectToAuth from "./helpers/redirect-to-auth.js";
import { AppInstallations } from "./app_installations.js";
import { 
  createCustomerSegment, 
  createDiscountCodeJob, 
  getCountOfDiscountCodes, 
  getCustomerSegment, 
  getListOfDiscountCodes, 
  getPriceRule 
} from './helpers/discounts.js'
import { divideArray, getEverflowDiscounts } from './helpers/everflow.js'

const USE_ONLINE_TOKENS = false;

const PORT = parseInt(process.env.BACKEND_PORT || process.env.PORT, 10);

// TODO: There should be provided by env vars
const DEV_INDEX_PATH = `${process.cwd()}/frontend/`;
const PROD_INDEX_PATH = `${process.cwd()}/frontend/dist/`;

const DB_PATH = `${process.cwd()}/database.sqlite`;

Shopify.Context.initialize({
  API_KEY: process.env.SHOPIFY_API_KEY,
  API_SECRET_KEY: process.env.SHOPIFY_API_SECRET,
  SCOPES: process.env.SCOPES.split(","),
  HOST_NAME: process.env.HOST.replace(/https?:\/\//, ""),
  HOST_SCHEME: process.env.HOST.split("://")[0],
  API_VERSION: LATEST_API_VERSION,
  IS_EMBEDDED_APP: true,
  // This should be replaced with your preferred storage strategy
  // See note below regarding using CustomSessionStorage with this template.
  SESSION_STORAGE: new Shopify.Session.SQLiteSessionStorage(DB_PATH),
  ...(process.env.SHOP_CUSTOM_DOMAIN && {CUSTOM_SHOP_DOMAINS: [process.env.SHOP_CUSTOM_DOMAIN]}),
});

Shopify.Webhooks.Registry.addHandler("APP_UNINSTALLED", {
  path: "/api/webhooks",
  webhookHandler: async (_topic, shop, _body) => {
    await AppInstallations.delete(shop);
  },
});

const BILLING_SETTINGS = {
  required: false,
};

setupGDPRWebHooks("/api/webhooks");

export async function createServer(
  root = process.cwd(),
  isProd = process.env.NODE_ENV === "production",
  billingSettings = BILLING_SETTINGS
) {
  const app = express();
  app.set("use-online-tokens", USE_ONLINE_TOKENS);
  app.use(cookieParser(Shopify.Context.API_SECRET_KEY));

  applyAuthMiddleware(app, {
    billing: billingSettings,
  });

  // cron.schedule('0 0 * * *', () => {
  //   // task to run once per day at midnight
  // });
  // cron.schedule('0 9 * * *', () => {
  //   // task to run at 9:00 AM every day
  // });

  // new cron.CronJob(
  //   '*/10 * * * * *',
  //   function() {
  //     console.log('You will see this message every second', process.env.SHOPIFY_SHOP_ORIGIN);
  //   },
  //   null,
  //   true,
  //   'America/Los_Angeles'
  // );
  
  app.post("/api/webhooks", async (req, res) => {
    try {
      await Shopify.Webhooks.Registry.process(req, res);
      console.log(`Webhook processed, returned status code 200`);
    } catch (e) {
      console.log(`Failed to process webhook: ${e.message}`);
      if (!res.headersSent) {
        res.status(500).send(e.message);
      }
    }
  });

  app.get("/api/customer-segment/create", async (req, res) => {
    const session = await Shopify.Utils.loadCurrentSession(
      req,
      res,
      app.get("use-online-tokens")
    );
    let status = 200;
    let error = null;
    let data = null;

    try {
      console.log('CREATE CUSTOMER SEGMENT')
      // add customer segment
      const response = await createCustomerSegment(session, "everflow_linked", "customer_tags NOT CONTAINS 'everflow_linked'")
      data = await response

      // let priceRule = await createPriceRule(session)
      // console.log('priceRule', priceRule)
      // body
      // headers
      // pageInfo

      // let priceRuleRes = await priceRule
      // console.log('priceRuleRes', priceRuleRes)
    } catch (e) {
      console.log(`Failed to process /api/customer-segment/create: ${e.message}`);
      status = 500;
      error = e.message;
    }

    res.status(status).send({ success: status === 200, error, data });
  });

  app.get("/api/customer-segment/get", async (req, res) => {
    const session = await Shopify.Utils.loadCurrentSession(
      req,
      res,
      app.get("use-online-tokens")
    );
    let status = 200;
    let error = null;
    let data = null;

    try {
      const response = await getCustomerSegment(session, `gid://shopify/Segment/${process.env.CUSTOMER_SEGMENT_ID}`)
      data = await response
    } catch (e) {
      console.log(`Failed to process /api/customer-segment/get: ${e.message}`);
      status = 500;
      error = e.message;
    }

    res.status(status).send({ success: status === 200, error, data });
  });

  app.get("/api/discounts/count", async (req, res) => {
    const session = await Shopify.Utils.loadCurrentSession(
      req,
      res,
      app.get("use-online-tokens")
    );
    let status = 200;
    let error = null;
    let data = null;

    try {
      const response = await getCountOfDiscountCodes(session, process.env.DISCOUNTS_PRICE_RULE_ID)
      data = response
    } catch (e) {
      console.log(`Failed to process /api/discounts/count: ${e.message}`);
      status = 500;
      error = e.message;
    }

    res.status(status).send({ success: status === 200, error, data });
  });

  app.get("/api/discounts/everflowlist", async (req, res) => {
    const session = await Shopify.Utils.loadCurrentSession(
      req,
      res,
      app.get("use-online-tokens")
    );

    let status = 200;
    let error = null;
    let data = null;

    try {
      const response = await getEverflowDiscounts()
      // write to file
      // fs.writeFileSync('discounts/everflow-discounts.json', JSON.stringify(response));
      // read from file
      // const data = fs.readFileSync('discounts/array.json');
      // const array = JSON.parse(data);

      // console.log('/api/discounts/everflowlist', response)
      data = response
    } catch (e) {
      console.log(`Failed to process /api/discounts/everflowlist: ${e.message}`);
      status = 500;
      error = e.message;
    }

    res.status(status).send({ success: status === 200, error, data });
  });

  app.get("/api/discounts/create", async (req, res) => {
    const session = await Shopify.Utils.loadCurrentSession(
      req,
      res,
      app.get("use-online-tokens")
    );

    let status = 200;
    let error = null;
    let data = [];

    try {
      let { coupon_codes } = await getEverflowDiscounts()
      let discounts = await getListOfDiscountCodes(session, process.env.DISCOUNTS_PRICE_RULE_ID)
      console.log('everflowDiscounts', coupon_codes.length)
      console.log('shopifyDiscounts', discounts)

      // @ts-ignore
      if (coupon_codes && coupon_codes.length && discounts) {
        const everflowDiscounts = coupon_codes
        // @ts-ignore
        const shopifyDiscounts = discounts || []

        const mismatched = everflowDiscounts.filter((item) => !shopifyDiscounts.some((disc) => disc.code === item.coupon_code))
        // console.log('mismatched', mismatched)
        if (mismatched.length > 0) {
          const dividedArrays = divideArray(mismatched, 100) || []
  
          if (dividedArrays.length > 0) {
            let count = 0
            for (const arr of dividedArrays) {
              //process.env.DISCOUNTS_PRICE_RULE_ID
              const response = await createDiscountCodeJob(session, process.env.DISCOUNTS_PRICE_RULE_ID, arr.map(el => ({ code: el?.coupon_code })))

              // @ts-ignore
              data[count] = response.body.discount_code_creation
              count += 1
            }
          }
        }
      }
    } catch (e) {
      console.log(`Failed to process /api/discounts/create: ${e.message}`);
      status = 500;
      error = e.message;
    }

    res.status(status).send({ success: status === 200, error, data });
  });

  app.get("/api/discounts/list", async (req, res) => {
    const session = await Shopify.Utils.loadCurrentSession(
      req,
      res,
      app.get("use-online-tokens")
    );

    let status = 200;
    let error = null;
    let data = null;

    try {
      const response = await getListOfDiscountCodes(session, process.env.DISCOUNTS_PRICE_RULE_ID)
      // console.log('response', response)
      data = response
    } catch (e) {
      console.log(`Failed to process /api/discounts/list: ${e.message}`);
      status = 500;
      error = e.message;
    }

    res.status(status).send({ success: status === 200, error, data });
  });

  app.get("/api/ruleset/get", async (req, res) => {
    const session = await Shopify.Utils.loadCurrentSession(
      req,
      res,
      app.get("use-online-tokens")
    );
    let status = 200;
    let error = null;
    let data = null;

    try {
      const response = await getPriceRule(session, process.env.DISCOUNTS_PRICE_RULE_ID)
      data = response
    } catch (e) {
      console.log(`Failed to process /api/ruleset/get: ${e.message}`);
      status = 500;
      error = e.message;
    }

    res.status(status).send({ success: status === 200, error, data });
  });

  app.use(
    "/api/*",
    verifyRequest(app, {
      billing: billingSettings,
    })
  );

  app.use(express.json());

  app.use((req, res, next) => {
    const shop = Shopify.Utils.sanitizeShop(req.query.shop);
    if (Shopify.Context.IS_EMBEDDED_APP && shop) {
      res.setHeader(
        "Content-Security-Policy",
        `frame-ancestors https://${encodeURIComponent(
          shop
        )} https://admin.shopify.com;`
      );
    } else {
      res.setHeader("Content-Security-Policy", `frame-ancestors 'none';`);
    }
    next();
  });

  if (isProd) {
    const compression = await import("compression").then(
      ({ default: fn }) => fn
    );
    const serveStatic = await import("serve-static").then(
      ({ default: fn }) => fn
    );
    app.use(compression());
    app.use(serveStatic(PROD_INDEX_PATH, { index: false }));
  }

  app.use("/*", async (req, res, next) => {
    if (typeof req.query.shop !== "string") {
      res.status(500);
      return res.send("No shop provided");
    }

    const shop = Shopify.Utils.sanitizeShop(req.query.shop);
    const appInstalled = await AppInstallations.includes(shop);

    if (!appInstalled && !req.originalUrl.match(/^\/exitiframe/i)) {
      return redirectToAuth(req, res, app);
    }

    if (Shopify.Context.IS_EMBEDDED_APP && req.query.embedded !== "1") {
      const embeddedUrl = Shopify.Utils.getEmbeddedAppUrl(req);

      return res.redirect(embeddedUrl + req.path);
    }

    const htmlFile = join(
      isProd ? PROD_INDEX_PATH : DEV_INDEX_PATH,
      "index.html"
    );

    return res
      .status(200)
      .set("Content-Type", "text/html")
      .send(readFileSync(htmlFile));
  });

  return { app };
}

createServer().then(({ app }) => app.listen(PORT));