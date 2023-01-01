import { findTool, ToolData } from "./tools";

const key = 'w3tools_online.access_log'
const recent_size = 3;

interface AccessLog {
    path: string;
    timestamp: number;
}

export async function logAccess(path: string) {
    if (!path || path == '/' || path.startsWith('/tnc')) {
        return;
    }

    const str = localStorage.getItem(key);
    try {
        let json;
        if (str) {
            json = JSON.parse(str);
            json[path] = new Date().getTime()
        } else {
            json = { [path]: new Date().getTime() }
        }
        localStorage.setItem(key, JSON.stringify(json));
    } catch (e) {
        console.error(e);
        clear();
    }
}

export function listRecents(current: string): ToolData[] {
    const str = localStorage.getItem(key);
    if (!str) {
        return [];
    }
    const result: ToolData[] = [];
    try {
        let json = JSON.parse(str);
        console.log(json);

        const arr: AccessLog[] = [];
        const keys = Object.keys(json);
        keys.forEach((data) => arr.push({
            path: data,
            timestamp: json[data],
        }))
        const finalArr = arr.sort((a, b) => b.timestamp - a.timestamp);

        for (var i = 0; i < finalArr.length && result.length < recent_size; i++) {
            const router = finalArr[i].path;
            if (router != current) {
                const data = findTool(router);
                result.push(data);
            }
        }
    } catch (e) {
        console.error(e);
        clear();
    }
    return result;
}

export function clear() {
    localStorage.removeItem(key);
}