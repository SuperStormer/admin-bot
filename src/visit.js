(async function () {
	const puppeteer = require("puppeteer");
	const config = require("./config");
	const server = require("./server");

	const sleep = (time) => new Promise((resolve) => setTimeout(resolve, time));

	const args = ["--js-flags=--jitless", "--no-sandbox"];
	const browser = await puppeteer.launch({
		headless: "new",
		pipe: true,
		dumpio: true,
		args,
	});

	server.run({ subscribe: true }, async ({ message }) => {
		const { challengeId, url } = message;
		const challenge = config.challenges.get(challengeId);

		try {
			await Promise.race([
				challenge.handler(url, browser.defaultBrowserContext()),
				sleep(challenge.timeout),
			]);
		} catch (e) {
			console.error(e);
		}
		try {
			await ctx.close();
		} catch {}
	});
})();
