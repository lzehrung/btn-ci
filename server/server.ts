import * as express from 'express';
const expressAsyncAwait = require('express-async-await');
const app = express();
expressAsyncAwait(app);
import * as http from 'http';
const server = new http.Server(app);
import * as socket from 'socket.io';
const io = socket(server);

import * as fs from 'fs';
import * as path from 'path';

import 'reflect-metadata';
import { Request, Response } from 'express';
import { BuildManager } from './build-manager';
import { BuildStatus } from './models';
import { BuildSockets } from './build-sockets';
import { IServerConfig } from './server-models';

// settings
const appName = 'BetterThanNothing CI';
let serverConfig: IServerConfig = {
  port: 3000,
  maxConcurrentBuilds: 3,
  clientDir: 'client/dist'
};

try {
  let configPath = path.join(process.cwd(), 'serverConfig.json');
  serverConfig = <IServerConfig>JSON.parse(fs.readFileSync(configPath, { encoding: 'utf8' }));
} catch (error) {
  console.log(`error loading configuration file '${JSON.stringify(serverConfig, null, 2)}'; using defaults`);
}

serverConfig.port = serverConfig.port || 3000;
serverConfig.definitionDir = serverConfig.definitionDir || path.join(process.cwd(), 'definitions');
serverConfig.logDir = serverConfig.logDir || path.join(process.cwd(), 'logs');
serverConfig.maxConcurrentBuilds = serverConfig.maxConcurrentBuilds || 3;

const buildMgr = new BuildManager(serverConfig);

// http configuration
app.use(express.static(serverConfig.clientDir));

app.get('/', (req: Request, res: Response) => {
  res.sendFile('index.html');
  return;
});

app.get('/builds', (req: Request, res: Response) => {
  var buildInfoObjects = buildMgr.buildInfo;
  res.json(buildInfoObjects);
  return;
});

app.post('/builds/reload', async (req: Request, res: Response) => {
  if (buildMgr.runningBuilds.length < 1) {
    await buildMgr.reload();
    res.status(200);
  } else {
    res.status(400);
  }
});

app.get('/builds/:buildName', async (req: Request, res: Response) => {
  let buildInfo = await buildMgr.findBuildInfo(req.params.buildName);
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
  let buildInfo = await buildMgr.findBuildInfo(buildName);
  if (!!buildInfo) {
    if (!buildInfo.latest || buildInfo.latest.result != BuildStatus.Running) {
      let latestInfo = await buildMgr.startBuild(buildInfo, true);
      if (!!latestInfo) {
        res.json(latestInfo);
      } else {
        res.sendStatus(200);
      }
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

app.post('/builds/:buildName/cancel', async (req: Request, res: Response) => {
  let buildName = req.params.buildName;
  let buildInfo = await buildMgr.findBuildInfo(buildName);
  if (!!buildInfo) {
    if (!buildInfo.latest || buildInfo.latest.result != BuildStatus.Running) {
      let latestInfo = buildMgr.cancelBuild(buildName);
      if (!!latestInfo) {
        res.json(latestInfo);
      } else {
        res.sendStatus(200);
      }
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

app.post('/pause', (req: Request, res: Response) => {
  buildMgr.pause();
  res.sendStatus(200);
});

app.post('/resume', (req: Request, res: Response) => {
  buildMgr.resume();
  res.sendStatus(200);
});

// startup
const buildSockets = new BuildSockets(io, buildMgr);
buildSockets.initializeEvents();
buildMgr.reload();

server.listen(serverConfig.port);
console.log(`${appName} running! http://localhost:${serverConfig.port}`);
