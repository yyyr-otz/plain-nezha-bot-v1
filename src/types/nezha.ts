export interface CommonResponse<T> {
    success: boolean;
    error: string;
    data: T;
}

export interface LoginResponse {
    expire: string;
    token: string;
}

export interface ModelServer {
    created_at: string;
    /** DDNS配置 */
    ddns_profiles?: number[];
    /** 展示排序，越大越靠前 */
    display_index: number;
    /** 启用DDNS */
    enable_ddns: boolean;
    geoip: ModelGeoIP;
    /** 对游客隐藏 */
    hide_for_guest: boolean;
    host: ModelHost;
    id: number;
    last_active: string;
    name: string;
    /** 管理员可见备注 */
    note: string;
    /** 公开备注 */
    public_note: string;
    state: ModelHostState;
    updated_at: string;
    uuid: string;
}

export interface ModelGeoIP {
    country_code: string;
    ip: ModelIP;
}

export interface ModelHost {
    arch: string;
    boot_time: number;
    cpu: string[];
    disk_total: number;
    gpu: string[];
    mem_total: number;
    platform: string;
    platform_version: string;
    swap_total: number;
    version: string;
    virtualization: string;
}

export interface ModelHostState {
    cpu: number;
    disk_used: number;
    gpu: number[];
    load_1: number;
    load_15: number;
    load_5: number;
    mem_used: number;
    net_in_speed: number;
    net_in_transfer: number;
    net_out_speed: number;
    net_out_transfer: number;
    process_count: number;
    swap_used: number;
    tcp_conn_count: number;
    temperatures: ModelSensorTemperature[];
    udp_conn_count: number;
    uptime: number;
}

export interface ModelSensorTemperature {
    name?: string;
    temperature?: number;
}

export interface ModelIP {
    ipv4_addr: string;
    ipv6_addr: string;
}

export interface ModelServerGroupResponseItem {
    group: ModelServerGroup;
    servers: number[];
}

export interface ModelServerGroup {
    created_at: string;
    id: number;
    name: string;
    updated_at: string;
}

// Library-specific fields
export interface OverviewStats {
    servers: number;
    online_servers: number;
    mem_used: number;
    mem_total: number;
    swap_used: number;
    swap_total: number;
    disk_used: number;
    disk_total: number;
    net_in_speed: number;
    net_in_transfer: number;
    net_out_speed: number;
    net_out_transfer: number;
}

export interface ModelServiceResponse {
    cycle_transfer_stats: Record<string, ModelCycleTransferStats>;
    services: Record<string, ModelServiceResponseItem>;
}

export interface ModelCycleTransferStats {
    from: string;
    max: number;
    min: number;
    name: string;
    next_update: Record<string, string>;
    server_name: Record<string, string>;
    to: string;
    transfer: Record<string, number>;
}

export interface ModelServiceResponseItem {
    current_down: number;
    current_up: number;
    delay: number[];
    down: number[];
    service_name: string;
    total_down: number;
    total_up: number;
    up: number[];
}
