import { ChildProcess } from "child_process";

export class BuildProcess {
  constructor(public buildName: string, public process: ChildProcess) {}
}
