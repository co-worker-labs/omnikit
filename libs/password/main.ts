import { randomInt, sum } from "../../utils/math";
import { agsyllables, agwordlist } from './wordlist'

export const random_uppercase_checked = 1;
export const random_lowercase_checked = 1 << 1;
export const random_numbers_checked = 1 << 2;
export const random_symbols_checked = 1 << 3;
export const random_avoid_amibugous_checked = 1 << 4;

export const memorable_capitalize_checked = 1;
export const memorable_full_words_checked = 1 << 1;

export type PasswordType = 'Random' | 'Memorable'

export interface ComparisonData {
    type: PasswordType;
    password: string[];
    characters: number;
    timestamp: number;
}

export class PasswordLength {
    current: number;
    min: number;
    max: number;
    constructor(current: number, min: number, max: number) {
        this.current = current;
        this.min = min;
        this.max = max;
    }
}

export function defaultCharacters(passwordType: PasswordType): number {
    switch (passwordType) {
        case 'Random':
            return random_uppercase_checked | random_lowercase_checked | random_numbers_checked | random_symbols_checked;
        case 'Memorable':
            return memorable_full_words_checked;
    }
}

export function defaultLength(passwordType: PasswordType): PasswordLength {
    switch (passwordType) {
        case 'Random':
            return new PasswordLength(15, 3, 64);
        case 'Memorable':
            return new PasswordLength(5, 2, 15);
    }
}

export function printPassword(type: PasswordType, password: string[]): string {
    switch (type) {
        case 'Random':
            let html = '';
            for (var i = 0; i < password[0].length; i++) {
                let char = password[0].charAt(i);
                if (char >= '0' && char <= '9') {
                    html += '<span class="text-primary">' + char + '</span>'
                } else if (characters_symbols.includes(char)) {
                    html += '<span class="text-danger">' + char + '</span>'
                } else {
                    html += char;
                }
            }
            return html;
        case 'Memorable':
            return password.join('<span class="text-danger">-</span>');
    }
}

export function copyPassword(type: PasswordType, password: string[]): string {
    switch (type) {
        case 'Random':
            return password[0];
        case 'Memorable':
            return password.join('-');
    }
}

export function generate(type: PasswordType, characters: number, length: number): string[] {
    switch (type) {
        case 'Random':
            const password = generateRandom(characters, length);
            return [password];
        case 'Memorable':
            return generateMemorable(characters, length);
    }
}

const characters_symbols = '~!@#$%^&*()_-+=}]{[:;?<>,\'\"\\';
const characters_amibugous = ['0', 'o', 'O', '1', 'i', 'I', 'l', '2', 'z', 'Z'];

const count_uppercase_index = 0;
const count_lowercase_index = 1;
const count_numbers_index = 2;
const count_symbols_index = 3;

function setupCharacterCount(characters: number, length: number): number[] {
    // uppercase, lowercase, numbers, symobals
    const count = [0, 0, 0, 0];
    let indexes = [];

    if ((characters & random_uppercase_checked) != 0) {
        count[count_uppercase_index] = 1;
        indexes.push(count_uppercase_index);
    }
    if ((characters & random_lowercase_checked) != 0) {
        count[count_lowercase_index] = 1;
        indexes.push(count_lowercase_index);
    }
    if ((characters & random_numbers_checked) != 0) {
        count[count_numbers_index] = 1;
        indexes.push(count_numbers_index);
    }
    if ((characters & random_symbols_checked) != 0) {
        count[count_symbols_index] = 1;
        indexes.push(count_symbols_index);
    }

    let balance = 0;
    do {
        balance = length - sum(count);
        if (balance == 0) {
            break;
        }
        const index: number = indexes[randomInt(0, indexes.length)];
        if (balance < 0) {
            count[index] = count[index] - 1;
            if (count[index] == 0) {
                indexes = indexes.filter(it => it != index);
            }
        } else if (balance > 0) {
            count[index] = count[index] + 1;
        }
    } while (true);

    return count;
}

function randomChars(length: number, chars: string, isAvoidAmibugous: boolean): string {
    let result = '';
    for (var i = 0; i < length; i++) {
        const char = chars.charAt(randomInt(0, chars.length));
        if (isAvoidAmibugous && characters_amibugous.includes(char)) {
            i--;
            continue;
        }
        result += char;
    }
    return result;
}

function randomRangeChars(length: number, startChar: number, endChar: number, isAvoidAmibugous: boolean): string {
    let result = '';
    for (var i = 0; i < length; i++) {
        const char = String.fromCharCode(randomInt(startChar, endChar + 1));
        if (isAvoidAmibugous && characters_amibugous.includes(char)) {
            i--;
            continue;
        }
        result += char;
    }
    return result;
}

function shuffleString(raw: string): string {
    var arr = raw.split('');           // Convert String to array
    var n = arr.length;              // Length of the array

    for (var i = 0; i < n - 1; ++i) {
        var j = randomInt(0, n);       // Get random of [0, n-1]

        var temp = arr[i];             // Swap arr[i] and arr[j]
        arr[i] = arr[j];
        arr[j] = temp;
    }

    return arr.join('');
}

function generateRandom(characters: number, length: number): string {
    let isAvoidAmibugous = (characters & random_avoid_amibugous_checked) != 0;
    if (characters == (random_avoid_amibugous_checked | random_numbers_checked)) {
        isAvoidAmibugous = false;
    }

    const countArr = setupCharacterCount(characters, length);
    console.log("Finally count: " + JSON.stringify(countArr));

    let result = '';
    if (countArr[count_uppercase_index] > 0) {
        result += randomRangeChars(countArr[count_uppercase_index], 'A'.charCodeAt(0), 'Z'.charCodeAt(0), isAvoidAmibugous);
    }
    if (countArr[count_lowercase_index] > 0) {
        result += randomRangeChars(countArr[count_lowercase_index], 'a'.charCodeAt(0), 'z'.charCodeAt(0), isAvoidAmibugous);
    }
    if (countArr[count_numbers_index] > 0) {
        result += randomRangeChars(countArr[count_numbers_index], '0'.charCodeAt(0), '9'.charCodeAt(0), isAvoidAmibugous);
    }
    if (countArr[count_symbols_index] > 0) {
        result += randomChars(countArr[count_symbols_index], characters_symbols, false);
    }

    return shuffleString(result);
}

function randomWords(list: string[], length: number): string[] {
    const result: string[] = [];
    while (result.length < length) {
        const word = list[randomInt(0, list.length)];
        if (result.includes(word)) {
            continue;
        }
        result.push(word);
    }
    return result;
}

function generateMemorable(characters: number, length: number): string[] {
    let result: string[];
    if ((characters & memorable_full_words_checked) > 0) {
        result = randomWords(agwordlist, length);
    } else {
        result = randomWords(agsyllables, length);
    }

    if ((characters & memorable_capitalize_checked) > 0) {
        const word = result[0];
        if (word.charAt(0) >= 'a' && word.charAt(0) <= 'z') {
            result[0] = String.fromCharCode(word.charCodeAt(0) - 32).concat(word.substring(1));
        }
    }
    return result;
}