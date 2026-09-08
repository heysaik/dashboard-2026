'use strict';
const WidgetValidation = (() => {
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const failure=(code,message,extra={})=>({code,message,...extra});
  function layoutIssues(root,width,height) {
    const issues=[],base=root.getBoundingClientRect();
    const controls=[...root.querySelectorAll('button,input,select,textarea')].filter(el=>!el.hidden && getComputedStyle(el).display!=='none' && el.getBoundingClientRect().width>0);
    for(const el of controls) {
      const r=el.getBoundingClientRect();
      if(r.right>base.left+width+1 || r.bottom>base.top+height+1 || r.left<base.left-1 || r.top<base.top-1)issues.push(`${el.getAttribute('aria-label') || el.textContent.trim() || el.tagName} extends outside the widget`);
    }
    if(root.scrollWidth>width+1 || root.scrollHeight>height+1)issues.push('The widget scrolls outside its selected dimensions');
    return [...new Set(issues)].slice(0,8);
  }
  // Runs inside the isolated candidate iframe. It only manipulates that widget's DOM.
  function probe(token,checks) {
    const errors=[];addEventListener('error',event=>errors.push(event.message));addEventListener('unhandledrejection',event=>errors.push(String(event.reason)));
    addEventListener('load',async()=>{
      const delay=ms=>new Promise(r=>setTimeout(r,ms)),normalize=text=>String(text).replace(/\s+/g,' ').trim();
      const layout=()=>{
        const issues=[];
        if(document.documentElement.scrollWidth>innerWidth+1 || document.body.scrollHeight>innerHeight+1)issues.push('Content overflows the selected size');
        for(const el of document.querySelectorAll('button,input,select,textarea')) {
          const r=el.getBoundingClientRect(),style=getComputedStyle(el);if(!r.width || !r.height || style.display==='none' || style.visibility==='hidden')continue;
          if(r.left<-1 || r.top<-1 || r.right>innerWidth+1 || r.bottom>innerHeight+1)issues.push(`${el.id || el.getAttribute('aria-label') || el.tagName} is clipped`);
          if(el.tagName==='BUTTON' && (el.scrollWidth>el.clientWidth+2 || el.scrollHeight>el.clientHeight+2))issues.push(`${el.id || el.textContent.slice(0,40)} has clipped button text`);
        }
        return [...new Set(issues)].slice(0,8);
      };
      try {
        await document.fonts.ready;await delay(120);const initial=layout();
        if(initial.length)throw new Error(initial.join('; '));
        for(const check of checks)for(const step of check.steps) {
          if(step.action==='wait'){await delay(Math.min(3000,Math.max(0,Number(step.value))));continue;}
          const el=document.querySelector(step.selector);if(!el)throw new Error(`${check.name}: missing ${step.selector}`);
          if(step.action==='click')el.click();
          if(step.action==='input'){el.value=step.value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
          if(step.action==='key'){el.dispatchEvent(new KeyboardEvent('keydown',{key:step.value,bubbles:true}));el.dispatchEvent(new KeyboardEvent('keyup',{key:step.value,bubbles:true}));}
          if(step.action==='assertText' && normalize(el.textContent)!==normalize(step.value))throw new Error(`${check.name}: ${step.selector} expected text ${step.value}, got ${normalize(el.textContent).slice(0,120)}`);
          if(step.action==='assertValue' && String(el.value)!==step.value)throw new Error(`${check.name}: ${step.selector} expected value ${step.value}, got ${String(el.value).slice(0,120)}`);
          await delay(30);
        }
        const final=layout();if(final.length)throw new Error(final.join('; '));if(errors.length)throw new Error(errors.join('; '));
        parent.postMessage({type:'widget-validation',token,ok:true,checks:checks.length},'*');
      } catch(error) {parent.postMessage({type:'widget-validation',token,ok:false,error:error.message},'*');}
    },{once:true});
  }
  function probeScript(token,checks) {return `(${probe.toString()})(${JSON.stringify(token)},${JSON.stringify(checks).replace(/</g,'\\u003c')});`;}
  async function offline(manifest,root,size,isolatedHTML,signal) {
    return await new Promise(resolve=>{
      const token=crypto.randomUUID(),frame=document.createElement('iframe');frame.sandbox='allow-scripts';frame.style.cssText='width:100%;height:100%;border:0';
      const finish=result=>{clearTimeout(timeout);window.removeEventListener('message',receive);signal?.removeEventListener('abort',abort);frame.remove();resolve(result);};
      const receive=event=>{if(event.source===frame.contentWindow && event.data?.type==='widget-validation' && event.data.token===token)finish(event.data);};
      const abort=()=>finish({ok:false,error:'Creation cancelled'});
      const timeout=setTimeout(()=>finish({ok:false,error:'The widget did not complete its interaction checks within 30 seconds.'}),30000);
      window.addEventListener('message',receive);signal?.addEventListener('abort',abort,{once:true});
      frame.srcdoc=isolatedHTML(manifest.html,null,probeScript(token,manifest.checks || []));root.append(frame);
    });
  }
  async function validate(manifest,{native,aiSettings,isolatedHTML,requestedSize='auto',onProgress=()=>{},signal,inputValues={}}={}) {
    const issues=[],sizeNotes={},supportedSizes=[];let snapshot,resolvedValues=inputValues;
    const abort=()=>{if(signal?.aborted)throw new Error('Creation cancelled');};
    abort();
    if(!Core.validManifest(manifest))return {ok:false,issues:[failure('manifest','The candidate manifest is invalid.')]};
    const c=manifest.connection,connected=manifest.kind==='connected';
    if(connected) {
      onProgress('Checking the real data source…');
      const values=Object.fromEntries(c.parameters.map(p=>[p.id,inputValues[p.id] ?? (p.type==='date'&&p.value==='today'?new Date().toISOString().slice(0,10):p.value)]));
      resolvedValues=values;
      if(c.parameters.some(p=>!values[p.id]))return {ok:false,blocked:true,issues:[failure('input','This widget needs your input before its connection can be tested.')]};
      try {
        if(c.mode==='browser')await native('validateWidgetWebsite',{url:Core.connectionURL(c.openURL?{...c,url:c.openURL}:c,values)});
        else snapshot=await native('connectedFetch',{id:'validation-'+manifest.id,credentialID:manifest.id,connection:c,values,...aiSettings});
      } catch(error){return {ok:false,blocked:/API key needed|requires access|sign-in|usage|LM Studio|private network/i.test(error.message),issues:[failure('source',error.message)]};}
      abort();
      if(snapshot?.mode==='json') {
        try {if(c.presentation?.type==='activity')Core.activitySeries(snapshot.payload,c,snapshot.retrievedAt,snapshot.hasMore);else Core.dataRows(snapshot.payload,c);}
        catch(error){return {ok:false,issues:[failure('mapping',error.message,{sourceShape:Core.dataShape(snapshot.payload)})]};}
      }
    } else if(!manifest.checks?.length) return {ok:false,issues:[failure('checks','Offline tools must include interaction checks for their primary controls.')]};
    for(const [size,[width,height]] of Object.entries(Core.widgetSizes)) {
      abort();onProgress(`Testing ${size} layout${connected?'':' and interactions'}…`);
      const root=document.createElement('div');root.dataset.widgetSize=size;root.className='validation-widget';root.setAttribute('aria-hidden','true');root.style.cssText=`position:fixed;left:0;top:0;width:${width}px;height:${height}px;opacity:0;pointer-events:none;z-index:-1`;document.body.append(root);
      let errors=[];const cleanups=[];
      try {
        if(connected) {
          const ctx={root,el:root,prefs:{widgetSize:size,connectionValues:resolvedValues},instance:{id:'validation-'+manifest.id},cleanups,save:()=>{},alive:()=>root.isConnected,resize:()=>{},onTheme:()=>{},interval:()=>{}};
          ConnectedWidgets.render(ctx,manifest,{snapshot,skipLoad:true});await document.fonts.ready;await delay(40);errors=layoutIssues(root,width,height);if(c.presentation?.type==='activity' && [...root.querySelectorAll('.activity-day')].some(cell=>{const r=cell.getBoundingClientRect();return Math.abs(r.width-r.height)>1;}))errors.push('Activity cells must remain square.');
        } else {const result=await offline(manifest,root,size,isolatedHTML,signal);if(!result.ok)errors=[result.error];}
      } catch(error){errors=[error.message];}
      finally{cleanups.forEach(fn=>fn());root.remove();}
      if(errors.length)sizeNotes[size]=errors.join('; ');else supportedSizes.push(size);
    }
    abort();
    for(const [size,message] of Object.entries(sizeNotes))issues.push(failure('layout',message,{size}));
    if(!supportedSizes.length)return {ok:false,issues,sizeNotes,supportedSizes,snapshot};
    if(requestedSize!=='auto' && !supportedSizes.includes(requestedSize))issues.push(failure('requested-size',`The requested ${requestedSize} size does not work.`));
    return {ok:issues.length===0,issues,supportedSizes,sizeNotes,snapshot};
  }
  return {validate,probeScript,layoutIssues};
})();
