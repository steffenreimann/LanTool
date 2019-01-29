const fs = require('fs');
const os = require('os');
const path = require('path');
const aes = require('../utils/aesEncrypt');


let homeDir = '';
let baseDir = 'LanToolConfigs';
const userCfg = 'user.cfg';
let userCfgPath = '';

function init() {
    homeDir = os.homedir();
    baseDir = path.join(homeDir, baseDir);
    userCfgPath = path.join(baseDir, userCfg);
    return fs.existsSync(baseDir);
}

function initDirs() {
    fs.mkdirSync(baseDir);
}

function getHomeDir() {
    return baseDir;
}

/**
 * Loads encrypted UserConfig file decrypts it and returns it as javascript object
 * @param pwd {string} Password from user
 * @returns {Object} null when error
 */
function loadUserConfig(pwd) {
    if (!fs.existsSync(userCfgPath)) {
        return null;
    }
    const raw = fs.readFileSync(userCfgPath);

    let decrypted = aes.DecryptBuffer(pwd, raw);
    decrypted = decrypted.toString('utf8');
    let jsonObj = null;
    try {
        jsonObj = JSON.parse(decrypted);
    } catch (e) {
        console.log('Could not parse UserConfig');
    }
    return jsonObj;
}

/**
 * Encrypts UserConfig Object with password and writes encrypted data to UserConfig file
 * @param pwd {string} Password from user
 * @param userCfgObj {Object}
 * @returns {boolean}
 */
function writeUserConfig(pwd, userCfgObj) {
    const jsonText = JSON.stringify(userCfgObj);
    const jsonBytes = new Buffer(jsonText, 'utf8');
    const encrypted = aes.EncryptBuffer(pwd, jsonBytes);
    try {
        fs.writeFileSync(userCfgPath, encrypted);
        return true;
    } catch (e) {
        console.error('Could not write UserConfig');
        return false;
    }
}

module.exports = {
    Init: init,
    InitDirs: initDirs,
    GetBaseDir: getHomeDir,
    LoadUserConfig: loadUserConfig,
    WriteUserConfig: writeUserConfig,
};







