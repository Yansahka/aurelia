import {spawnSync} from 'node:child_process';
const result=spawnSync(process.execPath,['--test','server/test/account-security.test.js'],{env:{...process.env,AURELIA_ACCOUNT_NATIVE:'1'},stdio:'inherit',windowsHide:true});process.exitCode=result.status??1;
