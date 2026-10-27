const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function setup(script, html) {
 const markup = fs.readFileSync(path.join(root, html), 'utf8');
 const nodes = new Map([...markup.matchAll(/id="([^"]+)"/g)].map(m => [m[1], {
   value:'', textContent:'', innerHTML:'', hidden:false, disabled:false, style:{},
   classList:{add(){},remove(){}},focus(){},setAttribute(){},addEventListener(){},
   checkValidity(){return this.value.includes('@')},reset(){},contains(){return false}
 }]));
 const calls=[];const controls={otpError:null,verifyError:null,insertError:null,session:null};
 const user={id:'test-user',phone:'+12025550123',user_metadata:{}};
 const ctx={console,Date,URL,URLSearchParams,location:{href:'https://level.test/index.html',search:''},
 document:{getElementById(id){assert.ok(nodes.has(id),'Missing DOM id '+id);return nodes.get(id)},body:{style:{}},addEventListener(){},querySelectorAll(){return []}},
 levelUser:async()=>user,
 levelClient:{auth:{
 signInWithOtp:async args=>{calls.push(['otp',args]);return {error:controls.otpError}},
 verifyOtp:async args=>{calls.push(['verify',args]);return {error:controls.verifyError}},
 signInWithPassword:async args=>{calls.push(['password',args]);return {data:{session:controls.session},error:null}},
 signUp:async args=>{calls.push(['signup',args]);return {data:{session:controls.session},error:null}}
 },from:table=>({insert:async row=>{calls.push(['insert',table,row]);return {error:controls.insertError}},upsert:async row=>({error:null})})},
 };
 ctx.window=ctx;ctx.addEventListener=()=>{};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,script),'utf8'),ctx);
 return {ctx,nodes,calls,controls,run:code=>vm.runInContext(code,ctx)};
}
test('phone validation, provider rejection, OTP failure/success and no early login',async()=>{
 const {ctx,nodes,calls,controls,run}=setup('assets/js/level-auth.js','index.html');
 ctx.setAuthMethod('phone');nodes.get('authPhone').value='2025550123';
 await ctx.submitAuth({preventDefault(){}});assert.equal(calls.length,0);
 nodes.get('authPhone').value='+1 (202) 555-0123';controls.otpError={message:'Phone provider is disabled'};
 await ctx.submitAuth({preventDefault(){}});assert.match(nodes.get('authError').textContent,/not available yet/);
 assert.equal(run('pendingPhone'),'');controls.otpError=null;
 await ctx.submitAuth({preventDefault(){}});assert.equal(run('pendingPhone'),'+12025550123');
 assert.equal(nodes.get('codeRow').hidden,false);assert.equal(ctx.location.href,'https://level.test/index.html');
 nodes.get('authCode').value='111111';controls.verifyError={message:'Code is invalid'};
 await ctx.submitAuth({preventDefault(){}});assert.equal(ctx.location.href,'https://level.test/index.html');
 nodes.get('authCode').value='123456';controls.verifyError=null;
 await ctx.submitAuth({preventDefault(){}});assert.equal(ctx.location.href,'dashboard.html');
 assert.equal(calls.at(-1)[1].type,'sms');assert.equal(nodes.get('authSubmitBtn').disabled,false);
});
test('email confirmation does not imply an authenticated session',async()=>{
 const {ctx,nodes,controls}=setup('assets/js/level-auth.js','index.html');
 ctx.openAuth('signup');nodes.get('authEmail').value='test@example.invalid';nodes.get('authPass').value='long-password';
 await ctx.submitAuth({preventDefault(){}});assert.match(nodes.get('authSuccess').textContent,/confirm/);
 assert.equal(ctx.location.href,'https://level.test/index.html');
 controls.session={};await ctx.submitAuth({preventDefault(){}});assert.equal(ctx.location.href,'dashboard.html');
});
test('failed application insert never displays success; no client approval fields',async()=>{
 const {ctx,nodes,calls,controls,run}=setup('assets/js/level-apply.js','apply.html');
 run("currentUser={id:'test-user'}; appData={full_name:'Test',email:'test@example.invalid',business_name:'Example'}");
 let shown;ctx.showStep=id=>shown=id;controls.insertError={message:'Database unavailable'};await ctx.handleAnswer('yes');
 assert.equal(nodes.get('submitError').textContent,'Database unavailable');
 assert.equal(shown,undefined);
 controls.insertError=null;await ctx.handleAnswer('no');
 assert.equal(shown,'stepSubmitted');const row=calls.at(-1)[2];
 assert.equal(row.user_id,'test-user');assert.equal(row.has_business_funds,false);
 assert.equal('status' in row,false);assert.equal('grant' in row,false);assert.equal('balance' in row,false);
});
