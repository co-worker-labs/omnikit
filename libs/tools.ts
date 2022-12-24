export interface ToolData {
    path: string;
    title: string;
    description: string;
    searchKeys: string[];
    keywords: string[];
}

export function findTool(path: string): ToolData {
    const result = toolsList.find((v) => v.path === path);
    if (!result) {
        throw 'Invalid page path: ' + path;
    }
    return result;
}

export function listMatchedTools(filter: string): ToolData[] {
    if (filter == '') {
        return toolsList;
    }
    filter = filter.toLocaleLowerCase();
    const filterWords = filter.split(/\s+/);
    return toolsList.filter((data) => {
        for (var fw of filterWords) {
            let found = data.searchKeys.filter(it => it.includes(fw));
            if (found.length == 0) {
                return false;
            }
        }
        return true;
    })
}

export const toolsList: ToolData[] = [
    {
        path: '/generator/password',
        title: 'Password Generator',
        description: 'Generate secure, random, memorable passwords to stay safe online.',
        searchKeys: ['password', 'generator', 'random', 'memorable', 'pin'],
        keywords: ['password', 'generator', 'random', 'memorable', 'pin', 'gen', 'pass', 'text'],
    },
    {
        path: '/ascii',
        title: 'ASCII Table',
        description: 'Ascii character table - What is ascii - Complete tables including hex, octal, html, decimal conversions',
        searchKeys: ['ascii'],
        keywords: ['ascii', 'ascii table', 'ascii code', 'ascii characters', 'conversion',
            'conversions', 'unicode', 'unicode tables', 'ascii help', 'help with ascii', 'asci',
            'aski', 'asky', 'acii', 'askii', 'askey', 'cod', 'cde', 'tabe', 'tble', 'char', 'translation', 'translator',
            'convert', 'character', 'text', 'textual', 'american', 'standard', 'information', 'interchange', 'extended', 'html'],
    },
    {
        path: '/htmlcode',
        title: 'Html Code',
        description: 'HTML codes and HTML special characters',
        searchKeys: ['html', 'codes', 'special', 'characters'],
        keywords: ['ascii', 'html code', 'ascii code', 'special characters', 'alphabet'],
    },
]