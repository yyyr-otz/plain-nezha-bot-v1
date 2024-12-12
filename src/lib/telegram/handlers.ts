import { md } from '@vlad-yakovlev/telegram-md'
import * as telegram from "../../types/telegram";
import * as nezha from "../../types/nezha";
import { NezhaAPIClient } from '../nezha/api';
import { nezhaUtils, getFlagEmoji } from '../utils';
import i18next from "../translations"

export class TelegramHandlers {
    private readonly uid: number;
    private readonly nzClient: NezhaAPIClient;

    constructor({ uid, nzClient }: { uid: number, nzClient: NezhaAPIClient }) {
        this.uid = uid;
        this.nzClient = nzClient;
    }

    getCommands() {
        const commands: telegram.BotCommand[] = [
            {
                command: "/start",
                description: i18next.t("Print help messages"),
            },
            {
                command: "/help",
                description: i18next.t("Print help messages"),
            },
            {
                command: "/sid",
                description: i18next.t("Print server information (with id)"),
            },
            {
                command: "/server",
                description: i18next.t("Print server information (with server name)"),
            },
            {
                command: "/overview",
                description: i18next.t("Print server overview"),
            },
            {
                command: "/monitor",
                description: i18next.t("Print monitor info"),
            },
            {
                command: "/transfer",
                description: i18next.t("Print cycle transfer info"),
            },
        ]

        return commands;
    }

    startHandler = async (message: telegram.Message) => {
        if (!this.authHandler(message)) return;

        const complexMessage = md`
${md.bold(i18next.t("Available commands"))}:
${md.inlineCode("/sid server_id")} - ${i18next.t("Print server information (with id)")}
${md.inlineCode("/server server_name")} - ${i18next.t("Print server information (with server name)")}
${md.inlineCode("/overview [group_name]")} - ${i18next.t("Print server overview")}
${md.inlineCode("/monitor service_name")} - ${i18next.t("Print monitor info")}
${md.inlineCode("/transfer service_name")} - ${i18next.t("Print cycle transfer info")}
${md.inlineCode("/help")} - ${i18next.t("Print help messages")}
        `

        const response: telegram.CommonResponse = {
            text: md.build(complexMessage),
        };

        return response;
    }

    sidHandler = async (message: telegram.Message) => {
        if (!this.authHandler(message)) return;

        const sidStr = message.text?.slice(4).trim();

        const sid = parseInt(sidStr || '');
        if (isNaN(sid))
            return { text: md.build(md`${i18next.t("The server id is not valid.")}`) };

        return this.generateServerResponse(sid);
    }

    serverHandler = async (message: telegram.Message) => {
        if (!this.authHandler(message)) return;

        const serverName = message.text?.slice(7).trim();
        if (!serverName) {
            return { text: md.build(md`${i18next.t("The server name is not valid.")}`) };
        }

        return this.generateServerResponse(serverName);
    }

    overviewHandler = async (message: telegram.Message) => {
        if (!this.authHandler(message)) return;

        const groupName = message.text?.slice(9).trim();
        return this.generateOverviewResponse(groupName);
    }

    monitorHandler = async (message: telegram.Message) => {
        if (!this.authHandler(message)) return;

        const serviceName = message.text?.slice(8).trim();
        if (!serviceName)
            return { text: md.build(md`${i18next.t("The service name is not valid.")}`) };

        return this.generateMonitorResponse(serviceName);
    }

    transferHandler = async (message: telegram.Message) => {
        if (!this.authHandler(message)) return;

        const serviceName = message.text?.slice(9).trim();
        if (!serviceName)
            return { text: md.build(md`${i18next.t("The service name is not valid.")}`) };

        return this.generateTransferResponse(serviceName);
    }

