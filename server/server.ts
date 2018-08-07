import * as express from 'express';
import * as expressAsyncAwait from 'express-async-await';
const app = express();
expressAsyncAwait(app);
import * as http from 'http';
const server = new http.Server(app);
import * as socket from 'socket.io';
const io = socket(server);
import { Request, Response } from 'express';
import { BuildManager } from './build-manager';
import { BuildStatus } from './models';
import { BuildSockets } from './build-sockets';

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
  var buildInfoObjects = buildMgr.getAllBuildInfo();
  res.json(buildInfoObjects);
  return;
});

app.post('/builds/reload', async (req: Request, res: Response) => {
  if (buildMgr.runningBuilds.length) {
    await buildMgr.reload();
    res.status(200);
  } else {
    res.status(400);
  }
});

app.get('/builds/:buildName', (req: Request, res: Response) => {
  let buildInfo = buildMgr.getBuildInfo(req.params.buildName);
  if (!!buildInfo) {
    res.json(buildInfo);
    return;
  } else {
    res.status(404);
    return;
  }
});

app.post('/builds/:buildName/start', async (req: Request, res: Response) => {
  let buildName = req.params.buildName;
  let buildInfo = buildMgr.getBuildInfo(buildName);
  if (!!buildInfo) {
    if (!buildInfo.latestRun || buildInfo.latestRun.result != BuildStatus.Running) {
      let latest = await buildMgr.startBuild(buildInfo.buildDef, true);
      res.json({
        buildDef: buildInfo.buildDef,
        latestRun: latest
      });
      return;
    } else {
      res.sendStatus(400);
      return;
    }
  } else {
    res.sendStatus(404);
    return;
  }
});

app.post('/builds/:buildName/cancel', (req: Request, res: Response) => {
  let buildName = req.params.buildName;
  let buildInfo = buildMgr.getBuildInfo(buildName);
  if (!!buildInfo) {
    if (!buildInfo.latestRun || buildInfo.latestRun.result != BuildStatus.Running) {
      let latest = buildMgr.cancelBuild(buildName);
      res.json({
        buildDef: buildInfo.buildDef,
        latestRun: latest
      });
      return;
    } else {
      res.sendStatus(400);
      return;
    }
  } else {
    res.sendStatus(404);
    return;
  }
});

// startup
const buildSockets = new BuildSockets(io, buildMgr);
buildSockets.initializeEvents();
buildMgr.reload();

server.listen(port);
console.log(`${appName} running! http://localhost:${port}`);
