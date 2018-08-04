"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class BuildResult {
    constructor(name, buildDef, lastUpdated = new Date().toJSON(), result = BuildStatus.Running, log = []) {
        this.name = name;
        this.buildDef = buildDef;
        this.lastUpdated = lastUpdated;
        this.result = result;
        this.log = log;
    }
}
exports.BuildResult = BuildResult;
var BuildStatus;
(function (BuildStatus) {
    BuildStatus["Running"] = "Running";
    BuildStatus["Failed"] = "Failed";
    BuildStatus["Cancelled"] = "Cancelled";
    BuildStatus["Unstable"] = "Unstable";
    BuildStatus["Success"] = "Success";
})(BuildStatus = exports.BuildStatus || (exports.BuildStatus = {}));
class LogLine {
    constructor(message = '', command = '', time = new Date().toJSON()) {
        this.message = message;
        this.command = command;
        this.time = time;
    }
}
exports.LogLine = LogLine;
class BuildDefinition {
    constructor(name = '', directory = '', schedule = '', emailFrom = '', emailTo = '', onlyRunForChanges = false, steps = []) {
        this.name = name;
        this.directory = directory;
        this.schedule = schedule;
        this.emailFrom = emailFrom;
        this.emailTo = emailTo;
        this.onlyRunForChanges = onlyRunForChanges;
        this.steps = steps;
    }
}
exports.BuildDefinition = BuildDefinition;
class BuildStep {
    constructor(command = '', args = [], directory = '', failText = '', unstableText = '') {
        this.command = command;
        this.args = args;
        this.directory = directory;
        this.failText = failText;
        this.unstableText = unstableText;
    }
}
exports.BuildStep = BuildStep;
class BuildDefFile {
    constructor(fileName, buildName) {
        this.fileName = fileName;
        this.buildName = buildName;
    }
}
exports.BuildDefFile = BuildDefFile;
class BuildProcess {
    constructor(buildName, process) {
        this.buildName = buildName;
        this.process = process;
    }
}
exports.BuildProcess = BuildProcess;
//# sourceMappingURL=models.js.map