    callBackHandler = async (query: telegram.CallbackQuery) => {
        if (query.message.chat.type !== "private") return;
        if (query.from.id !== this.uid) return;

        const data = query.data;
        if (data?.startsWith("refresh_server")) {
            const sidStr = data.split("_")[2];
            const sid = parseInt(sidStr);
            return this.generateServerResponse(sid);
        } else if (data?.startsWith("overview")) {
            const g = data.split("_");
            let groupName: string | undefined;
            if (g.length > 1) {
                groupName = g[1];
            }
            return this.generateOverviewResponse(groupName);
        } else if (data?.startsWith("monitor")) {
            const serviceName = data.split("_")[1];
            return this.generateMonitorResponse(serviceName);
        } else if (data?.startsWith("transfer")) {
            const serviceName = data.split("_")[1];
            return this.generateTransferResponse(serviceName);
        }
    }

    private async generateTransferResponse(serviceName: string) {
        const serviceResp = await this.nzClient.getService();
        if (!serviceResp.cycle_transfer_stats)
            return { text: md.build(md`${i18next.t("No cycle transfer data available.")}`) };

        let matchedServiceName: string | undefined;
        const matchedService = Object.values(serviceResp.cycle_transfer_stats).find(
            s => s.name.toLowerCase().includes(serviceName.toLowerCase())
        );

        if (matchedService) {
            matchedServiceName = matchedService.name;
        } else {
            return { text: md.build(md`${i18next.t("No service matches.")}`) };
        }

        const response: telegram.CommonResponse = {
            text: md.build(md`
🛣 ${md.bold(matchedServiceName)}
==========================
${i18next.t("Cycle Start")}: ${new Date(matchedService.from).toLocaleString(i18next.t("locale"))}
${i18next.t("Cycle End")}: ${new Date(matchedService.to).toLocaleString(i18next.t("locale"))}
${this.formatTransferMessage(matchedService).join('\n')}
${i18next.t("Last Updated At")}: ${md.bold((new Date).toLocaleString(i18next.t("locale")))}
            `),
            withInline: true,
            inlineKeyboard: [
                [
                    {
                        "text": "Refresh",
                        "callback_data": `transfer_${matchedServiceName}`,
                    }
                ]
            ]
        }

        return response;
    }

    private formatTransferMessage(service: nezha.ModelCycleTransferStats) {
        return Object.entries(service.server_name).map(
            ([sid, name]) => `
${i18next.t("Server")}: ${name}
${i18next.t("Usage")}: ${nezhaUtils.formatUsage(service.transfer[sid], service.max)}% ${nezhaUtils.formatBytes(service.transfer[sid])}/${nezhaUtils.formatBytes(service.max)}
${i18next.t("Next Update Time")}: ${new Date(service.next_update[sid]).toLocaleString(i18next.t("locale"))}
            `
        )
    }

    private async generateMonitorResponse(serviceName: string) {
        const serviceResp = await this.nzClient.getService();
        if (!serviceResp.services)
            return { text: md.build(md`${i18next.t("No service data available.")}`) };

        let matchedServiceName: string | undefined;

        const matchedService = Object.values(serviceResp.services).find(
            s => s.service_name.toLowerCase().includes(serviceName.toLowerCase())
        );

        if (matchedService) {
            matchedServiceName = matchedService.service_name;
        } else {
            return { text: md.build(md`${i18next.t("No service matches.")}`) };
        }

        const avgDelay = matchedService.delay.length > 0
            ? matchedService.delay.reduce((a, b) => a + b, 0) / matchedService.delay.length
            : 0;

        const response: telegram.CommonResponse = {
            text: md.build(md`
🚨 ${md.bold(matchedServiceName)}
==========================
${i18next.t("Current Status")}: ${matchedService.up[29] > matchedService.down[29] ? "✅" : "❌"}
${i18next.t("Availability")}: ${nezhaUtils.formatUsage(matchedService.total_up - matchedService.total_down, matchedService.total_up)}%
${i18next.t("Average Delay")}: ${avgDelay.toFixed(2)}ms

${i18next.t("Last Updated At")}: ${md.bold((new Date).toLocaleString(i18next.t("locale")))}
                `),
            withInline: true,
            inlineKeyboard: [
                [
                    {
                        "text": i18next.t("Refresh"),
                        "callback_data": `monitor_${matchedServiceName}`,
                    }
                ]
            ]
        }

        return response;
    }

