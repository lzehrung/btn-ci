import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import * as sgMail from '@sendgrid/mail';
import * as schedule from 'node-schedule';
import * as spawn from 'cross-spawn';
import { EventEmitter } from 'events';
import { ChildProcess } from 'child_process';
import { BuildResult, BuildStatus, LogMessage, BuildDefinition, BuildStep, BuildDefFile, IBuildInfo, BuildManagerEvents } from './models';
import { checkGitForChanges } from './checkForGitChanges';
import { BuildProcess } from './server-models';

const sendGridApiKeyFilename = 'sendgrid-key.json';

export class BuildManager {
  public sendGridKey: string = '';
  public buildDefinitions: BuildDefinition[] = [];
  public buildDefinitionFiles: BuildDefFile[] = [];
  public scheduledBuilds: schedule.Job[] = [];
  public buildLogs: BuildResult[] = [];
  public buildProcesses: BuildProcess[] = [];
  public readonly emitter = new EventEmitter();

  constructor(public configDir: string, public logDir: string) {}

  private _isReloading: boolean = false;
  get isReloading(): boolean {
    return this._isReloading;
  }

  get runningBuilds(): BuildResult[] {
    return this.buildLogs.filter(buildResult => {
      return buildResult.result == BuildStatus.Running;
    });
  }

  /** Find a build's definition by name. */
  findBuildDef(buildName: string): BuildDefinition | null {
    let matching = this.buildDefinitions.filter(def => {
      return def.name == buildName;
    });
    if (!!matching) {
      return matching[0];
    }
    return null;
  }

  /** Find a build's config file by name. */
  findBuildDefFile(buildName: string): BuildDefFile | null {
    let matching = this.buildDefinitionFiles.filter(file => {
      return file.buildName == buildName;
    });
    if (!!matching) {
      return matching[0];
    }
    return null;
  }

  /** Find a build's most recent result. */
  mostRecentLog(buildName: string): BuildResult | null {
    let mostRecentLog = null;
    if (!!this.buildLogs) {
      let filteredLogs = this.buildLogs
        .filter(log => {
          return log.name == buildName;
        })
        .sort((logA, logB) => {
          let dateA = new Date(logA.lastUpdated);
          let dateB = new Date(logB.lastUpdated);
          return dateB.getTime() - dateA.getTime();
        });
      if (!!filteredLogs) {
        mostRecentLog = filteredLogs[0];
      }
    }
    return mostRecentLog;
  }

  /** Cancels any currently scheduled builds, loads the SendGrid API key file, all build definitions, and schedules builds. */
  reload(): void {
    this.emitter.emit(BuildManagerEvents.StartReload);
    this._isReloading = true;
    this.cancelScheduledBuilds();
    this.buildDefinitionFiles = [];
    this.buildDefinitions = [];

    try {
      this.sendGridKey = JSON.parse(fs.readFileSync(sendGridApiKeyFilename, 'utf8')).key;
    } catch (err) {
      console.log('no sendgrid api key found, unable to send emails.');
    }

    this.ensureDirectoryExistence(this.logDir);
    this.ensureDirectoryExistence(this.configDir);
    let configFiles = fs.readdirSync(this.configDir).filter((file: string) => {
      let extension = '.json';
      let extIndex = file.lastIndexOf(extension);
      return extIndex !== -1 && extIndex + extension.length == file.length;
    });
    for (let fileName of configFiles) {
      let buildDef = this.loadBuildDefFile(fileName);
    }
    // remove builds no longer associated with files
    let toRemove = [];
    for (let file of this.buildDefinitionFiles) {
      if (configFiles.indexOf(file.fileName) === -1) {
        toRemove.push(file);
      }
    }
    for (let remove of toRemove) {
      let defIndex = this.buildDefinitions.findIndex((def: BuildDefinition) => {
        return def.name === remove.buildName;
      });
      if (defIndex > -1) {
        this.buildDefinitions.splice(defIndex, 1);
      }

      let buildLogs = this.buildLogs.filter((log: BuildResult) => {
        return log.buildDef.name === remove.buildName;
      });
      for (let log of buildLogs) {
        let logIndex = this.buildLogs.indexOf(log);
        this.buildLogs.splice(logIndex, 1);
      }
    }

    if (this.buildDefinitions.length) {
      console.log('scheduling builds');
      this.scheduleBuilds();
    } else {
      console.log('no build definitions found');
    }
    this._isReloading = false;
    this.emitter.emit(BuildManagerEvents.EndReload, this.buildDefinitions);
  }

