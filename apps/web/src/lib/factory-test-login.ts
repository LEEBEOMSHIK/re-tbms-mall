import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {testLoginAllowed} from './admin-session-core.ts';
// Only the server reads credentials; authentication still uses the ordinary factory API.
export async function loadFactoryTestCredentials(request:Request, environment:string|undefined=process.env.NODE_ENV, root=projectRoot()):Promise<{username:string;password:string}|null>{
 if(!testLoginAllowed(request,environment))return null;
 try{
  const text=await readFile(path.join(root,'.local','factory-test-login.json'),'utf8');
  if(text.length>4096)return null;
  const value=JSON.parse(text.replace(/^\uFEFF/,''));
  if(typeof value.username!=='string'||!/^factory\.demo\.[0-9a-f]{32}$/.test(value.username)||typeof value.password!=='string'||value.password.length<12||value.password.length>128)return null;
  return {username:value.username,password:value.password};
 }catch{return null;}
}
function projectRoot(){const cwd=process.cwd();return path.basename(cwd)==='web'&&path.basename(path.dirname(cwd))==='apps'?path.resolve(cwd,'../..'):cwd;}