    private async generateOverviewResponse(groupName?: string) {
        let servers = await this.nzClient.getServerStats();
        const groups = await this.nzClient.getServerGroups();

        let matchedGroupName: string | undefined;
        if (groupName) {
            const group = groups.find(group => group.group.name.toLowerCase().includes(groupName.toLowerCase()));
            if (group) {
                servers = servers.filter(s => group.servers.includes(s.id));
                matchedGroupName = group.group.name;
            } else {
                return { text: md.build(md`${i18next.t("No group matches.")}`) };
            }
        }

        const inlineKeyboard: telegram.InlineKeyboardButton[][] = [
            [
                {
                    text: i18next.t("All"),
                    callback_data: "overview",
                },
            ],
            ...groups.reduce(
                (result: telegram.InlineKeyboardButton[][], group, index) => {
                    if (index % 4 === 0) result.push([]);
                    result[result.length - 1].push({
                        text: group.group.name,
                        callback_data: `overview_${group.group.name}`,
                    });
                    return result;
                },
                [] as telegram.InlineKeyboardButton[][]
            ),
        ];

        const stats = this.calculateGroupStats(servers);
        const response: telegram.CommonResponse = {
            text: md.build(md`
📊 ${i18next.t("Statistics")}${matchedGroupName ? " for " : ""}${md.bold(matchedGroupName)}
==========================
${i18next.t("Total Servers")}: ${stats.servers}
${i18next.t("Online Servers")}: ${stats.online_servers}
${i18next.t("Memory")}: ${nezhaUtils.formatUsage(stats.mem_used, stats.mem_total)}% ${nezhaUtils.formatBytes(stats.mem_used)}/${nezhaUtils.formatBytes(stats.mem_total)}
${i18next.t("Swap")}: ${nezhaUtils.formatUsage(stats.swap_used, stats.swap_total)}% ${nezhaUtils.formatBytes(stats.swap_used)}/${nezhaUtils.formatBytes(stats.swap_total)}
${i18next.t("Disk")}: ${nezhaUtils.formatUsage(stats.disk_used, stats.disk_total)}% ${nezhaUtils.formatBytes(stats.disk_used)}/${nezhaUtils.formatBytes(stats.disk_total)}
${i18next.t("Traffic")}: ↓${nezhaUtils.formatBytes(stats.net_in_transfer)} ↑${nezhaUtils.formatBytes(stats.net_out_transfer)}
${i18next.t("NIC")}: ↓${nezhaUtils.formatBytes(stats.net_in_speed)}/s ↑${nezhaUtils.formatBytes(stats.net_out_speed)}/s
${i18next.t("Traffic Symmetry")}: ${nezhaUtils.formatUsage(stats.net_out_transfer, stats.net_in_transfer)}%

${i18next.t("Last Updated At")}: ${md.bold((new Date).toLocaleString(i18next.t("locale")))}
            `),
            withInline: true,
            inlineKeyboard: inlineKeyboard,
        }

        return response;
    }

    private calculateGroupStats(servers: nezha.ModelServer[]): nezha.OverviewStats {
        return servers.reduce((acc, s) => {
            acc.servers++;
            if (!nezhaUtils.isOffline(s.last_active)) {
                acc.online_servers++;
            }
            acc.mem_used += s.state.mem_used;
            acc.mem_total += s.host.mem_total;
            acc.swap_used += s.state.swap_used;
            acc.swap_total += s.host.swap_total;
            acc.disk_used += s.state.disk_used;
            acc.disk_total += s.host.disk_total;
            acc.net_in_speed += s.state.net_in_speed;
            acc.net_out_speed += s.state.net_out_speed;
            acc.net_in_transfer += s.state.net_in_transfer;
            acc.net_out_transfer += s.state.net_out_transfer;
            return acc;
        }, {
            servers: 0,
            online_servers: 0,
            mem_used: 0,
            mem_total: 0,
            swap_used: 0,
            swap_total: 0,
            disk_used: 0,
            disk_total: 0,
            net_in_speed: 0,
            net_out_speed: 0,
            net_in_transfer: 0,
            net_out_transfer: 0,
        });
    }

