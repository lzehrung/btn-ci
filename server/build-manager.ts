import { promisify } from 'util';
import * as fs from 'fs';
const readDir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const pathExists = promisify(fs.exists);
const mkDir = promisify(fs.mkdir);
import * as path from 'path';
import * as readline from 'readline';
import * as sgMail from '@sendgrid/mail';
import * as schedule from 'node-schedule';
import * as spawn from 'cross-spawn';
import { EventEmitter } from 'events';
import {
  BuildResult,
  BuildStatus,
  LogMessage,
  BuildDefinition,
  BuildDefFile,
  IBuildInfo,
  BuildManagerEvents,
  IScheduledBuild
} from './models';
import { checkGitForChanges } from './check-for-git-changes';
import { BuildProcess, IServerBuildInfo, IBuildResultFile } from './server-models';
import { Queue } from './queue';
import { MailData } from '@sendgrid/helpers/classes/mail';

const sendGridApiKeyFilename = 'sendgrid-key.json';

export class BuildManager {
  public sendGridKey: string = '';
  public buildInfo: IServerBuildInfo[] = [];
  public buildDefinitionFiles: BuildDefFile[] = [];
  public scheduledBuilds: IScheduledBuild[] = [];
  public buildProcesses: BuildProcess[] = [];
  public readonly emitter = new EventEmitter();

  constructor(public configDir: string, public logDir: string, public maxConcurrentBuilds: number = 3) {}

  get buildDefinitions(): BuildDefinition[] {
    return this.buildInfo.map(info => {
      return info.definition;
    });
  }

  get latestResults(): BuildResult[] {
    return this.buildInfo
      .filter(info => {
        return !!info.latest;
      })
      .map(info => {
        return <BuildResult>info.latest;
      });
  }

  private buildQueue = new Queue<IBuildInfo>();
  get queuedBuilds(): IBuildInfo[] {
    return this.buildQueue.toArray();
  }

  /** Only the names of queued builds. */
  get queuedBuildNames(): string[] {
    return this.queuedBuilds.map(queuedInfo => {
      return queuedInfo.definition.name;
    });
  }

  private isReloadScheduled = false;
  private _isReloading: boolean = false;
  get isReloading(): boolean {
    return this._isReloading;
  }

  private _isPaused = false;
  get isPaused(): boolean {
    return this._isPaused;
  }

  get runningBuilds(): BuildResult[] {
    return this.latestResults.filter(result => {
      return result.result == BuildStatus.Running;
    });
  }

  /** Find a build's config file by name. */
  findBuildDefFile(buildName: string): BuildDefFile | null {
    let matching = this.buildDefinitionFiles.filter(file => {
      return file.buildName == buildName;
    });
    if (!!matching && matching.length > 0) {
      return matching[0];
    }
    return null;
  }

  /** Find a build's info (definition and latest run) by build name. */
  async findBuildInfo(buildName: string): Promise<IBuildInfo | null> {
    let buildInfo = this.buildInfo.find(info => {
      return info.definition.name == buildName;
    });
    if (!!buildInfo) {
      return buildInfo;
    }
    return null;
  }

  /** Tries to load the build's most recent log file. */
  async getMostRecentLogFile(buildName: string): Promise<BuildResult | null> {
    let buildResult = null;
    try {
      let filesOrderedByDate = await this.getAllLogFilesFor(buildName);
      if (!!filesOrderedByDate && filesOrderedByDate.length > 0) {
        let filePath = path.join(this.logDir, filesOrderedByDate[0].filename);
        let fileContent = await readFile(filePath, 'utf8');
        buildResult = <BuildResult>JSON.parse(fileContent);
      }
    } catch (error) {
      console.log('error searching for most recent build result file', error);
    }
    return buildResult;
  }

