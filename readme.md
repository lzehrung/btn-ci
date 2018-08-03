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
      "args": ["checkout", "master/qa"]
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

Logs are written to the /logs folder