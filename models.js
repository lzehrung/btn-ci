module.exports.BuildResult = function(name, buildDef) {
  var self = this;
  self.name = name;
  self.buildDef = buildDef;
  self.lastUpdated = new Date().toJSON();
  self.result = module.exports.BuildStatus.Running;
  self.log = [];
};

module.exports.BuildStatus = {
  Running: 'Running',
  Failed: 'Failed',
  Cancelled: 'Cancelled',
  Unstable: 'Unstable',
  Success: 'Success'
};

module.exports.LogLine = function(message, command) {
  var self = this;
  self.time = new Date().toJSON();
  self.message = message;
  self.command = command;
};

module.exports.BuildDefinition = function() {
  var self = this;
  self.name = '';
  self.directory = null;
  self.schedule = '';
  self.steps = [];
};

module.exports.BuildStep = function() {
  var self = this;
  self.command = null;
  self.args = null;
  self.directory = null;
};
