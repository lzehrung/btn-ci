# BetterThanNothingCI

Hosts a simple build system using ExpressJS and Angular.

## Build Definitions
Add a JSON configuration file to the definitions folder to set up a build. Here's an example:

```JSON
{
  "name": "myAwesomeBuild",
  "directory": "C:\\GitRepos\\myProject",
  "emailFrom": "my-awesome-build-ci@domain.com",
  "emailTo": [ "my-dev-team@domain.com" ],
  "schedule": "*/5 * * * *",
  "onlyRunForChanges": true,
  "steps": [
    {
      "command": "git",
      "args": ["checkout", "mainline/qa"]
    },
    {
      "command": "git",
      "args": ["reset", "--hard"]
    },
    {
      "command": "git",
      "args": ["pull"]
    },
    {
      "command": "npm",
      "args": ["install"]
    },
    {
      "command": "npm",
      "args": ["run", "build"],
      "failText": ["Exit status 1"]
    },
    {
      "command": "npm",
      "args": ["run", "test"],
      "unstableText": ["[(0-9)] FAILED"]
    }
  ]
}
```
#### Build Definition Options
**name**: used to identify the build

**directory**: root directory that build steps will operate in (expects a git repository)

**emailFrom**: email address to use when sending emails (currently just for failures)

**emailTo**: recipient email addresses

**schedule**: cron schedule the build will be triggered on (via [node-schedule](https://www.npmjs.com/package/node-schedule))

**onlyRunForChanges**: boolean; if true, the build will only execute if the git repository has new commits when it runs on its schedule (builds started manually from the website will ignore this setting)

**steps**: your build process; an array of objects that will be used as parameters to a node [spawn](https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options) function call (via [cross-spawn](https://www.npmjs.com/package/cross-spawn) to resolve some issues I was having on my Windows machine). these are expected to be console commands that will execute in your build directory.

## Build Result Logs
Logs are written to the /logs folder, here's an example:
```JSON
{
  "name": "myAwesomeBuild",
  "buildDef": {
    // build definition as seen above
  },
  "lastUpdated": "2018-08-02T17:02:11.886Z",
  "result": "Success",
  "log": [
    {
      "time": "2018-08-02T17:00:24.405Z",
      "message": "Starting build myAwesomeBuild..."
    },
    {
      "time": "2018-08-02T17:00:24.405Z",
      "message": "Running step 0 (git checkout mainline/qa)...",
      "command": "(step-0)git"
    },
    {
      "time": "2018-08-02T17:00:24.711Z",
      "message": "Your branch is behind 'mainline/qa' by 2 commits, and can be fast-forwarded."
    }
    ...
  ]
}
```