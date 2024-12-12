export interface Update {
    update_id: number;
    message?: Message;
    edited_message?: Message;
    callback_query?: CallbackQuery;
}

export interface InaccessibleMessage {
    message_id: number;
    date: number;
    chat: Chat;
}

export interface Message {
    message_id: number;
    date: number;
    chat: Chat;
    from?: User;
    reply_to_message?: Message;
    text?: string;
}

export type MaybeInaccessibleMessage = InaccessibleMessage | Message;

export interface CallbackQuery {
    id: string;
    from: User;
    message: MaybeInaccessibleMessage;
    data?: string;
}

export interface User {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
}

export interface Chat {
    id: number;
    type: 'private' | 'group' | 'supergroup' | 'channel';
}

export interface InlineKeyboardMarkup {
    inline_keyboard: InlineKeyboardButton[][];
}

export interface InlineKeyboardButton {
    text: string;
    callback_data?: string;
}

export interface BotCommand {
    command: string;
    description: string;
}

export interface BotCommandScopeAllPrivateChats {
    type: 'all_private_chats';
}

// Library-specific fields
export interface CommonResponse {
    text: string;
    withInline?: boolean;
    inlineKeyboard?: InlineKeyboardButton[][];
}

export type CommandHandler = (message: Message) => Promise<CommonResponse | undefined>;
export type CallbackHandler = (query: CallbackQuery) => Promise<CommonResponse | undefined>;