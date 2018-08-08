# BetterThanNothing CI 🔨

Hosts a simple build system using [Express](https://expressjs.com/), [node-schedule](https://www.npmjs.com/package/node-schedule), [cross-spawn](https://www.npmjs.com/package/cross-spawn), [socket.io](https://socket.io/), and [Angular](https://angular.io/).

Features:
- Simple configuration
- Real-time build updates
- Scheduling (cron format)
- Build only on new git commits (optional)
- Email notifications on failure
- Build result log files
- Build definition reloading
- New build run pausing
- Maximum concurrent builds
- Queue system when max running builds exceeded

#### Why?

I've wanted to write a simple CI system for a while just for the heck of it. It seems like a simple enough problem to solve, excluding any fancy integration features.

My team at work needed basic CI for our project and our source control hadn't been updated to a version that supported the CI system we wanted to use department-wide. Until this could be set up for us, my first approach was to set up Jenkins on a VM but I was having issues with our npm build scripts not completing their execution (they would simply stall out and the Jenkins build would never finish). This seemed to be some sort of npm memory issue (according to my Google adventures) and I quickly lost interest in troubleshooting that. That evening I decided it was finally time to scratch the itch of building my own CI server!

This probably seems like a waste of time given the number of CI systems available these days but... meh! I had fun and it actually solved my work team's immediate needs!

Since this was just hacked out over the course of a couple evenings, I'm going to work on cleaning it up a bit but I highly doubt we'll use it on our project forever.

## Usage

To get it up and running, execute these commands from the root of the repository:

```
npm install
npm run start
```

**npm run prod**: builds the client (Angular) app with the prod flag set (for minification)

**npm run start**: starts the server (which will load build definitions and schedule any with cron schedules), which hosts the client app

You should be able to browse to http://localhost:3000 and see the "exampleBuild" listed. Click the Start button and it will run a "build" that just pings Google's DNS server.

In order to send emails, put a [SendGrid](https://sendgrid.com/) API key in a file named **'sendgrid-key.json'** in the 'server' folder with this format:
```JSON
{
  "key": "YOUR SENDGRID KEY"
}
```

### Build Definitions
Add a JSON configuration file to the definitions folder to set up a build. This will be re-loaded before a build starts allowing you to make tweaks to it without restarting the server.

Here's an example:

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
#### Definition Options
**name**: Used to identify the build.

**directory**: Root directory that build steps will operate in.

**emailFrom**: Email address to use when sending emails (currently just for failures).

**emailTo**: Recipient email addresses.

**schedule**: cron schedule the build will be triggered on (via [node-schedule](https://www.npmjs.com/package/node-schedule)).

**onlyRunForChanges**: Boolean (**NOTE**: this feature only works with git right now); if true, the build will only execute if the git repository has new commits when it runs on its schedule (builds started manually from the website will ignore this setting).

**steps**: Your build process; an array of objects that will be used as parameters to a node [spawn](https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options) function call (via [cross-spawn](https://www.npmjs.com/package/cross-spawn) to resolve some issues I was having on my Windows machine). These are expected to be console commands that will execute in your build directory. Since these are spawn function parameters, running a console command like "git reset --hard" needs to be separated like so: spawn("git", [ "reset", "--hard" ]). In this case "command"="git" and "args"=[ "reset", "--hard" ].

### Build Logs
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