import { IBuildInfo, BuildResult } from './models';
import { ChildProcess } from "child_process";

export class BuildProcess {
  constructor(public buildName: string, public process: ChildProcess) {}
}

export interface IBuildNamespace {
  namespaceName: string;
  buildName: string;
  namespace: SocketIO.Namespace;
}

export interface IBuildResultFile {
  filename: string;
  date: Date | null;
}

export interface IServerBuildInfo extends IBuildInfo {
  resultFiles?: IBuildResultFile[];
}