    private async generateServerResponse(sid: number | string) {
        const servers = await this.nzClient.getServerStats();
        let server: nezha.ModelServer | undefined;

        if (typeof sid === 'number') {
            for (const s of servers) {
                if (s.id === sid) {
                    server = s;
                    break;
                }
            }
        } else {
            for (const s of servers) {
                if (s.name.toLowerCase().includes(sid.toLowerCase())) {
                    server = s;
                    break;
                }
            }
        }

        const response: telegram.CommonResponse = server
            ? {
                text: this.formatServerMessage(server),
                withInline: true,
                inlineKeyboard: [
                    [
                        {
                            text: i18next.t("Refresh"),
                            callback_data: `refresh_server_${server.id}`,
                        },
                    ]
                ]
            } : { text: md.build(md`${i18next.t("The server id is not valid.")}`) };

        return response;
    }

    private formatServerMessage(server: nezha.ModelServer) {
        const onlineStr = i18next.t("Online");
        const offlineStr = i18next.t("Offline")
        return md.build(md`
${getFlagEmoji(server.geoip.country_code)} ${md.bold(server.name)} ${nezhaUtils.isOffline(server.last_active) ? `❌️ ${offlineStr}` : `✅ ${onlineStr}`}
==========================
${i18next.t("ID")}: ${md.bold(server.id)}
${i18next.t("IPv4")}: ${server.geoip.ip.ipv4_addr || `❌️`}
${i18next.t("IPv6")}: ${server.geoip.ip.ipv6_addr || `❌️`}
${i18next.t("Platform")}: ${server.host.platform || 'Unknown'}
${i18next.t("CPU Model(s)")}: ${server.host.cpu.join(',')}${server.host.gpu ? `\n${i18next.t("GPU Model(s)")}: ${server.host.gpu.join(',')}` : ''}
${i18next.t("Uptime")}: ${(new Date(server.state.uptime)).getDay()} ${i18next.t("Days")}
${i18next.t("Load")}: ${server.state.load_1 || 0} ${server.state.load_5 || 0} ${server.state.load_15 || 0}
${i18next.t("CPU Usage")}: ${server.state.cpu ? server.state.cpu.toFixed(2) : 0}%
${i18next.t("Memory")}: ${nezhaUtils.formatUsage(server.state.mem_used, server.host.mem_total)}% ${nezhaUtils.formatBytes(server.state.mem_used)}/${nezhaUtils.formatBytes(server.host.mem_total)}
${i18next.t("Swap")}: ${nezhaUtils.formatUsage(server.state.swap_used, server.host.swap_total)}% ${nezhaUtils.formatBytes(server.state.swap_used)}/${nezhaUtils.formatBytes(server.host.swap_total)}
${i18next.t("Disk")}: ${nezhaUtils.formatUsage(server.state.disk_used, server.host.disk_total)}% ${nezhaUtils.formatBytes(server.state.disk_used)}/${nezhaUtils.formatBytes(server.host.disk_total)}
${i18next.t("Traffic")}: ↓${nezhaUtils.formatBytes(server.state.net_in_transfer)} ↑${nezhaUtils.formatBytes(server.state.net_out_transfer)}
${i18next.t("NIC")}: ↓${nezhaUtils.formatBytes(server.state.net_in_speed)}/s ↑${nezhaUtils.formatBytes(server.state.net_out_speed)}/s

${i18next.t("Last Updated At")}: ${md.bold((new Date).toLocaleString(i18next.t("locale")))}
        `)
    }

    private authHandler = (message: telegram.Message) => {
        if (message.chat.type !== "private")
            return false;

        if (message.from?.id !== this.uid)
            return false;

        return true;
    }
}
