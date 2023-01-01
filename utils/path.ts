export function pathTrim(path: string): string {
    if (!path) {
        return ''
    }
    path = path.trim();
    let index = path.indexOf('#');
    if (index > 0) {
        path = path.substring(0, index);
    }
    index = path.indexOf('?');
    if (index > 0) {
        path = path.substring(0, index);
    }
    return path;
}