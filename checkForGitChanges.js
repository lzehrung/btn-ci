"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const spawn = require("cross-spawn");
// https://regex101.com/r/P463Ja/1
const isBehindRegEx = new RegExp('is behind .* by ([0-9]) commit', 'gm');
let checkForChanges;
checkForChanges = function (buildDef) {
    let commitsBehind = 0;
    let spawnSync = spawn.sync;
    try {
        // update remote repo info
        spawnSync('git remote update', {
            cwd: buildDef.directory,
            env: process.env,
            shell: true
        });
        // get local status
        var status = spawnSync('git status', {
            cwd: buildDef.directory,
            env: process.env,
            shell: true
        });
        var output = null;
        if (!!status && !!status.output) {
            output = status.output.toString();
        }
        // check status for 'behind by N commits'
        if (!!output) {
            var matches = isBehindRegEx.exec(output);
            if (!!matches && matches.length >= 2) {
                commitsBehind = parseInt(matches[1]);
            }
        }
    }
    catch (error) {
        console.log('error updating git repo to check for new changes', error);
        // assume we need to build if this failed
        commitsBehind = 1;
    }
    if (!isNaN(commitsBehind) && commitsBehind > 0) {
        return true;
    }
    else {
        return false;
    }
};
exports.checkGitForChanges = checkForChanges;
//# sourceMappingURL=checkForGitChanges.js.map