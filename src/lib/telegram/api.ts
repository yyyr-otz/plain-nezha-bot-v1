import * as telegram from '../../types/telegram';

export class Telegram {
	private readonly base_url: string;
	private readonly token: string;
	private readonly handlers: Record<string, telegram.CommandHandler>;
	private callbackHandler?: telegram.CallbackHandler;

	constructor({ base_url, token }: { base_url?: string; token: string }) {
		this.base_url = base_url ? base_url : 'https://api.telegram.org';
		this.token = token;
		this.handlers = {};
	}

	async setWebhook(url: string, secret?: string) {
		return this.newRequest('setWebhook', { url: url, secret_token: secret });
	}

	async deleteWebhook() {
		return this.newRequest('deleteWebhook');
	}

	async onUpdate(update: telegram.Update) {
		if (update.message) {
			return this.onMessage(update.message);
		} else if (update.callback_query) {
			return this.onCallbackQuery(update.callback_query);
		}
	}

	registerCommand({ command, fn }: { command: string; fn: telegram.CommandHandler }) {
		this.handlers[command] = fn;
	}

	registerCallback(fn: telegram.CallbackHandler) {
		this.callbackHandler = fn;
	}

	setMyCommands(commands: telegram.BotCommand[]) {
		return this.newRequest('setMyCommands', {
			commands: commands,
			scope: {
				type: 'all_private_chats',
			},
		});
	}

	private async onMessage(message: telegram.Message) {
		let response: telegram.CommonResponse | undefined;
		for (const command in this.handlers) {
			if (message.text?.startsWith(`/${command}`)) {
				response = await this.handlers[command](message);
				break;
			}
		}

		if (response) {
			const param = this.formMessageMarkdown(message, response);
			return this.sendMessage(param);
		}
	}

	private async onCallbackQuery(callbackQuery: telegram.CallbackQuery) {
		if (!('text' in callbackQuery.message)) return;

		let response: telegram.CommonResponse | undefined;
		if (this.callbackHandler) {
			response = await this.callbackHandler(callbackQuery);
		}

		await this.newRequest('answerCallbackQuery', { callback_query_id: callbackQuery.id });

		if (response) {
			const param = this.formMessageMarkdown(callbackQuery.message, response, true);
			return this.editMessageText(param);
		}
	}

	private formMessageMarkdown(message: telegram.Message, response: telegram.CommonResponse, edit?: boolean) {
		let param: {
			chat_id: number;
			message_id?: number;
			text: string;
			parse_mode: string;
			reply_markup?: { inline_keyboard: telegram.InlineKeyboardButton[][] | undefined };
		} = {
			chat_id: message.chat.id,
			message_id: edit ? message.message_id : undefined,
			text: response.text,
			parse_mode: 'MarkdownV2',
		};

		if (response.withInline) {
			param.reply_markup = {
				inline_keyboard: response.inlineKeyboard,
			};
		}

		return param;
	}

	private async sendMessage(param?: { [key: string]: any }) {
		return this.newRequest('sendMessage', param);
	}

	private async editMessageText(param?: { [key: string]: any }) {
		return this.newRequest('editMessageText', param);
	}

	private async newRequest(method: string, param?: { [key: string]: any }) {
		const endpoint = `${this.base_url}/bot${this.token}/${method}`;

		return fetch(endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(param || {}),
		});
	}
}
