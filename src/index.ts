import { TelegramHandlers } from "./lib/telegram/handlers";
import { Telegram } from "./lib/telegram/api";
import { Update } from "./types/telegram";
import { NezhaAPIClient } from "./lib/nezha/api";
import { log, error } from "./lib/utils"
import i18next from "./lib/translations"

export default {
	async fetch(request, env): Promise<Response> {
		const telegram = new Telegram({
			token: env.TELEGRAM_BOT_TOKEN,
		})

		const nezha = await NezhaAPIClient.init({
			base_url: env.NZ_BASEURL,
			username: env.NZ_USERNAME,
			password: env.NZ_PASSWORD,
			cache: env.NZ_BOT_STORE,
		})

		i18next.changeLanguage(env.LANG);

		const handlers = new TelegramHandlers({ uid: parseInt(env.TELEGRAM_UID), nzClient: nezha });
		registerAllCommands(telegram, handlers);

		const url = new URL(request.url);
		switch (url.pathname) {
			case "/register": {
				try {
					await basicAuth(request, env);
				} catch (error) {
					return new Response((error as Error).message, {
						status: 401,
						headers: {
							'WWW-Authenticate': 'Basic realm="Restricted Area"',
						},
					});
				}

				await telegram.setMyCommands(handlers.getCommands());

				const webHookUrl = `https://${url.hostname}${env.ENDPOINT_PATH}`;
				return telegram.setWebhook(webHookUrl, env.TELEGRAM_SECRET);
			}
			case "/unregister": {
				try {
					await basicAuth(request, env);
				} catch (error) {
					return new Response((error as Error).message, {
						status: 401,
						headers: {
							'WWW-Authenticate': 'Basic realm="Restricted Area"',
						},
					});
				}

				return telegram.deleteWebhook();
			}
			case "/refresh": {
				try {
					await basicAuth(request, env);
				} catch (error) {
					return new Response((error as Error).message, {
						status: 401,
						headers: {
							'WWW-Authenticate': 'Basic realm="Restricted Area"',
						},
					});
				}

				await refreshToken(nezha);
				return new Response('refresh completed');
			}
			case env.ENDPOINT_PATH: {
				if (env.TELEGRAM_SECRET && request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.TELEGRAM_SECRET) {
					return new Response("Unauthorized", { status: 401 });
				}

				const update: Update = await request.json();
				const resp = await telegram.onUpdate(update);

				if (resp) {
					return resp;
				} else {
					return new Response('No response');
				}
			}
			default: {
				return new Response('Wrong route', { status: 404 });
			}
		}
	},
	async scheduled(_, env) {
		const nezha = await NezhaAPIClient.init({
			base_url: env.NZ_BASEURL,
			username: env.NZ_USERNAME,
			password: env.NZ_PASSWORD,
			cache: env.NZ_BOT_STORE,
		})

		await refreshToken(nezha);
	},
} satisfies ExportedHandler<Env>;

async function basicAuth(req: Request, env: Env) {
	const authHeader = req.headers.get('Authorization')
	const expectedAuth = env.PASSWORD;

	if (!authHeader || !authHeader.startsWith('Basic ')) {
		throw new Error("Unauthorized");
	}

	const encodedCredentials = authHeader.split(' ')[1]
	const decodedCredentials = atob(encodedCredentials)
	const [_, password] = decodedCredentials.split(':')

	const encoder = new TextEncoder();
	if (!crypto.subtle.timingSafeEqual(encoder.encode(password), encoder.encode(expectedAuth))) {
		throw new Error("Unauthorized");
	}
}

function registerAllCommands(client: Telegram, handlers: TelegramHandlers) {
	client.registerCommand({
		command: "start",
		fn: handlers.startHandler,
	});
	client.registerCommand({
		command: "help",
		fn: handlers.startHandler,
	});
	client.registerCommand({
		command: "sid",
		fn: handlers.sidHandler,
	});
	client.registerCommand({
		command: "server",
		fn: handlers.serverHandler,
	});
	client.registerCommand({
		command: "overview",
		fn: handlers.overviewHandler,
	});
	client.registerCommand({
		command: "monitor",
		fn: handlers.monitorHandler,
	});
	client.registerCommand({
		command: "transfer",
		fn: handlers.transferHandler,
	});

	client.registerCallback(handlers.callBackHandler);
}

async function refreshToken(nezha: NezhaAPIClient) {
	log("refreshing token...");

	try {
		await nezha.refreshToken();
	} catch (e) {
		error("refresh failed: ", (e as Error).message);
	}
	log("refresh succeeded.");
}
