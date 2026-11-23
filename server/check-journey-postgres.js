import {spawnSync} from 'node:child_process';
const result=spawnSync(process.execPath,['--test','server/test/complete-journey.test.js'],{env:{...process.env,AURELIA_JOURNEY_NATIVE:'1'},stdio:'inherit',windowsHide:true});process.exitCode=result.status??1;
