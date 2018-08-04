"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const sgMail = require("@sendgrid/mail");
const schedule = require("node-schedule");
const spawn = require("cross-spawn");
const models_1 = require("./models");
const checkForGitChanges_1 = require("./checkForGitChanges");
const sendGridApiKeyFilename = 'sendgrid-key.json';
class BuildManager {
    constructor(configDir, logDir) {
        this.configDir = configDir;
        this.logDir = logDir;
        this.sendGridKey = '';
        this.configs = [];
        this.configFiles = [];
        this.scheduledBuilds = [];
        this.buildLogs = [];
        this.buildProcesses = [];
    }
    get runningBuilds() {
        return this.buildLogs.filter(buildResult => {
            return buildResult.result == models_1.BuildStatus.Running;
        });
    }
    /** Find a build's definition by name. */
    findBuildDef(buildName) {
        var matching = this.configs.filter(def => {
            return def.name == buildName;
        });
        if (!!matching) {
            return matching[0];
        }
        return null;
    }
    /** Find a build's config file by name. */
    findBuildDefFile(buildName) {
        var matching = this.configFiles.filter(file => {
            return file.buildName == buildName;
        });
        if (!!matching) {
            return matching[0];
        }
        return null;
    }
    /** Find a build's most recent build result. */
    mostRecentLog(buildName) {
        var mostRecentLog = null;
        if (!!this.buildLogs) {
            var filteredLogs = this.buildLogs
                .filter(log => {
                return log.name == buildName;
            })
                .sort((logA, logB) => {
                var dateA = new Date(logA.lastUpdated);
                var dateB = new Date(logB.lastUpdated);
                return dateB.getTime() - dateA.getTime();
            });
            if (!!filteredLogs) {
                mostRecentLog = filteredLogs[0];
            }
        }
        return mostRecentLog;
    }
    /** Cancels any currently scheduled builds, loads the SendGrid API key file, all build definitions, and schedules builds. */
    load() {
        this.cancelScheduledBuilds();
        this.configFiles = [];
        this.configs = [];
        try {
            this.sendGridKey = JSON.parse(fs.readFileSync(sendGridApiKeyFilename)).key;
        }
        catch (err) {
            console.log('no sendgrid api key found, unable to send emails.');
        }
        this.ensureDirectoryExistence(this.logDir);
        this.ensureDirectoryExistence(this.configDir);
        var configFiles = fs.readdirSync(this.configDir).filter((file) => {
            let extension = '.json';
            let extIndex = file.lastIndexOf(extension);
            return extIndex !== -1 && extIndex + extension.length == file.length;
        });
        for (var fileName of configFiles) {
            var buildDef = this.loadBuildDefFile(fileName);
            this.configFiles.push({
                fileName: fileName,
                buildName: buildDef.name
            });
        }
        if (this.configs.length) {
            console.log('scheduling builds');
            this.scheduleBuilds();
        }
        else {
            console.log('no build definitions found');
        }
    }
    loadBuildDefFile(fileName) {
        var filePath = path.join(this.configDir, fileName);
        console.log(`loading build def: ${filePath}`);
        var configFile = fs.readFileSync(filePath);
        var buildDef = JSON.parse(configFile);
        if (buildDef.name && buildDef.steps && buildDef.directory) {
            var existingDef = this.findBuildDef(buildDef.name);
            if (!!existingDef) {
                existingDef = buildDef;
            }
            else {
                this.configs.push(buildDef);
            }
        }
        return buildDef;
    }
    /** Initializes a node-schedule for builds that have CRON schedules. */
    scheduleBuilds() {
        for (var buildDef of this.configs) {
            if (buildDef.schedule) {
                var job = schedule.scheduleJob(buildDef.schedule, () => {
                    var latest = this.mostRecentLog(buildDef.name);
                    if (!latest || (!!latest && latest.result != models_1.BuildStatus.Running)) {
                        this.startBuild(buildDef);
                    }
                });
                this.scheduledBuilds.push(job);
            }
        }
    }
    cancelScheduledBuilds() {
        for (var job of this.scheduledBuilds) {
            schedule.cancelJob(job);
        }
        this.scheduledBuilds = [];
    }
    /** Cancels an actively running build. */
    cancelBuild(buildName) {
        var buildDef = this.findBuildDef(buildName);
        var buildResult = this.mostRecentLog(buildName);
        if (!!buildDef && !!buildResult) {
            buildResult.result = models_1.BuildStatus.Cancelled;
            buildResult.lastUpdated = new Date().toJSON();
            buildResult.log.push(new models_1.LogLine('--------------'));
            buildResult.log.push(new models_1.LogLine(`Build was cancelled 🤨`));
            this.writeLogFile(buildDef, buildResult);
            // kill all processes with this build name
            var processes = this.buildProcesses.filter(buildProc => {
                return (buildProc.buildName = buildName);
            });
            if (!!processes) {
                for (var buildProc of processes) {
                    if (!!buildProc.process) {
                        try {
                            buildProc.process.kill();
                        }
                        catch (error) { }
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
    startBuild(buildDef, force = null) {
        var latestRun = this.mostRecentLog(buildDef.name);
        if (!!latestRun && latestRun.result == models_1.BuildStatus.Running) {
            return latestRun;
        }
        // reload build def from file in case steps have changed
        var buildDefFile = this.findBuildDefFile(buildDef.name);
        if (!!buildDefFile) {
            buildDef = this.loadBuildDefFile(buildDefFile.fileName);
        }
        // if the build def specifies that it should only run when there are changes, check (git) if repo is behind changes
        var isBehind = true; // default to true before we check the build def (startBuild was called for a reason, after all)
        if ((force == null || force === false) && !!buildDef.onlyRunForChanges) {
            isBehind = checkForGitChanges_1.checkGitForChanges(buildDef);
        }
        // run if forcing a build (ie from 'start' button on client) or if behind
        var shouldRun = !!force || isBehind;
        var result = null;
        if (shouldRun) {
            // start build
            console.log(`starting build: ${buildDef.name}`);
            result = new models_1.BuildResult(buildDef.name, buildDef);
            result.log.push(new models_1.LogLine(`Starting build ${buildDef.name}...`));
            this.buildLogs.push(result);
            this.executeBuildStep(0, buildDef, result);
        }
        return result;
    }
    executeBuildStep(index, buildDef, buildResult) {
        var step = buildDef.steps[index];
        var directory = buildDef.directory;
        var stepId = `(step-${index})` + step.command;
        var stepDescription = `${step.command} ${!!step.args ? step.args.join(' ') : ''}`;
        buildResult.lastUpdated = new Date().toJSON();
        buildResult.log.push(new models_1.LogLine(`Running step ${index} (${stepDescription})...`, stepId));
        try {
            var proc = spawn(step.command, step.args, {
                cwd: directory,
                env: process.env,
                shell: true
            });
            // add to our build process list for cancellation later
            this.buildProcesses.push(new models_1.BuildProcess(buildDef.name, proc));
            proc.on('error', (error) => {
                if (buildResult.result != models_1.BuildStatus.Cancelled) {
                    // fail build on error
                    buildResult.result = models_1.BuildStatus.Failed;
                    buildResult.lastUpdated = new Date().toJSON();
                    buildResult.log.push(new models_1.LogLine(`Step ${index} command error  🚨 (${stepDescription}): ${JSON.stringify(error, null, 2)}`));
                }
            });
            proc.on('close', (exitCode) => {
                if (buildResult.result != models_1.BuildStatus.Cancelled) {
                    if (exitCode !== 0) {
                        // command exited with non-success code, fail build
                        buildResult.result = models_1.BuildStatus.Failed;
                        buildResult.lastUpdated = new Date().toJSON();
                        buildResult.log.push(new models_1.LogLine('--------------'));
                        buildResult.log.push(new models_1.LogLine(`Step ${index} command failed 😭 (${stepDescription})`));
                    }
                    else {
                        var failedStepLogs = null;
                        if (step.failText) {
                            var failReg = new RegExp(step.failText, 'gm');
                            failedStepLogs = buildResult.log.filter(item => {
                                var matches = failReg.exec(item.message);
                                return !!matches && matches.length >= 2 && !!matches[1];
                            });
                        }
                        var unstableStepLogs = null;
                        if (step.unstableText) {
                            var unstableReg = new RegExp(step.unstableText, 'gm');
                            unstableStepLogs = buildResult.log.filter(item => {
                                var matches = unstableReg.exec(item.message);
                                return !!matches && matches.length >= 2 && !!matches[1];
                            });
                        }
                        // if this step's fail text is found, fail build
                        if (!!failedStepLogs && failedStepLogs.length > 0) {
                            buildResult.result = models_1.BuildStatus.Failed;
                            buildResult.lastUpdated = new Date().toJSON();
                            buildResult.log.push(new models_1.LogLine('--------------'));
                            buildResult.log.push(new models_1.LogLine(`Failure text condition was met on step ${index} 😭 (${stepDescription})`));
                        }
                        else if (!!unstableStepLogs && unstableStepLogs.length > 0) {
                            buildResult.result = models_1.BuildStatus.Unstable;
                            buildResult.lastUpdated = new Date().toJSON();
                            buildResult.log.push(new models_1.LogLine('--------------'));
                            buildResult.log.push(new models_1.LogLine(`Unstable text condition was met on step ${index} 🤔 (${stepDescription})`));
                        }
                        else if (index + 1 < buildDef.steps.length) {
                            this.executeBuildStep(index + 1, buildDef, buildResult);
                        }
                        else {
                            // we succeeded!
                            buildResult.result = models_1.BuildStatus.Success;
                            buildResult.lastUpdated = new Date().toJSON();
                            buildResult.log.push(new models_1.LogLine('--------------'));
                            buildResult.log.push(new models_1.LogLine(`Build completed successfully! 😀👍`));
                        }
                    }
                    if (buildResult.result == models_1.BuildStatus.Failed || buildResult.result == models_1.BuildStatus.Unstable) {
                        this.sendEmail(buildDef, `${buildDef.name} Build Failed 😭`, `<h2>Build Log</h2><pre>${JSON.stringify(buildResult, null, 2)}</pre>`);
                    }
                    if (buildResult.result != models_1.BuildStatus.Running) {
                        this.writeLogFile(buildDef, buildResult);
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
                buildResult.log.push(new models_1.LogLine(line));
            });
        }
        catch (error) {
            if (buildResult.result != models_1.BuildStatus.Cancelled) {
                // exception somewhere, fail build
                buildResult.result = models_1.BuildStatus.Failed;
                buildResult.lastUpdated = new Date().toJSON();
                buildResult.log.push(new models_1.LogLine('--------------'));
                buildResult.log.push(new models_1.LogLine(`Step ${index} command failed 😭 (${stepDescription}): ${error != null ? JSON.stringify(error, null, 2) : ''}`));
                this.writeLogFile(buildDef, buildResult);
            }
        }
    }
    writeLogFile(buildDef, buildResult) {
        try {
            var last = new Date(buildResult.lastUpdated);
            var logFileName = `${buildDef.name}_${last.getUTCFullYear()}-${last.getUTCMonth() +
                1}-${last.getUTCDate()}_${last.getUTCHours()}-${last.getUTCMinutes()}-${last.getUTCSeconds()}.json`;
            var contents = JSON.stringify(buildResult, null, 2);
            var logFilePath = path.join(this.logDir, logFileName);
            fs.writeFile(logFilePath, contents, { encoding: 'utf8' }, (err) => {
                if (err) {
                    console.log('error saving log file', err);
                }
            });
        }
        catch (err) {
            console.log('failed to write log file', err);
        }
    }
    ensureFileDirectoryExistence(filePath) {
        var directory = path.dirname(filePath);
        this.ensureDirectoryExistence(directory);
    }
    ensureDirectoryExistence(directory) {
        if (fs.existsSync(directory)) {
            return;
        }
        fs.mkdirSync(directory);
    }
    sendEmail(buildDef, subject, htmlMessage) {
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
            }
            catch (err) {
                console.log('failed to send email', err);
            }
        }
    }
}
exports.BuildManager = BuildManager;
//# sourceMappingURL=buildManager.js.map