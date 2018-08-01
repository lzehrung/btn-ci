const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');
//const { spawn } = require('child_process');
const spawn = require('cross-spawn');
const readline = require('readline');
const { BuildResult, BuildStatus, LogLine, BuildDefinition, BuildStep } = require('./models');

function BuildProcess(buildName, process) {
  var self = this;
  self.buildName = buildName;
  self.process = process;
}

function BuildManager(logDir) {
  var self = this;

  self.configs = [];
  self.scheduledBuilds = [];
  self.buildLogs = [];
  self.buildProcesses = [];

  self.runningBuilds = () => {
    return self.buildLogs.filter((buildResult) => {
      return buildResult.result == BuildStatus.Running;
    });
  };

  self.findBuildDef = (buildName) => {
    var matching = self.configs.filter((def) => {
      return def.name == buildName;
    });
    if (!!matching) {
      return matching[0];
    }
    return null;
  };

  self.mostRecentLog = (buildName) => {
    if (!!self.buildLogs) {
      var buildLog = self.buildLogs
        .sort((logA, logB) => {
          return new Date(logA.lastUpdated) <= new Date(logB.lastUpdated);
        })
        .filter((log) => {
          return log.name == buildName;
        })[0];
      return buildLog;
    }
    return null;
  };

  self.load = (configDir) => {
    self.configs = [];

    var configFiles = fs.readdirSync(configDir).filter((file) => {
      return file.endsWith('.json');
    });
    for (var fileName of configFiles) {
      console.log(`loading build def: ${fileName}`);
      var filePath = path.join(configDir, fileName);
      var configFile = fs.readFileSync(filePath);
      var buildDef = JSON.parse(configFile);

      if (buildDef.name && buildDef.steps && buildDef.directory) {
        self.configs.push(buildDef);
      }
    }
  };

  self.scheduleBuilds = () => {
    for (var buildDef of self.configs) {
      var job = schedule.scheduledJob(buildDef.schedule, () => {
        self.startBuild(buildDef);
      });
      self.scheduledBuilds.push(job);
    }
  };

  self.cancelScheduledBuilds = () => {
    for (var job of self.scheduledBuilds) {
      schedule.cancelJob(job);
    }
    self.scheduledBuilds = [];
  };

  self.cancelBuild = (buildName) => {
    var buildDef = self.findBuildDef(buildName);
    if (!!buildDef) {
      var processes = self.buildProcesses.filter((buildProc) => {
        return (buildProc.buildName = buildName);
      });
      if (!!processes) {
        for (var buildProc of processes) {
          if (!!buildProc.process) {
            try {
              buildProc.process.kill();
            } catch (error) {}
          }
        }
      }
    }
    return self.mostRecentLog(buildName);
  };

  self.startBuild = (buildDef) => {
    var latestRun = self.mostRecentLog(buildDef.name);
    if (!!latestRun && latestRun.result == BuildStatus.Running) {
      return;
    }
    var result = new BuildResult(buildDef.name, buildDef);
    result.log.push(new LogLine(`Starting build ${buildDef.name}...`));
    self.buildLogs.push(result);
    self.executeBuildStep(0, buildDef, result);
    return result;
  };

  self.executeBuildStep = (index, buildDef, buildResult) => {
    var step = buildDef.steps[index];
    var directory = buildDef.directory;
    var stepId = `(step-${index})` + step.command;
    var stepDescription = `${step.command} ${!!step.args ? step.args.join(' ') : ''}`;

    buildResult.lastUpdated = new Date().toJSON();
    buildResult.log.push(new LogLine(`Running step ${index} (${stepDescription})...`, stepId));
    try {
      var proc = spawn(step.command, step.args, {
        cwd: directory,
        env: process.env,
        shell: true
      });
      // add to our build process list for cancellation later
      self.buildProcesses.push(new BuildProcess(buildDef.name, proc));
    } catch (error) {
      // exception trying to run the command, fail build
      buildResult.result = BuildStatus.Failed;
      buildResult.lastUpdated = new Date().toJSON();
      buildResult.log.push(new LogLine('--------------'));
      buildResult.log.push(
        new LogLine(
          `Step ${index} command failed 😭 (${stepDescription}): ${error != null ? JSON.stringify(error) : ''}`
        )
      );
    }

    proc.on('close', (exitCode) => {
      if (buildResult.result != BuildStatus.Cancelled) {
        if (exitCode !== 0) {
          // command exited with non-success code, fail build
          buildResult.result = BuildStatus.Failed;
          buildResult.lastUpdated = new Date().toJSON();
          buildResult.log.push(new LogLine('--------------'));
          buildResult.log.push(new LogLine(`Step ${index} command failed 😭 (${stepDescription})`));
        } else {
          // if this step's fail text is found, fail build
          var failedStepLogs = buildResult.log.filter((item) => {
            return item.command == stepId && item.message.indexOf(step.failText) !== -1;
          });
          if (!!failedStepLogs && failedStepLogs.length > 0) {
            buildResult.result = BuildStatus.Failed;
            buildResult.lastUpdated = new Date().toJSON();
            buildResult.log.push(new LogLine('--------------'));
            buildResult.log.push(
              new LogLine(`Failure text condition was met on step ${index} 😭 (${stepDescription})`)
            );
          }
          // if there's another step, run it
          else if (index + 1 < buildDef.steps.length) {
            self.executeBuildStep(index + 1, buildDef, buildResult);
          } else {
            // we succeeded!
            buildResult.result = BuildStatus.Success;
            buildResult.lastUpdated = new Date().toJSON();
            buildResult.log.push(new LogLine('--------------'));
            buildResult.log.push(new LogLine(`Build completed successfully! 😀👍`));
          }
        }
      }
    });

    readline
      .createInterface({
        input: proc.stdout,
        terminal: false
      })
      .on('line', (line) => {
        buildResult.lastUpdated = new Date().toJSON();
        buildResult.log.push(new LogLine(line));
      });
  };

  self.writeLogFile = (buildDef, buildResult) => {};
}

module.exports = BuildManager;