  loadBuildDefFile(fileName: string): BuildDefinition {
    let filePath = path.join(this.configDir, fileName);
    console.log(`loading build def: ${filePath}`);
    let configFile = fs.readFileSync(filePath, 'utf8');
    let buildDef = <BuildDefinition>JSON.parse(configFile);

    if (buildDef.name && buildDef.steps && buildDef.directory) {
      let existingDef = this.findBuildDef(buildDef.name);
      if (!!existingDef) {
        existingDef = buildDef;
      } else {
        this.buildDefinitions.push(buildDef);
        this.buildDefinitionFiles.push({
          fileName: fileName,
          buildName: buildDef.name
        });
      }
    }
    return buildDef;
  }

  /** Initializes a node-schedule for builds that have CRON schedules. */
  scheduleBuilds(): void {
    for (let buildDef of this.buildDefinitions) {
      if (buildDef.schedule) {
        let job = schedule.scheduleJob(buildDef.schedule, () => {
          let latest = this.mostRecentLog(buildDef.name);
          if (!latest || (!!latest && latest.result != BuildStatus.Running)) {
            this.startBuild(buildDef);
          }
        });
        this.scheduledBuilds.push(job);
      }
    }
  }

  cancelScheduledBuilds(): void {
    for (let job of this.scheduledBuilds) {
      schedule.cancelJob(job);
    }
    this.scheduledBuilds = [];
  }

  /** Cancels an actively running build. */
  cancelBuild(buildName: string): BuildResult | null {
    let buildDef = this.findBuildDef(buildName);
    let buildResult = this.mostRecentLog(buildName);
    if (!!buildDef && !!buildResult) {
      buildResult.result = BuildStatus.Cancelled;

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
    return buildResult;
  }

  /** Starts a build with the given definition. Will not start if the build definition already has a running build.
   * @param buildDef the build definition to use
   * @param force indicates that this build should start now even if it has a schedule
   */
  startBuild(buildDef: BuildDefinition, force: boolean | null = null): BuildResult | null {
    let latestRun = this.mostRecentLog(buildDef.name);
    if (!!latestRun && latestRun.result == BuildStatus.Running) {
      return latestRun;
    }
    // reload build def from file in case steps have changed
    let buildDefFile = this.findBuildDefFile(buildDef.name);
    if (!!buildDefFile) {
      buildDef = this.loadBuildDefFile(buildDefFile.fileName);
    }

    // if the build def specifies that it should only run when there are changes, check (git) if repo is behind changes
    let isBehind = true; // default to true before we check the build def (startBuild was called for a reason, after all)
    if ((force == null || force === false) && !!buildDef.onlyRunForChanges) {
      isBehind = checkGitForChanges(buildDef);
    }

    // run if forcing a build (ie from 'start' button on client) or if behind
    let shouldRun = !!force || isBehind;
    let buildResult = null;
    if (shouldRun) {
      // start build
      console.log(`starting build: ${buildDef.name}`);
      buildResult = new BuildResult(buildDef.name, buildDef);
      buildResult.log.push(new LogMessage(`Starting build ${buildDef.name}...`));
      this.buildLogs.push(buildResult);
      this.emitter.emit(BuildManagerEvents.StartBuild, buildResult);
      this.executeBuildStep(0, buildDef, buildResult);
    }
    return buildResult;
  }

  executeBuildStep(index: number, buildDef: BuildDefinition, buildResult: BuildResult): void {
    let step = buildDef.steps[index];
    let directory = buildDef.directory;
    let stepId = `(step-${index})` + step.command;
    let stepDescription = `${step.command} ${!!step.args ? step.args.join(' ') : ''}`;

    buildResult.lastUpdated = new Date().toJSON();
    buildResult.log.push(new LogMessage(`Running step ${index} (${stepDescription})...`, stepId));
    this.emitter.emit(BuildManagerEvents.StartBuildStep, buildResult);
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

      proc.on('close', (exitCode: number) => {
        this.removeBuildProcess(buildProc);

        if (buildResult.result != BuildStatus.Cancelled) {
          if (exitCode !== 0) {
            // command exited with non-success code, fail build
            buildResult.result = BuildStatus.Failed;
            buildResult.lastUpdated = new Date().toJSON();
            buildResult.log.push(new LogMessage('--------------'));
            buildResult.log.push(new LogMessage(`Step ${index} command failed 😭 (${stepDescription})`));
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
              buildResult.lastUpdated = new Date().toJSON();
              buildResult.log.push(new LogMessage('--------------'));
              buildResult.log.push(
                new LogMessage(`Failure text condition was met on step ${index} 😭 (${stepDescription})`)
              );
            }
            // if this step's unstable text is found, mark build unstable
            else if (!!unstableStepLogs && unstableStepLogs.length > 0) {
              buildResult.result = BuildStatus.Unstable;
              buildResult.lastUpdated = new Date().toJSON();
              buildResult.log.push(new LogMessage('--------------'));
              buildResult.log.push(
                new LogMessage(`Unstable text condition was met on step ${index} 🤔 (${stepDescription})`)
              );
            }
            // if there's another step, run it
            else if (index + 1 < buildDef.steps.length) {
              this.emitter.emit(BuildManagerEvents.EndBuildStep, buildResult);
              this.executeBuildStep(index + 1, buildDef, buildResult);
            } else {
              // we succeeded!
              buildResult.result = BuildStatus.Success;
              buildResult.lastUpdated = new Date().toJSON();
              buildResult.log.push(new LogMessage('--------------'));
              buildResult.log.push(new LogMessage(`Build completed successfully! 😀👍`));
            }
          }

          if (buildResult.result == BuildStatus.Failed || buildResult.result == BuildStatus.Unstable) {
            this.sendEmail(
              buildDef,
              `${buildDef.name} Build Failed 😭`,
              `<h2>Build Log</h2><pre>${JSON.stringify(buildResult, null, 2)}</pre>`
            );
          }          
        }

        if (buildResult.result != BuildStatus.Running) {
          if (buildResult.result == BuildStatus.Cancelled) {
            buildResult.lastUpdated = new Date().toJSON();
            buildResult.log.push(new LogMessage('--------------'));
            buildResult.log.push(new LogMessage(`Build was cancelled 🤨`));
          }

          this.writeLogFile(buildDef, buildResult);          
          this.emitter.emit(BuildManagerEvents.EndBuild, buildResult);
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
          this.emitter.emit(BuildManagerEvents.UpdateBuildStep, buildResult);
        });
    } catch (error) {
      if (buildResult.result != BuildStatus.Cancelled) {
        // exception somewhere, fail build
        buildResult.result = BuildStatus.Failed;
        buildResult.lastUpdated = new Date().toJSON();
        buildResult.log.push(new LogMessage('--------------'));
        buildResult.log.push(
          new LogMessage(
            `Step ${index} command failed 😭 (${stepDescription}): ${
              error != null ? JSON.stringify(error, null, 2) : ''
            }`
          )
        );
        this.writeLogFile(buildDef, buildResult);
        this.emitter.emit(BuildManagerEvents.EndBuild, buildResult);
      }
    }
  }

