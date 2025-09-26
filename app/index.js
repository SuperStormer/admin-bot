import Fastify from "fastify";
import fastifyFormBody from "@fastify/formbody";
import fastifyRateLimit from "@fastify/rate-limit";
import fs from "node:fs/promises";
import puppeteer from "puppeteer";
import config from "./config.js";

const fastify = Fastify({ logger: true, trustProxy: config.trust_proxy ?? false });
fastify.register(fastifyFormBody);

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function visit(url) {
    const initBrowser = puppeteer.launch({
        headless: true,
        args: ["--js-flags=--jitless", "--no-sandbox"],
        acceptInsecureCerts: true,
    });
    const browser = await initBrowser;
    const context = await browser.createBrowserContext();

    console.log("Visiting: " + url);

    try {
        await Promise.any([config.visit(url, context), sleep(config.timeout ?? 60 * 1000)]);
        console.log("Visited: " + url);

        await context.close();
        console.log("Closed...");
    } catch (e) {
        console.error(e);
        await context.close();
    }
}

fastify.get("/", async (req, reply) => {
    reply.type("text/html");
    return (await fs.readFile("index.html"))
        .toString()
        .replace("{msg}", req.query.msg ?? "")
        .replace("{url}", req.query.url ?? "");
});

fastify.register(async function (fastify, options) {
    await fastify.register(fastifyRateLimit, {
        global: true,
        max: config.rate_limit.max ?? 2,
        timeWindow: config.rate_limit.time_window ?? 60 * 1000,
        keyGenerator(request) {
            return (config.trust_proxy && request.headers["x-real-ip"]) || request.ip;
        },
    });
    fastify.post("/", async (req, reply) => {
        const url = req?.body?.url;
        if (url === undefined) {
            return reply.redirect(
                `/?url=${encodeURIComponent(url)}&msg=${encodeURIComponent(`No url provided`)}`
            );
        }

        let parsed_url;
        try {
            parsed_url = new URL(url);
        } catch {
            return reply.redirect(
                `/?url=${encodeURIComponent(url)}&msg=${encodeURIComponent(`Invalid url ${url}`)}`
            );
        }

        if (config.domain_regex === undefined || config.domain_regex.test(parsed_url.hostname)) {
            visit(url);
            return reply.redirect(
                `/?url=${encodeURIComponent(url)}&msg=${encodeURIComponent(`Visiting ${url}`)}`
            );
        } else {
            return reply.redirect(
                `/?url=${encodeURIComponent(url)}&msg=${encodeURIComponent(`Invalid url ${url}`)}`
            );
        }
    });
    fastify.setErrorHandler(function (error, req, reply) {
        this.log.error(error);
        return reply.redirect(
            `/?url=${encodeURIComponent(req?.body?.url ?? "")}&msg=${encodeURIComponent(
                error.message
            )}`
        );
    });
});

fastify.listen({ port: 8000, host: "0.0.0.0" });
