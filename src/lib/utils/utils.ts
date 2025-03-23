export function buildUrl(path: string, data?: any): string {
	if (!data) return path;
	const url = new URL(path);
	for (const key in data) {
		url.searchParams.append(key, data[key]);
	}
	return url.toString();
}

export function binarySearch<E, T>(arr: E[], target: T, compare_fn: (a: E, b: T) => number): [number, boolean] {
	let i = 0;
	let n = arr.length;
	let j = n;
	while (i < j) {
		let k = (i + j) >> 1;
		if (compare_fn(arr[k], target) < 0) {
			i = k + 1;
		} else {
			j = k;
		}
	}
	return [i, i < n && compare_fn(arr[i], target) === 0];
}

export function compare<T>(a: T, b: T) {
	if (a < b) {
		return -1;
	} else if (a > b) {
		return 1;
	} else {
		return 0;
	}
}

export const nezhaUtils = {
	isOffline: (lastActive: string) => {
		const date = new Date(lastActive);
		const now = new Date();

		const state = (now.getTime() - date.getTime()) / 1000 > 30 ? true : false;
		return state;
	},
	formatBytes: (bytes: number) => {
		if (bytes === 0 || isNaN(bytes)) return '0B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + sizes[i];
	},
	formatUsage: (used: number, total: number) => {
		const result = (used / total) * 100;
		return isNaN(result) ? '0' : result.toFixed(2);
	},
};

export function getFlagEmoji(countryCode?: string) {
	if (!countryCode) return '❔️';

	return countryCode.toUpperCase().replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

export function log(...data: any[]) {
	const now = new Date();
	const formattedTime = now.toISOString();
	console.log(`[${formattedTime}]`, ...data);
}

export function error(...data: any[]) {
	const now = new Date();
	const formattedTime = now.toISOString();
	console.error(`[${formattedTime}]`, ...data);
}
