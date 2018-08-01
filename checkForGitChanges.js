const execSync = require('child_process').execSync;

// https://regex101.com/r/P463Ja/1
const isBehindRegEx = new RegExp('is behind .* by ([0-9]) commits', 'gm');

module.exports.isBehind = function(directory) {
  var status = execSync('git status', {
    cwd: directory
  });
  var commitsBehind = isBehindRegEx.exec(status)[1];
  if (commitsBehind && !isNaN(commitsBehind)) {
    return true;
  } else {
    return false;
  }
};
