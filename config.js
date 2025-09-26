function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export default {
    rate_limit: {
        time_window: 30 * 1000,
        max: 2,
    },
    domain_regex: /^.+$/,
    trust_proxy: true,
    visit: async (url, ctx) => {
        const page = await ctx.newPage();
        await page.setCookie({
            name: "flag",
            value: "flag{fake_flag}",
            domain: new URL(url).hostname,
        });
        await page.goto(url, {
            timeout: 3000,
            waitUntil: "domcontentloaded",
        });
        await sleep(5000);
    },
};
