const express = require('express');
const app = express();
const BuildManager = require('./buildManager');
const { BuildStatus } = require('./models');

// settings
const appName = 'BetterThanNothingCI';
const port = 3000;
const configDir = process.cwd() + '/definitions';
const buildMgr = new BuildManager(configDir);
buildMgr.load(configDir);

app.set('views', process.cwd() + '/views');
app.set('view engine', 'pug');
app.use(express.static('client\\dist\\client'));

app.get('/', (req, res) => {
  res.sendFile('client\\dist\\client\\index.html');
  return;
});

app.get('/builds', (req, res) => {
  var buildInfoObjects = buildMgr.configs.map((buildDef) => {
    return {
      buildDef: buildDef,
      latestRun: null || buildMgr.mostRecentLog(buildDef.name)
    };
  });
  res.json(buildInfoObjects);
  return;
});

app.get('/builds/:buildName', (req, res) => {
  var buildDef = buildMgr.findBuildDef(req.params.buildName);
  var latest = null;
  if (!!buildDef) {
    latest = buildMgr.mostRecentLog(req.params.buildName);
  }

  if (!!buildDef) {
    res.json({
      buildDef: buildDef,
      latestRun: latest
    });
    return;
  } else {
    res.status(404);
    return;
  }
});

app.post('/start/:buildName', (req, res) => {
  var buildDef = buildMgr.configs.find((def) => {
    return def.name == req.params.buildName;
  });
  if (!!buildDef) {
    var latest = buildMgr.mostRecentLog(req.params.buildName);
    if (!latest || latest.result != BuildStatus.Running) {
      latest = buildMgr.startBuild(buildDef);
      res.json({
        buildDef: buildDef,
        latestRun: latest
      });
      return;
    } else {
      res.sendStatus(400, 'Build already running');
      return;
    }
  } else {
    res.sendStatus(404, 'No build definition found');
    return;
  }
});

app.post('/cancel/:buildName', (req, res) => {
  var buildDef = buildMgr.configs.find((def) => {
    return def.name == req.params.buildName;
  });
  if (!!buildDef) {
    var latest = buildMgr.mostRecentLog(req.params.buildName);
    if (!latest || latest.result != BuildStatus.Cancelled) {
      latest = buildMgr.cancelBuild(buildDef.name);
      res.json({
        buildDef: buildDef,
        latestRun: latest
      });
      return;
    } else {
      res.sendStatus(400, 'Build already cancelled');
      return;
    }
  } else {
    res.sendStatus(404, 'No build definition found');
    return;
  }
});

app.listen(port, () => console.log(`${appName} running! http://localhost:${port}`));
