'use strict';
(function(root){
  function cancelled(signal){if(signal?.aborted)throw new Error('Creation cancelled');}
  async function interruptible(promise,signal){
    if(!signal)return promise;cancelled(signal);let abort;
    try{return await Promise.race([promise,new Promise((_,reject)=>{abort=()=>reject(new Error('Creation cancelled'));signal.addEventListener('abort',abort,{once:true});})]);}
    finally{signal.removeEventListener('abort',abort);}
  }
  async function build({prompt,requestedSize='auto',generate,validate,onProgress=()=>{},signal,initialCandidate=null,maxAttempts=6,deadlineMs=720000}) {
    const started=Date.now(),history=[];let candidate=initialCandidate,best=null,repair='',latest;
    const needsActivity=/heat\s*map|green\s+squares?|activity\s+grid|contribution\s+(?:grid|calendar)/i.test(prompt);
    for(let attempt=1;attempt<=maxAttempts && Date.now()-started<deadlineMs;attempt++) {
      cancelled(signal);
      try {
        if(!(attempt===1 && candidate)) {
          onProgress(`${attempt===1?'Building':'Repairing'} your widget · attempt ${attempt} of ${maxAttempts}…`);
          candidate=await interruptible(generate({prompt,size:requestedSize,repair,attempt}),signal);
        }
        cancelled(signal);
        latest=needsActivity && candidate.connection?.presentation?.type!=='activity'
          ? {ok:false,issues:[{code:'requested-feature',message:'The requested green-square activity grid is missing. Use a real dated-count API and the activity presentation; do not replace it with records or a browser link.'}]}
          : await interruptible(validate(candidate,{onProgress:message=>onProgress(`${message} · attempt ${attempt} of ${maxAttempts}`),signal,requestedSize}),signal);
        if(latest.ok)return {status:'ready',candidate,validation:latest,attempts:attempt,history};
        history.push({attempt,issues:latest.issues});
        if(latest.blocked)return {status:'blocked',candidate,validation:latest,attempts:attempt,history};
        if(latest.supportedSizes?.length && latest.issues.every(issue=>['layout','requested-size'].includes(issue.code)) && (!best || latest.supportedSizes.length>best.validation.supportedSizes.length))best={candidate,validation:latest,attempts:attempt};
        repair=JSON.stringify({originalRequest:prompt,previousCandidate:candidate,failures:latest.issues,passedSizes:latest.supportedSizes || [],previousFailures:history.slice(-3),instruction:'Fix these actual host test failures. Keep the requested purpose and controls. Provide responsive layouts for all three sizes. Never invent missing data or remove a requested visualization to pass.'});
      } catch(error) {
        cancelled(signal);latest={ok:false,issues:[{code:'generation',message:error.message}]};history.push({attempt,issues:latest.issues});
        if(/sign-in|usage limit|not found|install.*sign in|server is running|API key needed/i.test(error.message))return {status:'blocked',candidate,validation:latest,attempts:attempt,history};
        repair=JSON.stringify({originalRequest:prompt,failures:latest.issues,previousFailures:history.slice(-3)});
      }
    }
    if(best && (requestedSize==='auto' || best.validation.supportedSizes.includes(requestedSize)))return {status:'limited',...best,history};
    return {status:'exhausted',candidate,validation:latest,attempts:history.length,history};
  }
  const api={build};root.WidgetCreation=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis==='undefined'?this:globalThis);
