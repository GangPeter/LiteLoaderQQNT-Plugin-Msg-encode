const { ipcMain, shell } = require("electron");
const fs = require('fs');
const path = require('path');
const crypto = require("crypto");
const algorithm = 'aes-256-ctr';
const ENCRYPTION_KEY = 'Put_Your_Password_Here'; // or generate sample key Buffer.from('FoCKvdLslUuB4y3EZlKate7XGottHski1LmyqJHvUhs=', 'base64');
const IV_LENGTH = 16;

function log(...args) {
    console.log(`[Msg Encode Main]`, ...args);
}
function isJSON(str) {
    if (typeof str == 'string') {
        try {
            var obj = JSON.parse(str);
            if (typeof obj == 'object' && obj)
                return true;
            else
                return false;
        } catch (e) {
            log('error：' + str + '!!!' + e);
            return false;
        }
    }
    log('It is not a string!');
    return false;
}

function encrypt(text, key) {
    let iv = crypto.randomBytes(IV_LENGTH);
    // let cipher = crypto.createCipheriv(algorithm, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text, key) {
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    // let decipher = crypto.createDecipheriv(algorithm, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

//
function folderExists(settingsPath, defaultSettings) {
    if (!fs.existsSync(settingsPath)) {
        fs.writeFileSync(settingsPath, defaultSettings);
        log(defaultSettings);
    } else {
        const data = fs.readFileSync(settingsPath, "utf-8");
        if ((!isJSON(data))
            || (!JSON.parse(data).version)
            || (JSON.parse(data).version !== JSON.parse(defaultSettings).version)) {
            fs.writeFileSync(settingsPath, defaultSettings);
            log(defaultSettings);
        }
    }
}

function openWeb(url) {
    shell.openExternal(url);
}

// 加载插件时触发
function onLoad(plugin) {
    const defaultSettings = JSON.parse(fs.readFileSync(path.join(__dirname, 'default-settings.json'), 'utf-8'));
    const defaultIcons = JSON.parse(fs.readFileSync(path.join(__dirname, 'default-icons.json'), 'utf-8'));
    const pluginDataPath = plugin.path.data;
    const settingsPath = path.join(pluginDataPath, "settings.json");
    const iconsPath = path.join(pluginDataPath, "icons.json");
    const logPath = path.join(pluginDataPath, "log.log");

    function exists() {
        if (!fs.existsSync(pluginDataPath)) {
            fs.mkdirSync(pluginDataPath, { recursive: true });
        }
        folderExists(settingsPath, JSON.stringify(defaultSettings));
        folderExists(iconsPath, JSON.stringify(defaultIcons));
        if (!fs.existsSync(logPath)) fs.writeFileSync(logPath, "");
    }

    exists();
    // 外部打开网址
    ipcMain.on(
        "LiteLoader.qqencodeMsg.openWeb",
        (event, ...message) => openWeb(...message)
    );
    ipcMain.handle(
        "LiteLoader.qqencodeMsg.encrypt",
        (event, data, key) => {
            return encrypt(data, key);
        }
    );
    ipcMain.handle(
        "LiteLoader.qqencodeMsg.decrypt",
        (event, encrypted, key) => {
            return decrypt(encrypted, key);
        }
    );
    ipcMain.handle(
        "LiteLoader.qqencodeMsg.getIcons",
        (event, message) => {
            exists();
            try {
                const data = fs.readFileSync(iconsPath, "utf-8");
                const config = JSON.parse(data);
                return config;
            } catch (error) {
                log(error);
                return {};
            }
        }
    );
    //保存设置
    ipcMain.handle(
        "LiteLoader.qqencodeMsg.setIcons",
        (event, content) => {
            exists();
            try {
                const new_config = typeof content == "string" ? content : JSON.stringify(content);
                fs.writeFileSync(iconsPath, new_config, "utf-8");
                // log(new_config);
            } catch (error) {
                log(error);
            }
        }
    );
    ipcMain.handle(
        "LiteLoader.qqencodeMsg.writelog",
        (event, log) => {
            try {
                fs.writeFileSync(logPath, log, { flags: 'a', encoding: 'utf8' });
                // log(log);
            } catch (error) {
                log(error);
            }
        }
    );
    ipcMain.handle(
        "LiteLoader.qqencodeMsg.getSettings",
        (event, message) => {
            exists();
            try {
                const data = fs.readFileSync(settingsPath, "utf-8");
                const config = JSON.parse(data);
                return config;
            } catch (error) {
                log(error);
                return {};
            }
        }
    );
    ipcMain.handle(
        "LiteLoader.qqencodeMsg.getDefaultSettings",
        (event) => {
            return defaultSettings;
        }
    );
    ipcMain.handle(
        "LiteLoader.qqencodeMsg.setSettings",
        (event, content) => {
            exists();
            try {
                const new_config = typeof content == "string" ? content : JSON.stringify(content);
                fs.writeFileSync(settingsPath, new_config, "utf-8");
                log(new_config);
            } catch (error) {
                log(error);
            }
        }
    );
}


// 创建窗口时触发
function onBrowserWindowCreated(window, plugin) {

}


// 这两个函数都是可选的
module.exports = {
    onLoad,
    onBrowserWindowCreated
};