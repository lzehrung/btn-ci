const execSync = require('child_process').execSync;

// https://regex101.com/r/P463Ja/1
const isBehindRegEx = new RegExp('is behind .* by ([0-9]) commit', 'gm');

module.exports.isBehind = function (directory) {
  var commitsBehind = 0;

  try {
    // update remote repo info
    execSync('git remote update', {
      cwd: directory
    });

    // get local status
    var status = execSync('git status', {
      cwd: directory
    });

    // check status for 'behind by N commits'
    if (!!status) {
      var matches = isBehindRegEx.exec(status);
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
