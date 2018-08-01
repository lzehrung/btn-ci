const { execSync } = require('child_process');

module.exports.config = {
  srcDirectory: 'C:\\GitRepos\\cfactor\\PWA'
};

module.exports.build = function() {
  var child = execSync('git reset --hard', { encoding: 'utf-8' });
  console.log(child);
  child = execSync('git pull', { encoding: 'utf-8' });
  console.log(child);
  child = execSync('npm install', { encoding: 'utf-8' });
  console.log(child);
  child = execSync('npm run build', { encoding: 'utf-8' });
  console.log(child);

  if (child.indexOf('Exit status 1') !== -1) {
    return 1;
  } else {
    return 0;
  }
};
