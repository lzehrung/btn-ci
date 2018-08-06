import * as express from 'express';
import * as expressAsyncAwait from 'express-async-await';
const app = express();
expressAsyncAwait(app);
import * as http from 'http';
const server = new http.Server(app);
import * as socket from 'socket.io';
const io = socket(server);
import { Request, Response } from 'express';
import { BuildManager } from './buildManager';
import { BuildDefinition, BuildStatus, BuildManagerEvents, BuildResult } from './models';

// settings
const appName = 'BetterThanNothing CI';
const port = 3000;
const configDir = process.cwd() + '\\definitions';
const logDir = process.cwd() + '\\logs';
const buildMgr = new BuildManager(configDir, logDir);

app.use(express.static('..\\client\\dist\\client'));

// http routes
app.get('/', (req: Request, res: Response) => {
  res.sendFile('index.html');
  return;
});

app.get('/builds', (req: Request, res: Response) => {
  var buildInfoObjects = buildMgr.getBuildInfo();
  res.json(buildInfoObjects);
  return;
});

app.post('/builds/reload', async (req: Request, res: Response) => {
  if(buildMgr.runningBuilds.length) {
    await buildMgr.reload();
    res.status(200);
  } else {
    res.status(400).send('cannot reload; builds are currently running');
  }  
});

app.get('/builds/:buildName', (req: Request, res: Response) => {
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

app.post('/builds/:buildName/start', async (req: Request, res: Response) => {
  var buildDef = buildMgr.buildDefinitions.find((def: BuildDefinition) => {
    return def.name == req.params.buildName;
  });
  if (!!buildDef) {
    var latest = buildMgr.mostRecentLog(req.params.buildName);
    if (!latest || latest.result != BuildStatus.Running) {
      latest = await buildMgr.startBuild(buildDef, true);
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

app.post('/builds/:buildName/cancel', (req: Request, res: Response) => {
  var buildDef = buildMgr.buildDefinitions.find((def: BuildDefinition) => {
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

// socket config
buildMgr.emitter.on(BuildManagerEvents.StartReload, () => {
  io.emit(BuildManagerEvents.StartReload);
});

buildMgr.emitter.on(BuildManagerEvents.EndReload, (builds: BuildDefinition[])=>{
  io.emit(BuildManagerEvents.EndReload, builds);
});

buildMgr.emitter.on(BuildManagerEvents.StartBuild, (buildResult: BuildResult) => {
  io.emit(BuildManagerEvents.StartBuild, buildResult);
});

buildMgr.emitter.on(BuildManagerEvents.EndBuild, (buildResult: BuildResult) => {
  io.emit(BuildManagerEvents.EndBuild, buildResult);
});

buildMgr.emitter.on(BuildManagerEvents.StartBuildStep, (buildResult: BuildResult) => {
  io.emit(BuildManagerEvents.StartBuildStep, buildResult);
});

buildMgr.emitter.on(BuildManagerEvents.UpdateBuildStep, (buildResult: BuildResult) => {
  io.emit(BuildManagerEvents.UpdateBuildStep, buildResult);
});

buildMgr.emitter.on(BuildManagerEvents.EndBuildStep, (buildResult: BuildResult) => {
  io.emit(BuildManagerEvents.EndBuildStep, buildResult);
});


// startup
buildMgr.reload();

server.listen(port);
console.log(`${appName} running! http://localhost:${port}`);
