![build](https://github.com/chibat/chrome-extension-typescript-starter/workflows/build/badge.svg)

# VerifyPage - Chrome Browser Extension
You can install this extension from the Chrome-App-Store [here](https://chrome.google.com/webstore/detail/verifypage/gadnjidhhadchnegnpadkibmjlgihiaj?hl=en-GB&authuser=0). Current Version 1.2.

This is a verification client for the micro-pkc https://github.com/inblockio/micro-PKC
it uses the CLI verification tool as an external dependency https://github.com/inblockio/data-accounting-external-verifier. If you want the latest build, or you want to build it yourself, follow the instructions given here.

Chrome Extension, TypeScript, HTML

## Prerequisites

* [node + npm](https://nodejs.org/) (Current Version)

## Includes the following

* TypeScript
* Webpack
* React
* Jest
* Example Code
    * Chrome Storage
    * Options Version 2
    * content script
    * count up badge number
    * background

## Project Structure

* src/typescript: TypeScript source files
* src/assets: static files
* dist: Chrome Extension directory
* dist/js: Generated JavaScript files

## Setup

```
npm install
```

## Build

```
npm run build
```

## Build in watch mode

### terminal

```
npm run watch
```

## Load extension to chrome
Go to chrome://extensions and enable 'Developer Mode' on the upper right corner.
Now you can load `dist` directory of our local extension, after you completed the build process.

You can also load a pre-build version of the extension.

## Test
`npx jest` or `npm run test`

## Troubleshooting

In npm v17.x we expect the following error while running `npm run build`:
```
Error: --openssl-legacy-provider is not allowed in NODE_OPTIONS
```
to solve it, put this in your .bashrc
```sh
export NODE_OPTIONS=--openssl-legacy-provider
```

## Rights

Unless otherwise noted all work in this repository is licensed under the APGL with the exception of the original boilerplate which is MIT-licensed and Copyright (C) Isaac Patka and Tomofumi Chiba. Design assets, graphics and other visual files are Copyright (C) their respective owners and may not be used without permission.

Copyright (C) 2022  inblock.io assets GmbH

VerifyPage is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

VerifyPage is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.