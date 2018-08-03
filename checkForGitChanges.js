//const execSync = require('child_process').execSync;
const spawnSync = require('cross-spawn').sync;

// https://regex101.com/r/P463Ja/1
const isBehindRegEx = new RegExp('is behind .* by ([0-9]) commit', 'gm');

module.exports.isBehind = function (directory) {
  var commitsBehind = 0;

  try {
    // update remote repo info
    spawnSync('git remote update', {
      cwd: directory,
      env: process.env,
      shell: true
    });

    // get local status
    var status = spawnSync('git status', {
      cwd: directory,
      env: process.env,
      shell: true
    });

    var output = null;
    if(!!status && !!status.output) {
      output = status.output.toString();
    }

    // check status for 'behind by N commits'
    if (!!output) {
      var matches = isBehindRegEx.exec(output);
      if (!!matches && matches.length >= 2) {
        commitsBehind = matches[1];
      }
    }
  } catch (error) {
    console.log('error updating git repo to check for new changes', error);
    // assume we need to build if this failed
    commitsBehind = 1;
  }

  if (commitsBehind && !isNaN(commitsBehind)) {
    return true;
  } else {
    return false;
  }
};