  /** Gets all result files for the given build name ordered most recent to oldest. */
  async getAllLogFilesFor(buildName: string): Promise<IBuildResultFile[]> {
    let logFiles = await readDir(this.logDir);
    let buildLogFiles = logFiles.filter((filename: string) => {
      let filenameParts = filename.split('_');
      return filenameParts.length === 3 && filenameParts[0] == buildName;
    });
    let filesWithDate = buildLogFiles.map((file: string) => {
      let fileDate = null;
      let filenameParts = file.split('_');
      let dateParts = (<string>filenameParts[1]).split('-');
      let timeParts = (<string>filenameParts[2]).split('-');
      if (dateParts.length === 3 && timeParts.length === 3) {
        fileDate = new Date(
          parseInt(dateParts[0]),
          parseInt(dateParts[1]),
          parseInt(dateParts[2]),
          parseInt(timeParts[0]),
          parseInt(timeParts[1]),
          parseInt(timeParts[2])
        );
      }
      return {
        filename: file,
        date: fileDate
      };
    });
    let filesOrderedByDate = filesWithDate
      .filter(fileWithDate => {
        return !!fileWithDate.date;
      })
      .sort((fileA, fileB) => {
        return (<Date>fileB.date).getTime() - (<Date>fileA.date).getTime();
      });
    return filesOrderedByDate;
  }

  /** Cancels any currently scheduled builds, loads all build definitions, loads the SendGrid API key, and schedules builds.
   *
   * Resumes the next queued build is there is one.
   */
  async reload(): Promise<void> {
    if (this.runningBuilds.length > 0) {
      this.isReloadScheduled = true;
      return;
    }

    this.emitter.emit(BuildManagerEvents.StartReload);
    this._isReloading = true;
    this.cancelScheduledBuilds();
    this.buildDefinitionFiles = [];

    let sendGridKeyPath = path.join(process.cwd(), sendGridApiKeyFilename);
    try {
      let file = await readFile(sendGridKeyPath, 'utf8');
      this.sendGridKey = JSON.parse(file).key;
    } catch (err) {
      console.log(`no sendgrid api key found (${sendGridKeyPath}), unable to send emails.`);
    }

    await this.ensureDirectoryExistence(this.logDir);
    await this.ensureDirectoryExistence(this.configDir);
    let directoryFiles = await readDir(this.configDir);
    let buildDefinitionFiles = directoryFiles.filter((file: string) => {
      let extension = '.json';
      let extIndex = file.lastIndexOf(extension);
      return extIndex !== -1 && extIndex + extension.length == file.length;
    });
    for (let fileName of buildDefinitionFiles) {
      let buildDef = await this.loadBuildDefFromFile(fileName);
    }
    // remove builds no longer associated with files
    let toRemove = [];
    for (let file of this.buildDefinitionFiles) {
      if (buildDefinitionFiles.indexOf(file.fileName) === -1) {
        toRemove.push(file);
      }
    }
    for (let remove of toRemove) {
      let infoIndex = this.buildInfo.findIndex((info: IBuildInfo) => {
        return info.definition.name === remove.buildName;
      });
      if (infoIndex > -1) {
        this.buildInfo.splice(infoIndex, 1);
      }
    }

    if (this.buildInfo.length > 0) {
      console.log('scheduling builds');
      this.scheduleBuilds();
    } else {
      console.log('no build definitions found');
    }

    this.isReloadScheduled = false;
    this._isReloading = false;
    this.emitter.emit(BuildManagerEvents.EndReload, this.buildInfo);

    this.startNextQueuedBuild();
  }

  /**
   * Loads the given file from the definitions directory and adds it to the list of build definitions.
   *
   * Also searches for the latest log file to provide the most recent run information for the build.
   */
  async loadBuildDefFromFile(fileName: string): Promise<BuildDefinition | null> {
    let filePath = path.join(this.configDir, fileName);
    let buildDefFile = null;
    try {
      buildDefFile = await readFile(filePath, 'utf8');
    } catch (error) {
      console.log(`error loading ${filePath}`, error);
    }
    let buildDef = null;
    if (buildDefFile) {
      buildDef = <BuildDefinition>JSON.parse(buildDefFile);
    }
    if (!!buildDef && buildDef.name && buildDef.steps && buildDef.directory) {
      let existingInfo = await this.findBuildInfo(buildDef.name);
      if (!!existingInfo) {
        // update the existing build definition
        existingInfo.definition = buildDef;
      } else {
        // add the new build definition
        let latestLogFileResult = await this.getMostRecentLogFile(buildDef.name);
        this.buildInfo.push({
          definition: buildDef,
          latest: latestLogFileResult
        });
        this.buildDefinitionFiles.push({
          fileName: fileName,
          buildName: buildDef.name
        });
      }
    }
    return buildDef;
  }

