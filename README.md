# web-xforge <!-- omit in toc -->

## Users

To use **Language Forge** go to [languageforge.org](https://languageforge.org).

To use **Scripture Forge** go to [scriptureforge.org](https://scriptureforge.org).

### Report problems

To report an issue with the **Language Forge** application, email "languageforgeissues @ sil dot org".

To report an issue with the **Scripture Forge** application, email "scriptureforgeissues @ sil dot org".

The rest of this document discusses the development of the underlying software.

## Contents <!-- omit in toc -->

<!-- The table of contents is automatically updated by VSCode extension
"yzhang.markdown-all-in-one" when saving. -->

- [Users](#users)
  - [Report problems](#report-problems)
- [Sites](#sites)
- [Special Thanks To](#special-thanks-to)
- [Developers](#developers)
  - [Builds](#builds)
  - [Gitflow](#gitflow)
  - [Style Guides](#style-guides)
  - [Layout](#layout)
  - [Development Environment](#development-environment)
    - [Vagrant Development Machine](#vagrant-development-machine)
    - [Local Linux Development Setup](#local-linux-development-setup)
    - [Manual Setup](#manual-setup)
  - [Development Process](#development-process)
  - [Production build](#production-build)
  - [Reference](#reference)
- [Testing](#testing)
  - [.NET Unit Testing](#net-unit-testing)
  - [Node Unit Testing](#node-unit-testing)
    - [Debugging Unit Tests](#debugging-unit-tests)
  - [Angular Linting and Prettiering](#angular-linting-and-prettiering)
  - [Angular Unit Testing](#angular-unit-testing)
    - [Debugging Unit Tests](#debugging-unit-tests-1)
    - [Filtering Unit Tests](#filtering-unit-tests)
  - [Angular End-To-End (E2E) Testing](#angular-end-to-end-e2e-testing)
    - [Debugging E2E Tests](#debugging-e2e-tests)
  - [PWA Testing](#pwa-testing)
  - [Physical Device Testing](#physical-device-testing)
- [Backend Development](#backend-development)
  - [Model Changes](#model-changes)
- [Debugging](#debugging)
- [Database](#database)
- [USX Validation](#usx-validation)
- [Architecture and design](#architecture-and-design)

## Sites

This repository is for Scripture Forge v2+. See also the [repository](https://github.com/sillsdev/web-languageforge) for Language Forge and Scripture Forge v1.

## Special Thanks To

For end-to-end test automation:

[![BrowserStack Logo](readme_images/browserstack-logo.png "BrowserStack")](https://www.browserstack.com/)

For error reporting:

[![Bugsnag logo](readme_images/bugsnag-logo.png "Bugsnag")](https://bugsnag.com/blog/bugsnag-loves-open-source)

## Developers

### Builds

Status of builds from our continuous integration (CI) [server](https://build.palaso.org):

| Site            | Master Unit                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Master E2E          | QA                                                                                                                                                                                                                                                       | Live                                                                                                                                                                                                                                                |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scripture Forge | [![Build Status](<https://build.palaso.org/app/rest/builds/buildType:(id:SFv2_ScriptureForgeMasterUnitTests)/statusIcon>)](https://build.palaso.org/viewType.html?buildTypeId=SFv2_ScriptureForgeMasterUnitTests) [![Total alerts](https://img.shields.io/lgtm/alerts/g/sillsdev/web-xforge.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/sillsdev/web-xforge/alerts/) [![Language grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/sillsdev/web-xforge.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/sillsdev/web-xforge/context:javascript) [![Codecov](https://img.shields.io/codecov/c/github/sillsdev/web-xforge.svg?style=flat)](https://app.codecov.io/gh/sillsdev/web-xforge) | not yet operational | ![Build Status](<https://build.palaso.org/app/rest/builds/buildType:(id:xForgeDeploy_ScriptureForgeQa)/statusIcon>) ![Website](https://img.shields.io/website?down_message=offline&up_message=online&url=https%3A%2F%2Fqa.scriptureforge.org) | ![Build Status](<https://build.palaso.org/app/rest/builds/buildType:(id:xForgeDeploy_ScriptureForgeLive)/statusIcon>) ![Website](https://img.shields.io/website?down_message=offline&up_message=online&url=https%3A%2F%2Fscriptureforge.org) |

Successful builds from our CI server deploy to:

| Site            | QA                                                               | Live                                                       |
| --------------- | ---------------------------------------------------------------- | ---------------------------------------------------------- |
| Scripture Forge | [qa.scriptureforge.org](https://qa.scriptureforge.org) | [scriptureforge.org](https://scriptureforge.org) |

### Gitflow

We use [Gitflow](http://nvie.com/posts/a-successful-git-branching-model/) with some modifications:

- Our `master` branch is the Gitflow `develop` development branch. All pull requests go against `master`.
- Our `qa` branch is similar to a Gitflow `release` branch.
- Our `live` branch is the the Gitflow `master` production branch.

We merge from `master` to the QA testing branch, then ship from the QA branch to the live production branch.

| Site            | Development Branch | QA Branch | Live Branch |
| --------------- | ------------------ | --------- | ----------- |
| Scripture Forge | `master`           | `sf-qa`   | `sf-live`   |

### Style Guides

TypeScript follows the [Angular Style Guide](https://angular.io/guide/styleguide). This is opinionated not only about things like file name conventions but also file and folder structure.

We use [Prettier](https://prettier.io/) with a pre-commit hook.

Microsoft .NET library [design guidelines](https://docs.microsoft.com/en-us/dotnet/standard/design-guidelines/).

### Layout

We use [Angular Flex-Layout](https://github.com/angular/flex-layout) with
[Angular MDC](https://trimox.github.io/angular-mdc-web) including the
[Material Design Icons](https://google.github.io/material-design-icons/).

To generate `src/SIL.XForge.Scripture/wwwroot/css/sf.min.css`, install VS Code extension "ritwickdey.live-sass", which
can watch and re-generate it upon changes to `wwwroot/scss` files, or manually with "Compile Sass" from the VS Code
Command Palette.

### Development Environment

- [Vagrant GUI Setup](#vagrant-gui-setup). A Vagrant box with xForge already installed is downloaded and set up on your
  machine. This is the easiest and cleanest to setup.
- [Local Linux Development Setup](#local-linux-development-setup). Everything is installed directly on your machine,
  which needs to be running Ubuntu 16.04. This is the fastest method because development is not done in a virtual machine.
- [Manual Setup](#manual-setup) This setup is specifically written for **Windows** but the steps could be used for any OS.

#### Vagrant Development Machine

Install [VirtualBox](https://www.virtualbox.org/), [Vagrant](https://www.vagrantup.com/), and
[git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git). To do this in Linux, run

    sudo apt install vagrant virtualbox virtualbox-guest-additions-iso git

Setup git. At least name and email is needed in `.gitconfig`. You can do this from a terminal in your host machine by running

    git config --global user.name "My Name"
    git config --global user.email "me@example.com"

Hardware-assisted virtualization (VT-x or AMD-V) needs to be enabled in your BIOS.

Clone the xforge git repository to access (and later receive updates to) the vagrant development machine configuration file:

    git clone https://github.com/sillsdev/web-xforge
    cd web-xforge/deploy/vagrant/sfdev

Run `vagrant up`. This will download, initialize, and run the development machine. The machine is about 7GB, so expect
the download to take a while.

In the guest development machine, take note of the `machine-instructions.txt` file on the desktop. Set local server
secrets. Then do the following:

```shell
sudo apt update
sudo apt upgrade
cd ~/src/web-xforge/src/SIL.XForge.Scripture
dotnet run
```

In the guest development machine, browse to http://localhost:5000/projects and log in.

#### Local Linux Development Setup

Start by installing Git and Ansible:

```shell
sudo add-apt-repository ppa:ansible/ansible
sudo apt update
sudo apt install -y git ansible
```

Now create a directory for installation and clone the repo:

```shell
git clone --recurse-submodules https://github.com/sillsdev/web-xforge
```

The `--recurse-submodules` is used to fetch many of the Ansible roles used by the Ansible playbooks in the deploy folder. If you've already cloned the repo without `--recurse-submodules`, run `git submodule update --init --recursive` to pull and initialize them.

Change the variable `mongo_path: /var/lib/mongodb` in `deploy/vars/config_palaso.yml`. Set it to a location where MongoDB should store its databases.

- **Vagrant VM Setup**: uncomment line 5 and comment line 4
- **Local Linux Development Setup**: uncomment line 4 and comment line 5 (or whatever is appropriate on your system, its best to have Mongo store databases on your HDD rather than SSD). Make sure the `mongodb` user has permission to read and write to the path you specify.

Run the following Ansible playbook (works on Ubuntu 16.04 thru 20.04 (focal)).

```bash
cd web-xforge/deploy
ansible-playbook playbook_focal.yml --limit localhost -K
```

Add developer secrets. Ask another developer how to get these.

In `src/SIL.XForge.Scripture/`, run `dotnet run`. Browse to `http://localhost:5000`.

#### Manual Setup

Although this setup is specifically written for **Windows**, the steps could be used for any OS and only step 3 is a Windows specific link. The order below is not particulalry important.

1. Install `git`, e.g. [Git Kraken](https://www.gitkraken.com/download)
2. Clone the repo from the command line including recursing submodules (feel free to clone with SSH instead of HTTPS):

   `git clone --recurse-submodules https://github.com/sillsdev/web-xforge`.

3. Install [MongoDB v4](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-windows/) as a service
4. Install [.Net Core SDK-3.1](https://dotnet.microsoft.com/download/dotnet-core/3.1)
5. Install [Node v12](https://nodejs.org/en/download/)
6. Install [FFmpeg v4](https://ffmpeg.org/download.html) executable into the `C:\usr\bin\` directory.
7. Install a developer editor, [VS Code](https://code.visualstudio.com/download) is recommended (the repo includes VS Code settings)
8. Install [Mercurial v4.8](https://www.mercurial-scm.org/) (python 2) and copy contents into the `C:\usr\local\bin\ directory`.
9. Create folders owned by you. Check in the Ansible `deploy/dependencies.yml` for the valid list of folders. As of writing they were:

- `/var/lib/scriptureforge/sync/`
- `/var/lib/scriptureforge/audio/`
- `/var/lib/xforge/avatars/`

On Windows, just put these off your root drive, e.g. `C:\var\lib\...`

10. Add developer secrets. Ask another developer how to get these.
11. Copy `/deploy/files/InternetSettings.xml` to `%localappdata%/Paratext92` or `~/.local/share/Paratext92/` on other systems. If you have installed Paratext 9.2, and completed the initial setup on first run, then this step will be taken care of for you.
12. In `src/SIL.XForge.Scripture/`, run `dotnet run`. Browse to `http://localhost:5000`.

### Development Process

The first task on a job is to create a feature branch. Branch off of the **master** branch.

```bash
git checkout master
git pull
git checkout -b feature/<featureName>
```

Do some useful work and commit it.

Upload your work:

```bash
git push origin feature/<featureName>
```

Rebase often (at least at the start of the day, and before making a PR). Force pushing to your own branch is fine (even during review).

Make PR's against the **master** branch. If the **master** branch has moved on since the feature branch was made, rebase your changes on top of the **master** branch before making your PR.

Ensure all [tests](#testing) are passing before submitting a PR.

We use [Reviewable](https://reviewable.io/) for GitHub Pull Requests (PRs). When submitting a PR, a **This change is Reviewable** link is added to the PR description. Remember to click the **Publish** button after adding comments in Reviewable.

If the person reviewing feels comfortable to approve it they can. However if they want other eyes on it, mention it in a comment on the PR.
If you have minor changes to request on a PR you can say 'Make change X and then LGTM'. This means the person making the PR can merge it themselves after the requested change.
People merging PRs can and should rebase the completed PR change (default to squash and rebase unless commits have good reason to stay separate).

Delete the PR branch after merge.

### Production build

You can do a production build of the backend and frontend locally by running the following in the repository root:

```bash
dotnet publish src/SIL.XForge.Scripture/SIL.XForge.Scripture.csproj -c Release \
  -r linux-x64 /p:Version=9.9.9 /p:AngularConfig=production
```

Then you can attempt to run it with:

```bash
cd src/SIL.XForge.Scripture/bin/Release/netcoreapp3.1/linux-x64/publish
./SIL.XForge.Scripture
```

Note that the production build won't really run without changing what remote servers it
connects to. But it may still prove useful for testing certain things.

### Reference

- Angular Tutorial https://angular.io/tutorial
- Angular https://angular.io/api
- Angular MDC https://trimox.github.io/angular-mdc-web/#/angular-mdc-web/button-demo/api
- Angular Material https://material.angular.io/components/categories
- TypeScript https://www.typescriptlang.org/docs/home.html
- JavaScript https://developer.mozilla.org/en-US/docs/Web/JavaScript
- ts-mockito https://github.com/NagRock/ts-mockito#ts-mockito--
- Mockito (for Java Mockito, but helps know how to use ts-mockito) http://static.javadoc.io/org.mockito/mockito-core/2.23.0/org/mockito/Mockito.html
- Quill https://quilljs.com/docs/
- Delta https://github.com/quilljs/delta/

## Testing

### .NET Unit Testing

To run .NET backend unit tests, from the repo (repository) root

```bash
dotnet test
```

.NET backend unit tests can also be run using the .NET Test Explorer area of the Test sidebar, or by clicking "Run Test" above a test in a code window. Clicking "Debug Test" will allow debugging.

See documentation for [running tests](https://docs.microsoft.com/en-us/dotnet/core/tools/dotnet-test?tabs=netcore21) and [writing tests](https://docs.microsoft.com/en-us/dotnet/core/testing/unit-testing-with-nunit).

### Node Unit Testing

To run Node backend unit tests, from the repo root

```bash
cd src/RealtimeServer
npm test
```

[Jest](https://jestjs.io/) is the test framework for the Node backend.

#### Debugging Unit Tests

Unit tests can be debugged easily in VS Code using the [Jest extension](https://github.com/jest-community/vscode-jest). After installing the exension, start the Jest test runner by executing the `Jest: Start Runner` command in the VS Code command palette. The runner will automatically run all of the Node unit tests and display a green or red circle next to each unit test indicating whether the unit test passed. If the unit test failed, a `Debug` code lens command will appear above the test. Set a breakpoint and click on the command.

### Angular Linting and Prettiering

To check TypeScript for readability, maintainability, and functionality errors, and to check a few other files for proper formatting. From the repo root

```bash
cd src/SIL.XForge.Scripture/ClientApp/
npm run prettier
ng lint
```

Or just use VS Code with this project's recommended extensions.

### Angular Unit Testing

Tests are run by Karma in a browser. Help Karma find Chromium by setting CHROME_BIN. Set it persistently with

```bash
tee -a ~/.pam_environment <<< "CHROME_BIN=chromium-browser"
```

and then log back in to your desktop, or set it temporarily with

```bash
export CHROME_BIN=chromium-browser
```

CHROME_BIN is already set in the vagrant.

Run all the front-end unit tests, automatically re-running when you change a file:

```bash
cd src/SIL.XForge.Scripture/ClientApp
npm test
```

Run tests only in a specific spec file, or only in all spec files in a directory, with the following, where PATH is a
_relative_ path to a file or directory. PATH must be relative to `ClientApp/src`; for example
`app/sync/sync.component.spec.ts` or `app/sync`.

```bash
cd src/SIL.XForge.Scripture/ClientApp/src
npm test -- --include PATH
```

`npm test` will monitor and run tests in a Chromium browser window. You can also monitor and run tests headlessly from
the command line by running

```bash
src/SIL.XForge.Scripture/ClientApp/monitor-test-headless.sh
```

Or just run tests once without monitoring with

```bash
src/SIL.XForge.Scripture/ClientApp/test-headless.sh
```

You can filter the tests to compile and run by passing spec file names as arguments. For example,

```bash
src/SIL.XForge.Scripture/ClientApp/monitor-test-headless.sh some.component.spec.ts another.component.spec.ts
```

#### Debugging Unit Tests

The best way to debug Angular unit tests is with Chrome/Chromium.

- Run `npm test` (which will include source maps, `ng test` does not)
- When the Chrome/Chromium window appears, press _F12_
- Click the Sources tab
- Files might show up under `webpack://` or `context/localhost:dddd/src` or elsewhere, but you can always press Ctrl+P
  and type the name of a file to get there faster.

[This video](https://youtu.be/NVqplMyOZTM) has a live demo of the process.

It is also possible to debug Angular unit tests in VS Code.

- Open the spec file that you want to debug in VS Code.
- Set a breakpoint.
- Navigate to the **Run and Debug** view.
- Select **Launch Chromium and run and debug current spec** from the debug dropdown.
- Click the **Start Debugging** button.

This will run `ng test` on the active spec file, open Chrome, and attach the VS Code debugger. You can refresh the page
by clicking the `Restart` button in the Debug toolbar.

#### Filtering Unit Tests

To run (or not to run) specific tests or fixtures, you can use the prefixes `f`ocus and e`x`clude, as in `fdescribe` or `fit` to run only the specified functions, or `xdescribe` and `xit` to skip running the specified functions (but all functions will still be built). To skip building extra tests, use the `--include` option when running `ng test`. See the [Angular CLI docs](https://angular.io/cli/test) for more info.

See documentation for [running tests](https://github.com/angular/angular-cli/wiki/test) and [writing tests](https://angular.io/guide/testing#testing).

### Angular End-To-End (E2E) Testing

To run E2E tests, make sure you are serving the app. From the repo root

```bash
cd src/SIL.XForge.Scripture/
dotnet run --environment "Testing"
```

In another terminal, from the repo root

```bash
cd src/SIL.XForge.Scripture/ClientApp/
./rune2e.sh
```

#### Debugging E2E Tests

To debug E2E tests, from the repo root

```bash
cd src/SIL.XForge.Scripture/
dotnet run --environment "Testing"
```

In another terminal, from the repo root

```bash
cd src/SIL.XForge.Scripture/ClientApp/
ng serve
```

Add a new line of `debugger;` to the `*.e2e-spec.ts` where you want it to break.

In another terminal, from the repo root

```bash
cd src/SIL.XForge.Scripture/ClientApp/
./rune2e.sh debug
```

Open `chrome://inspect/#devices` in Chromium and click **inspect**. This opens an instance of DevTools and immediately breaks the code at the top of the ng module. Click the continue button (or press F8) in your debugger to run your e2e tests, and hit any `debugger` statements in your code. Close the DevTools window to finish the tests.

### PWA Testing

To test the PWA (Progressive Web App), build the app for PWA testing and run the server without `ng serve`. From the repo root

```bash
cd src/SIL.XForge.Scripture/ClientApp/
ng build --configuration=pwaTest
cd ..
dotnet run --start-ng-serve=no
```

**!!! IMPORTANT !!!** When you have finished testing, remove the built app `dist` folder. From the repo root

```bash
rm -rf src/SIL.XForge.Scripture/ClientApp/dist
```

### Physical Device Testing

To test `localhost` on a physical device you need to ensure you have the following:

- An Android device
- The latest version of Chrome on your desktop
- The latest version of Chrome on your device
- USB debugging enabled on your device

Enabling USB debugging first involves switching on developer mode on your device. This usually involves going to your System->About screen and tapping repeatedly on your build number. Doing a Google search for, `"How to enable USB Debugging on {device name}"` should help get it enabled. Once the device is developer mode there will be a new developer link on your device - likely under system - and in there you'll find an option to toggle on USB debugging.

With USB debugging turned on navigate in Chrome on your desktop to [chrome://inspect/#devices](chrome://inspect/#devices). Your device may at this point present a prompt to allow your Chrome browser access to debug your device - you must allow this. Once allowed your device name will appear in the list of available devices. Before you can run the app you first need to update the `Port forwarding` settings to reflect our app. Click the button on the inspection screen and set as follows:

- 5000 &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp; localhost:5000
- 5003 &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp; localhost:5003

You're now ready to go. Build the app as normal on your desktop using `dotnet run` or `ng serve` or whichever variation you need. Once the build is complete, open up Chrome on your device and navigate to [localhost:5000](http://localhost:5000/). On your desktop the inspection page will show all the open tabs you have in Chrome on the device. Locate the tab running `http://localhost:5000/` and click the `inspect` link. A new window will open with the Chrome DevTools giving you full access to the console, DOM, network, screen sharing, etc.

Please note that if your device goes to sleep or switches to the lock screen then the USB debugging will no longer have permission.

## Backend Development

Normally when you run `dotnet run` it starts `ng serve` for you. This works great if you are developing on the front end as it watches for file changes and reloads your browser once it has compiled.

If you are developing on the backend this works better

```bash
cd src/SIL.XForge.Scripture/
dotnet watch run --start-ng-serve=listen
```

In another terminal

```bash
cd src/SIL.XForge.Scripture/ClientApp/
ng serve
```

When files change on the backend it will compile the changes automatically and now `ng serve` won't re-start every time.

See the [Debugging](#debugging) section below for how to do this in **VS Code**.

### Model Changes

The Angular app has a dependency on the Node backend NPM package so that it has access to the model types. If the models are changed, the Angular app will not see the changes until the backend package is rebuilt. You can rebuild the backend by executing the following commands:

```bash
cd src/RealtimeServer/
npm run build
```

If a model change is made, then a corresponding data migration should be implemented in the Node backend. A data migration is implemented by following these steps:

1. Create a class that extends the `Migration` base class with the name `<collection>Migration<version>` in the appropriate collection migrations file. For example, if you are adding a user migration for schema version 10, then you would add the class `UserMigration10` to the `src/RealtimeServer/common/services/user-migrations.ts` file.
2. Implement the `migrateDoc` method. The `submitMigrationOp` function MUST be used to submit any migration changes to the doc.
3. Implement the `migrateOp` method.
4. Add the class to the migrations array in the migrations file.

## Debugging

Run the frontend, such as with the following in its own Terminal tab. It will automatically re-compile when the code
is changed.

```bash
cd src/SIL.XForge.Scripture/ClientApp && ng serve
```

Run the backend, such as with the following in its own Terminal tab. It will automatically re-compile when the code is
changed. (Running the frontend and backend separately allow them to be independently restarted.)

```bash
cd src/SIL.XForge.Scripture && dotnet watch run --start-ng-serve=listen
```

Run frontend tests on desired specs, such as with the following in its own Terminal tab. It will automatically
re-compile and re-run the tests when the code is changed. It will also open a browser window where you can watch the
tests run, and inspect the DOM. Modify the `--include` arguments in the example below by replacing them with spec
files you wish to test.

```bash
cd src/SIL.XForge.Scripture/ClientApp &&
  npm test -- --include src/app/shared/text/text.component.spec.ts --include src/app/translate/editor/editor.component.spec.ts
```

Launch Chromium/Chrome or Edge with `--remote-debugging-port=9977`, and go to http://localhost:5000/ . For example, in
Linux run:

```bash
chromium-browser --remote-debugging-port=9977
```

Or in Windows:
  - Navigate to Chrome.exe.
  - Right-click Chrome.exe and create a desktop shortcut.
  - Right-click the new desktop shortcut, and modify its properties.
  - Append ` --remote-debugging-port=9977` to the command.
  - Double-click the desktop shortcut to launch Chrome.

Note that your Chromium window for testing the frontend and your Chromium window for running unit tests will be
different windows.

In Visual Studio Code, go to the **Run and Debug** view. Choose one or more of the following and click
**Start Debugging**.
  - **Attach to frontend**
  - **Attach to backend**
  - **Attach to frontend tests**

When you are finished debugging, click **Disconnect**. The processes will continue running until you press Ctrl+C
to end them in the Terminal.

To debug backend tests, open a C# Tests file. In the code above the test, click **Debug Test**, or above the class,
click **Debug All Tests**.

Other debugging targets are available as well, such as targets that start running the frontend and/or backend.

## Database

The VS Code extension [Azure Cosmos DB](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-cosmosdb) can be used to inspect our Mongo DB.

## USX Validation

USX data from the Paratext Data Access API is validated in order to ensure that Scripture Forge does not corrupt Scripture data that it does not know how to properly round-trip. If the `DeltaUsxMapper` class is updated to support new USX data, then Scripture Forge's USX schema should be updated to reflect the corresponding change. The schema is based on the [USX Relax NG schema](https://ubsicap.github.io/usx/schema.html) and can be found at `src/SIL.XForge.Scripture/usx-sf.rnc`. Once the schema is updated, it must be converted to an [XML Schema](https://www.w3.org/TR/xmlschema-1/) file. The schema can be converted using [Trang](https://github.com/relaxng/jing-trang). On Linux, install Trang using

```bash
sudo apt install trang
```

Convert the schema to XML Schema format by running

```bash
cd src/SIL.XForge.Scripture
trang usx-sf.rnc usx-sf.xsd
```

## Architecture and design

<img src="https://docs.google.com/drawings/d/e/2PACX-1vQjPZcXN0p9cZRf6cV8SRmjPMlQhwlFIH9GvSrYmbMcdK93NXVHFUhkm0LEEXcQKsSwdO6eRHbUpPtB/pub?w=959&amp;h=651" alt="SF and PT synchronization process">

