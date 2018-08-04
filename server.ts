import * as express from 'express';
const app = express();
import { BuildManager } from './buildManager';
import { BuildDefinition, BuildStatus } from './models';

// settings
const appName = 'BetterThanNothingCI';
const port = 3000;
const configDir = process.cwd() + '\\definitions';
const logDir = process.cwd() + '\\logs';

app.use(express.static('client\\dist\\client'));

app.get('/', (req, res) => {
  res.sendFile('client\\dist\\client\\index.html');
  return;
});

app.get('/builds', (req, res) => {
  var buildInfoObjects = buildMgr.configs.map((buildDef: BuildDefinition) => {
    return {
      buildDef: buildDef,
      latestRun: null || buildMgr.mostRecentLog(buildDef.name)
    };
  });
  res.json(buildInfoObjects);
  return;
});

app.post('/builds/reload', (req, res) => {
  
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

app.post('/builds/:buildName/start', (req, res) => {
  var buildDef = buildMgr.configs.find((def: BuildDefinition) => {
    return def.name == req.params.buildName;
  });
  if (!!buildDef) {
    var latest = buildMgr.mostRecentLog(req.params.buildName);
    if (!latest || latest.result != BuildStatus.Running) {
      latest = buildMgr.startBuild(buildDef, true);
      res.json({
        buildDef: buildDef,
        latestRun: latest
      });
      return;
    } else {
      res.sendStatus(400).send('Build already running');
      return;
    }
  } else {
    res.sendStatus(404).send('No build definition found');
    return;
  }
});

app.post('/builds/:buildName/cancel', (req, res) => {
  var buildDef = buildMgr.configs.find((def: BuildDefinition) => {
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
      res.sendStatus(400).send('Build already cancelled');
      return;
    }
  } else {
    res.sendStatus(404).send('No build definition found');
    return;
  }
});

const buildMgr = new BuildManager(configDir, logDir);
buildMgr.load();

app.listen(port, () => console.log(`${appName} running! http://localhost:${port}`));