  /** Initializes a node-schedule for builds that have CRON schedules. */
  async scheduleBuilds(): Promise<void> {
    let scheduledBuilds = this.buildInfo.filter((build: IBuildInfo) => {
      return !!build.definition.schedule;
    });

    for (let buildInfo of scheduledBuilds) {
      let job = schedule.scheduleJob(buildInfo.definition.schedule, async () => {
        await this.startBuild(buildInfo);
      });
      this.scheduledBuilds.push({
        buildName: buildInfo.definition.name,
        job: job
      });
    }
  }

  /** Cancels all recurring/scheduled builds. */
  cancelScheduledBuilds(): void {
    for (let scheduledBuild of this.scheduledBuilds) {
      let job = <schedule.Job>scheduledBuild.job;
      schedule.cancelJob(job);
    }
    this.scheduledBuilds = [];
  }

  /** Cancels an actively running build. */
  async cancelBuild(buildName: string): Promise<IBuildInfo | null> {
    let buildInfo = await this.findBuildInfo(buildName);
    if (!!buildInfo && !!buildInfo.latest) {
      buildInfo.latest.result = BuildStatus.Cancelled;

      // kill all processes with this build name
      let processes = this.buildProcesses.filter(buildProc => {
        return (buildProc.buildName = buildName);
      });
      if (!!processes) {
        for (let buildProc of processes) {
          if (!!buildProc.process) {
            try {
              buildProc.process.kill();
            } catch (error) {}
          }
        }
      }
    }
    return buildInfo;
  }

  /** Starts a build with the given definition. Will not start if the definition already has a running build.
   *
   * If the concurrent build limit has been reached or the server is reloading definitions, the build will be queued instead.
   *
   * @param buildInfo the build definition to use
   * @param force indicates that this build should start now even if it has a schedule
   */
  async startBuild(buildInfo: IBuildInfo, force: boolean | null = null): Promise<IBuildInfo | null> {
    if (this.isPaused) {
      return null;
    }

    let isReloading = this.isReloadScheduled || this.isReloading;
    if (isReloading || this.runningBuilds.length >= this.maxConcurrentBuilds) {
      // queue this build instead
      this.enqueueBuild(buildInfo);
      return null;
    }

    let buildName = buildInfo.definition.name;

    //let latestRun = await this.getMostRecentResult(buildName);
    if (!!buildInfo.latest && buildInfo.latest.result == BuildStatus.Running) {
      return buildInfo;
    }

    // reload build def from file in case steps have changed
    let buildDefFile = this.findBuildDefFile(buildName);
    if (!!buildDefFile) {
      let reloadedBuildDef = await this.loadBuildDefFromFile(buildDefFile.fileName);
      if (!!reloadedBuildDef) {
        buildInfo.definition = reloadedBuildDef;
      }
    }

    // if the build def specifies that it should only run when there are changes, check (git) if repo is behind changes
    let hasUnbuiltChanges = true; // default to true before we check the build def (startBuild was called for a reason, after all)
    if ((force == null || force === false) && buildInfo.definition.onlyRunForChanges) {
      hasUnbuiltChanges = checkGitForChanges(buildInfo.definition);
    }

    // run if forcing a build (ie from 'start' button on client) or if behind
    let shouldRun = !!force || hasUnbuiltChanges;
    let buildResult = null;
    if (shouldRun) {
      // start build
      console.log(`starting '${buildName}'...`);
      buildResult = new BuildResult(buildName, buildInfo.definition);
      buildResult.log.push(new LogMessage(`Starting build '${buildName}'...`));

      buildInfo.latest = buildResult;

      this.emitter.emit(BuildManagerEvents.StartBuild, buildResult);
      await this.executeBuildStep(0, buildInfo.definition, buildResult);
    }
    return buildInfo;
  }

  /** Add this build to the queue if it isn't already queued. */
  private enqueueBuild(buildInfo: IBuildInfo) {
    let isAlreadyQueued = this.buildQueue.isQueued(queuedBuild => {
      return queuedBuild.definition.name == buildInfo.definition.name;
    });
    if (!isAlreadyQueued) {
      this.buildQueue.add(buildInfo);
      this.emitter.emit(BuildManagerEvents.QueueUpdate, this.queuedBuildNames);
    }
  }

  /** Start the next build in the queue if there is one. */
  private startNextQueuedBuild() {
    let build = this.buildQueue.peek();
    if (!!build) {
      let startedBuild = this.startBuild(build, true);
      if (!!startedBuild) {
        this.buildQueue.removeItem(build);
        this.emitter.emit(BuildManagerEvents.QueueUpdate, this.queuedBuildNames);
      }
    }
  }

