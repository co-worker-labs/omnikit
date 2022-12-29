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
    {
        path: '/base64',
        title: 'Base64 Encode/Decode',
        description: 'Base64 Encode or Decode, Basic Authentication',
        searchKeys: ['base64', 'decode', 'encode', 'basic authentication'],
        keywords: ['base64 encode', 'base64', 'base64 decode', 'basic authentication', 'basicauth'],
    },
    {
        path: '/text/analytic',
        title: 'Text Analytics',
        description: 'Analyze text content instantly - Count word, character and so on.',
        searchKeys: ['text', 'analytic', 'analyze', 'counter', 'character', 'insight'],
        keywords: ['word counter', 'counter', 'text analytic', 'analyze text', 'character counter'],
    },
    {
        path: '/generator/hash',
        title: 'Hash Calculator',
        description: 'Hashing Algorithms: MD5, SHA1, SHA2-256, SHA2-512, SHA3-256, SHA3-512',
        searchKeys: ['md5', 'sha-1', 'sha1', 'sha256', 'sha2-256', 'sha3-256', 'sha384', 'sha2-384', 'sha3-384', 'sha512', 'sha2-512', 'sha3-512', 'calculator', 'generator', 'text content', 'file', 'algorithm', 'digest'],
        keywords: ['md5', 'sha-1', 'sha1', 'sha256', 'sha2-256', 'sha3-256', 'sha384', 'sha2-384', 'sha3-384', 'sha512', 'sha2-512', 'sha3-512', 'hashing', 'hashing algorithms', 'message-digest algorithm', 'cryptographic protocol', 'digital signatures'],
    },
]