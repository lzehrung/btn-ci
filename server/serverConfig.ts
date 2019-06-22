import { IServerConfig } from './server-models';

const config: IServerConfig = {
  port: 3000,
  maxConcurrentBuilds: 3,
  clientDir: 'client/dist'
};

export default config;