  async executeBuildStep(index: number, buildDef: BuildDefinition, buildResult: BuildResult): Promise<void> {
    let step = buildDef.steps[index];
    let directory = buildDef.directory;
    let stepId = `(step-${index})` + step.command;
    let stepDescription = `${step.command} ${!!step.args ? step.args.join(' ') : ''}`;

    buildResult.lastUpdated = new Date().toJSON();
    buildResult.log.push(new LogMessage(`Running step ${index} (${stepDescription})...`, stepId));
    this.emitter.emit(BuildManagerEvents.BuildStep, buildResult);
    try {
      let proc = spawn(step.command, step.args, {
        cwd: directory,
        env: process.env,
        shell: true
      });
      // add to build process list for cancellation
      let buildProc = new BuildProcess(buildDef.name, proc);
      this.buildProcesses.push(buildProc);

      proc.on('error', (error: any) => {
        if (buildResult.result != BuildStatus.Cancelled) {
          // fail build on error
          buildResult.result = BuildStatus.Failed;
          buildResult.lastUpdated = new Date().toJSON();
          buildResult.log.push(
            new LogMessage(`Step ${index} command error  🚨 (${stepDescription}): ${JSON.stringify(error, null, 2)}`)
          );
        }
      });

      proc.on('close', async (exitCode: number) => {
        this.removeBuildProcess(buildProc);

        if (buildResult.result != BuildStatus.Cancelled) {
          if (exitCode !== 0) {
            // command exited with non-success code, fail build
            buildResult.result = BuildStatus.Failed;
            this.writeFinalLog(buildResult, `Step ${index} command failed 😭 (${stepDescription})`);
          } else {
            let failedStepLogs = null;
            if (step.failText) {
              let failReg = new RegExp(step.failText, 'gm');
              failedStepLogs = buildResult.log.filter((item: LogMessage) => {
                let matches = failReg.exec(item.message);
                return !!matches && matches.length >= 2 && !!matches[1];
              });
            }
            let unstableStepLogs = null;
            if (step.unstableText) {
              let unstableReg = new RegExp(step.unstableText, 'gm');
              unstableStepLogs = buildResult.log.filter((item: LogMessage) => {
                let matches = unstableReg.exec(item.message);
                return !!matches && matches.length >= 2 && !!matches[1];
              });
            }

            // if this step's fail text is found, fail build
            if (!!failedStepLogs && failedStepLogs.length > 0) {
              buildResult.result = BuildStatus.Failed;
              this.writeFinalLog(
                buildResult,
                `Failure text condition was met on step ${index} 😭 (${stepDescription})`
              );
            }
            // if this step's unstable text is found, mark build unstable
            else if (!!unstableStepLogs && unstableStepLogs.length > 0) {
              buildResult.result = BuildStatus.Unstable;
              this.writeFinalLog(
                buildResult,
                `Unstable text condition was met on step ${index} 🤔 (${stepDescription})`
              );
            }
            // if there's another step, run it
            else if (index + 1 < buildDef.steps.length) {
              this.emitter.emit(BuildManagerEvents.BuildStep, buildResult);
              this.executeBuildStep(index + 1, buildDef, buildResult);
            } else {
              // we succeeded!
              buildResult.result = BuildStatus.Success;
              this.writeFinalLog(buildResult, `Build completed successfully! 😀👍`);
            }
          }
        }

        if (buildResult.result != BuildStatus.Running) {
          if (buildResult.result == BuildStatus.Cancelled) {
            this.writeFinalLog(buildResult, `Build was cancelled 🤨`);
          }
          this.finalizeBuild(buildDef, buildResult);
        }
      });

      readline
        .createInterface({
          input: proc.stdout,
          terminal: false
        })
        .on('line', (line: string) => {
          buildResult.lastUpdated = new Date().toJSON();
          buildResult.log.push(new LogMessage(line));
          this.emitter.emit(BuildManagerEvents.BuildStep, buildResult);
        });
    } catch (error) {
      if (buildResult.result != BuildStatus.Cancelled) {
        // exception somewhere, fail build
        buildResult.result = BuildStatus.Failed;
        this.writeFinalLog(
          buildResult,
          `Step ${index} command failed 😭 (${stepDescription}): ${error != null ? JSON.stringify(error, null, 2) : ''}`
        );
        this.finalizeBuild(buildDef, buildResult);
      }
    }
  }

