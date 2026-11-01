import { global, save } from './vars.js';

let strings;
await getString(global.settings.locale);

export function loc(key, variables) {
    let string = strings[key];
    if (!string) {
        if (global.settings.expose){
            console.error(`string ${key} not found`);
            console.log(strings);
        }
        return key;
    }
    if (variables) {
        if(variables instanceof Array) {
            for (let i = 0; i < variables.length; i++){
                let re = new RegExp(`%${i}(?!\\d)`, "g");
                if(!re.exec(string)){
                    if (global.settings.expose){
                        console.error(`"%${i}" was not found in the string "${key}" to be replace by "${variables[i]}"`);
                    }
                    continue;
                }
                string = string.replace(re, variables[i]);
            }
            let re = new RegExp("%\\d+(?!\\d)", 'g');
            const results = string.match(re);
            if(results && global.settings.expose){
                console.error(`${results} was found in the string, but there is no variables to make the replacement`);
            }
        }
        else {
            if (global.settings.expose){
                console.error('"variables" need be a instance of "Array"');
            }
        }
    }
    return string;
}

// These have to stay asynchronous: Chrome sends synchronous requests past the service worker, the game couldn't start offline
async function getString(locale) {
    let defaultString = await $.getJSON("strings/strings.json");

    if (locale != "en-US"){
        let localeString;
        try {
            localeString = await $.getJSON(`strings/strings.${locale}.json`);
        }
        catch (e) {
            console.error(e,e.stack);
        }
        const defSize = defaultString.length;

        if (localeString) {
            Object.assign(defaultString, localeString);
        }

        if(defaultString.length != defSize && global.settings.expose){
            console.error(`string.${locale}.json has extra keys.`);
        }
    }
    let string_pack = save.getItem('string_pack') || false;
    if (string_pack && global.settings.sPackOn){
        let themeString;
        try {
            themeString = JSON.parse(LZString.decompressFromUTF16(string_pack));
        }
        catch (e) {
            console.error(e,e.stack);
        }
        const defSize = defaultString.length;
        
        if (themeString) {
            Object.assign(defaultString, themeString);
        }
        
        if (defaultString.length != defSize && global.settings.expose){
            console.error(`string pack has extra keys.`);
        }
    }

    strings = defaultString;
}

export const locales = {
    'en-US': 'English (US)',
    'es-ES': 'Spanish (ESP)',
    'pt-BR': 'Português (BR)',
    'de-DE': 'Deutsch',
    'it-IT': 'Italiano',
    'ru-RU': 'Русский',
    'cs-CZ': 'Čeština',
    'pl-PL': 'Polski',
    'zh-CN': '简体中文',
    'zh-TW': '繁體中文',
    'ko-KR': '한국어',
    'im-PL': 'Igpay-Atinlay',
    'ja-JP': '日本語' 
};
