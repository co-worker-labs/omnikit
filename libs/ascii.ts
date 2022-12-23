export function getPrintableCharacters(): number[] {
    const result: number[] = [];
    for (var i = 32; i <= 126; i++) {
        result.push(i);
    }
    return result;
}

export interface ControlCode {
    code: number;
    abbr: string;
    desc: string;
    popular: boolean;
}

export function getControlCodes(): ControlCode[] {
    const controlCodes: ControlCode[] = [
        { 'code': 0, 'abbr': 'NUL', 'desc': 'Null', 'popular': true },
        { 'code': 1, 'abbr': 'SOH', 'desc': 'Start of Heading', 'popular': true },
        { 'code': 2, 'abbr': 'STX', 'desc': 'Start of Text', 'popular': true },
        { 'code': 3, 'abbr': 'ETX', 'desc': 'End of Text', 'popular': true },
        { 'code': 4, 'abbr': 'EOT', 'desc': 'End of Transmission', 'popular': false },
        { 'code': 5, 'abbr': 'ENQ', 'desc': 'Enquiry', 'popular': false },
        { 'code': 6, 'abbr': 'ACK', 'desc': 'Acknowledgement', 'popular': false },
        { 'code': 7, 'abbr': 'BEL', 'desc': 'Bell', 'popular': true },
        { 'code': 8, 'abbr': 'BS', 'desc': 'Backspace', 'popular': true },
        { 'code': 9, 'abbr': 'HT', 'desc': 'Horizontal Tab', 'popular': true },
        { 'code': 10, 'abbr': 'LF', 'desc': 'Line Feed', 'popular': false },
        { 'code': 11, 'abbr': 'VT', 'desc': 'Vertical Tab', 'popular': true },
        { 'code': 12, 'abbr': 'FF', 'desc': 'Form Feed', 'popular': false },
        { 'code': 13, 'abbr': 'CR', 'desc': 'Carriage Return', 'popular': false },
        { 'code': 14, 'abbr': 'SO', 'desc': 'Shift Out', 'popular': false },
        { 'code': 15, 'abbr': 'SI', 'desc': 'Shift In', 'popular': false },
        { 'code': 16, 'abbr': 'DLE', 'desc': 'Data Link Escape', 'popular': false },
        { 'code': 17, 'abbr': 'DC1', 'desc': 'Device Control 1 (often XON)', 'popular': false },
        { 'code': 18, 'abbr': 'DC2', 'desc': 'Device Control 2', 'popular': false },
        { 'code': 19, 'abbr': 'DC3', 'desc': 'Device Control 3 (often XOFF)', 'popular': false },
        { 'code': 20, 'abbr': 'DC4', 'desc': 'Device Control 4', 'popular': false },
        { 'code': 21, 'abbr': 'NAK', 'desc': 'Negative Acknowledgement', 'popular': false },
        { 'code': 22, 'abbr': 'SYN', 'desc': 'Synchronous Idle', 'popular': false },
        { 'code': 23, 'abbr': 'ETB', 'desc': 'End of Transmission Block', 'popular': false },
        { 'code': 24, 'abbr': 'CAN', 'desc': 'Cancel', 'popular': false },
        { 'code': 25, 'abbr': 'EM', 'desc': 'End of Medium', 'popular': false },
        { 'code': 26, 'abbr': 'SUB', 'desc': 'Substitute', 'popular': false },
        { 'code': 27, 'abbr': 'ESC', 'desc': 'Escape', 'popular': true },
        { 'code': 28, 'abbr': 'FS', 'desc': 'File Separator', 'popular': true },
        { 'code': 29, 'abbr': 'GS', 'desc': 'Group Separator', 'popular': false },
        { 'code': 30, 'abbr': 'RS', 'desc': 'Record Separator', 'popular': false },
        { 'code': 31, 'abbr': 'US', 'desc': 'Unit Separator', 'popular': false },
        { 'code': 127, 'abbr': 'DEL', 'desc': 'Delete', 'popular': true }
    ];
    return controlCodes
};
