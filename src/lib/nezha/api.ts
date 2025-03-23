import * as nezha from '../../types/nezha';
import { buildUrl, log } from '../utils';

export interface NezhaAPIClientProps {
	base_url: string;
	username: string;
	password: string;
	cache: KVNamespace;
}

interface _NezhaAPIClientProps extends NezhaAPIClientProps {
	token: string;
}

enum FetcherMethod {
	GET = 'GET',
	POST = 'POST',
	PUT = 'PUT',
	PATCH = 'PATCH',
	DELETE = 'DELETE',
}

export class NezhaAPIClient {
	private readonly base_url: string;
	private readonly username: string;
	private readonly password: string;
	private token: string;
	private readonly cache: KVNamespace;

	private constructor({ base_url, username, password, token, cache }: _NezhaAPIClientProps) {
		this.base_url = base_url;
		this.username = username;
		this.password = password;
		this.token = token;
		this.cache = cache;
	}

	static async init({ base_url, username, password, cache }: NezhaAPIClientProps) {
		const client = new NezhaAPIClient({ base_url, username, password, token: '', cache });

		const val = await cache.get('NZ_TOKEN');
		if (val !== null) {
			client.token = val;
			return client;
		}

		try {
			await client.getToken();
		} catch (error) {
			throw new Error('Failed to initialize NezhaAPIClient: ' + (error as Error).message);
		}

		return client;
	}

	async refreshToken() {
		try {
			const req = await this.fetcher<nezha.LoginResponse>(FetcherMethod.GET, '/api/v1/refresh-token');
			this.token = req.token;
			await this.cache.put('NZ_TOKEN', req.token);
		} catch (error) {
			log('Refresh failed, perhaps the token is expired. Acquiring new token');
			log('The error message is:', (error as Error).message);
			await this.getToken();
		}
	}

	async getServerStats(id?: number) {
		return this.fetcher<nezha.ModelServer[]>(FetcherMethod.GET, '/api/v1/server', { id });
	}

	async getServerGroups() {
		return this.fetcher<nezha.ModelServerGroupResponseItem[]>(FetcherMethod.GET, '/api/v1/server-group', null) || [];
	}

	async getService() {
		return this.fetcher<nezha.ModelServiceResponse>(FetcherMethod.GET, '/api/v1/service', null) || {};
	}

	private async getToken() {
		const req = await this.fetcher<nezha.LoginResponse>(FetcherMethod.POST, '/api/v1/login', {
			username: this.username,
			password: this.password,
		});
		this.token = req.token;
		await this.cache.put('NZ_TOKEN', req.token);
	}

	private async fetcher<T>(method: FetcherMethod, path: string, data?: any) {
		const endpoint = `${this.base_url}${path}`;

		let response;
		if (method === FetcherMethod.GET) {
			response = await fetch(buildUrl(endpoint, data), {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${this.token}`,
				},
			});
		} else {
			response = await fetch(endpoint, {
				method: method,
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${this.token}`,
				},
				body: data ? JSON.stringify(data) : null,
			});
		}
		if (!response.ok) {
			throw new Error(response.statusText);
		}

		const responseData: nezha.CommonResponse<T> = await response.json();
		if (!responseData.success) {
			throw new Error(responseData.error);
		}

		return responseData.data;
	}
}