  private removeBuildProcess(buildProc: BuildProcess): void {
    let procIndex = this.buildProcesses.indexOf(buildProc);
    if (procIndex > -1) {
      this.buildProcesses.splice(procIndex, 1);
    }
  }

  writeLogFile(buildDef: BuildDefinition, buildResult: BuildResult): void {
    try {
      let last = new Date(buildResult.lastUpdated);
      let logFileName = `${buildDef.name}_${last.getUTCFullYear()}-${last.getUTCMonth() +
        1}-${last.getUTCDate()}_${last.getUTCHours()}-${last.getUTCMinutes()}-${last.getUTCSeconds()}.json`;
      let contents = JSON.stringify(buildResult, null, 2);
      let logFilePath = path.join(this.logDir, logFileName);

      fs.writeFile(logFilePath, contents, { encoding: 'utf8' }, (err: any) => {
        if (err) {
          console.log('error saving log file', err);
        }
      });
    } catch (err) {
      console.log('failed to write log file', err);
    }
  }

  private ensureFileDirectoryExistence(filePath: string): void {
    let directory = path.dirname(filePath);
    this.ensureDirectoryExistence(directory);
  }

  private ensureDirectoryExistence(directory: string): void {
    if (fs.existsSync(directory)) {
      return;
    }
    fs.mkdirSync(directory);
  }

  sendEmail(buildDef: BuildDefinition, subject: string, htmlMessage: string): void {
    if (!!this.sendGridKey && !!buildDef.emailTo) {
      console.log('sending email...');
      try {
        sgMail.setApiKey(this.sendGridKey);
        const msg = {
          to: buildDef.emailTo,
          from: !!buildDef.emailFrom ? buildDef.emailFrom : 'btn-ci@internetland.org',
          subject: subject,
          html: htmlMessage
        };
        sgMail.send(msg);
      } catch (err) {
        console.log('failed to send email', err);
      }
    }
  }

  getBuildInfo(): IBuildInfo[] {
    let buildInfoObjects = this.buildDefinitions.map(
      (buildDef: BuildDefinition): IBuildInfo => {
        return {
          buildDef: buildDef,
          latestRun: null || this.mostRecentLog(buildDef.name),
          watching: undefined
        };
      }
    );
    return buildInfoObjects;
  }
}