  /** Writes the final log line with a preceeding separator line. */
  private writeFinalLog(buildResult: BuildResult, message: string): void {
    buildResult.lastUpdated = new Date().toJSON();
    buildResult.log.push(new LogMessage('--------------'));
    buildResult.log.push(new LogMessage(message));
  }

  private removeBuildProcess(buildProc: BuildProcess): void {
    let procIndex = this.buildProcesses.indexOf(buildProc);
    if (procIndex > -1) {
      this.buildProcesses.splice(procIndex, 1);
    }
  }

  /** End of the build.
   *
   * Writes the build result to a log file, emits the EndBuild event, sends email for failures, and (finally) follows up on scheduled reloads or starts the next queued build (if there is one).
   */
  private async finalizeBuild(buildDef: BuildDefinition, buildResult: BuildResult): Promise<void> {
    await this.writeLogFile(buildDef, buildResult);
    this.emitter.emit(BuildManagerEvents.EndBuild, buildResult);

    if (buildResult.result == BuildStatus.Failed || buildResult.result == BuildStatus.Unstable) {
      this.sendEmail(
        buildDef,
        buildResult,
        `${buildDef.name} Build Failed 😭`,
        `<h3>Result: ${buildResult.result}</h3>
        <h4>See the attachment for a full build log.</h4>`
      );
    }
    if (this.isReloadScheduled) {
      await this.reload();
    } else {
      this.startNextQueuedBuild();
    }
  }

  async writeLogFile(buildDef: BuildDefinition, buildResult: BuildResult): Promise<void> {
    try {
      let logFileName = this.createLogFileName(buildDef, buildResult);
      let contents = JSON.stringify(buildResult, null, 2);
      let logFilePath = path.join(this.logDir, logFileName);

      try {
        await writeFile(logFilePath, contents, { encoding: 'utf8' });
      } catch (error) {
        console.log('error saving log file', error);
      }
    } catch (err) {
      console.log('failed to write log file', err);
    }
  }

  private createLogFileName(buildDef: BuildDefinition, buildResult: BuildResult): string {
    let last = new Date(buildResult.lastUpdated);
    let logFileName = `${buildDef.name}_${last.getUTCFullYear()}-${last.getUTCMonth() +
      1}-${last.getUTCDate()}_${last.getUTCHours()}-${last.getUTCMinutes()}-${last.getUTCSeconds()}.json`;
    return logFileName;
  }

  private async ensureFilepathExistence(filepath: string): Promise<void> {
    let directory = path.dirname(filepath);
    await this.ensureDirectoryExistence(directory);
  }

  private async ensureDirectoryExistence(directory: string): Promise<void> {
    if (await pathExists(directory)) {
      return;
    }
    await mkDir(directory);
  }

  sendEmail(buildDef: BuildDefinition, buildResult: BuildResult, subject: string, htmlMessage: string): void {
    if (!!this.sendGridKey && !!buildDef.emailTo) {
      console.log('sending email...');

      let attachmentContent = Buffer.from(JSON.stringify(buildResult, null, 2)).toString('base64');
      let attachmentName = this.createLogFileName(buildDef, buildResult);
      try {
        sgMail.setApiKey(this.sendGridKey);
        const msg: MailData = {
          to: buildDef.emailTo,
          from: !!buildDef.emailFrom ? buildDef.emailFrom : 'btn-ci@internetland.org',
          subject: subject,
          html: htmlMessage,
          attachments: [
            {
              content: attachmentContent,
              filename: attachmentName,
              type: 'plain/text',
              disposition: 'attachment'
            }
          ]
        };
        sgMail.send(msg);
      } catch (err) {
        console.log('failed to send email', err);
      }
    }
  }

  /** Prevents the starting of any new builds. */
  pause(): void {
    if (!this.isPaused) {
      this._isPaused = true;
      this.emitter.emit(BuildManagerEvents.BuildsPaused);
    }
  }

  /** Resumes the ability to start builds. */
  resume(): void {
    if (this.isPaused) {
      this._isPaused = false;
      this.emitter.emit(BuildManagerEvents.BuildsResumed);
    }
  }
}
