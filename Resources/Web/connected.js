'use strict';
const ConnectedWidgets = (() => {
  const e=Core.escape;
  const localDate=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);};
  const sizes = (selected, original) => `<select class="classic-select custom-size" aria-label="Widget size">${original?`<option value="original" ${selected==='original'?'selected':''}>Original · ${original.width} × ${original.height}</option>`:''}${Object.entries(Core.widgetSizes).map(([key,[w,h]])=>`<option value="${key}" ${key===selected?'selected':''}>${key[0].toUpperCase()+key.slice(1)} · ${w} × ${h}</option>`).join('')}</select>`;
  function fit(ctx,def,animated=false) {
    const size=ctx.prefs.widgetSize || def.size || 'original', dimensions=Core.widgetSizes[size] || [def.width,def.height];
    ctx.root.dataset.widgetSize=size; ctx.resize(...dimensions,animated);
  }
  function render(ctx,def) {
    const c={...def.connection}; if(c.mode!=='json' && ['agent','browser'].includes(ctx.prefs.connectionMode)) c.mode=ctx.prefs.connectionMode; if(!Core.validConnection(c)) throw new Error('This widget needs a working data source.');
    const values=ctx.prefs.connectionValues ||= Object.fromEntries(c.parameters.map(p=>[p.id,p.value==='today'&&p.type==='date'?localDate():p.value]));
    ctx.el.innerHTML=`<div class="connected-face connection-${c.mode}"><h2>${e(def.name)}</h2><form class="connection-inputs">${c.parameters.map(p=>`<label>${e(p.label)}<input data-parameter="${e(p.id)}" aria-label="${e(p.label)}" type="${p.type}" value="${e(values[p.id]??p.value)}" maxlength="256" required ${p.type==='number'?'step="any"':''}></label>`).join('')}<button type="submit" hidden>Update</button></form><div class="connection-results" aria-live="polite" data-no-drag></div><div class="connection-actions"><button class="silver-button connection-refresh" ${c.mode==='browser'?'hidden':''}>${c.mode==='agent'?'Check web':'Refresh'}</button>${c.auth?'<button class="silver-button connection-key">Connect</button>':''}<button class="silver-button connection-open">${e(c.actionLabel || 'Open Website')}</button><button class="silver-button connection-cancel" hidden>Cancel</button></div><div class="connection-status" role="status"></div></div>`;
    const results=ctx.el.querySelector('.connection-results'),status=ctx.el.querySelector('.connection-status'),refresh=ctx.el.querySelector('.connection-refresh'),cancel=ctx.el.querySelector('.connection-cancel');
    let request=0,busy=false;
    const sourceURL=()=>Core.connectionURL(c,values);
    const empty=()=>{results.textContent=c.mode==='browser'?'Continue on the website for current availability and checkout.':c.mode==='agent'?'Check the source for current information, or open the website.':c.auth?'Connect your API key to load this widget.':'Ready to load from the source.'; status.textContent=new URL(sourceURL()).hostname;};
    const invalidate=()=>{request++; if(busy) Dashboard.native('connectedCancel',{id:ctx.instance.id}).catch(()=>{}); busy=false;refresh.disabled=false;cancel.hidden=true;delete ctx.prefs.connectionSnapshot;ctx.save();empty();};
    ctx.el.querySelectorAll('[data-parameter]').forEach(input=>input.oninput=()=>{values[input.dataset.parameter]=input.value;invalidate();});
    const display=snapshot=>{
      if(snapshot.mode==='json') results.innerHTML=Core.dataRows(snapshot.payload,c).map(row=>`<div class="connection-record">${row.map(field=>`<div class="connection-value">${field.label?`<span>${e(field.label)}</span>`:''}<strong>${e(field.value.slice(0,5000))}</strong></div>`).join('')}</div>`).join('') || 'The source returned no results.';
      else if(snapshot.mode==='agent') { results.innerHTML=snapshot.items.map((item,index)=>`<button class="source-excerpt" data-excerpt="${index}"><span>${e(item.text)}</span><small>${e(new URL(item.url).hostname)}</small></button>`).join('');results.querySelectorAll('[data-excerpt]').forEach(button=>button.onclick=()=>Dashboard.open(snapshot.items[Number(button.dataset.excerpt)].url)); }
      const age=Date.now()-Date.parse(snapshot.retrievedAt), label=age>900000?'Saved result':'Retrieved';
      status.textContent=`${label} ${new Date(snapshot.retrievedAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})} · ${new URL(snapshot.source).hostname}`;
      status.title=`${snapshot.source}\n${snapshot.retrievedAt}`;
    };
    const load=async(manual=false)=>{
      if(busy || c.mode==='browser')return;
      const form=ctx.el.querySelector('form');if(!form.checkValidity()){if(manual)form.reportValidity();return;}
      const id=++request;busy=true;refresh.disabled=true;cancel.hidden=c.mode!=='agent';
      results.textContent=c.mode==='agent'?'Checking the web and verifying sources…':'Loading from the API…';status.textContent=new URL(sourceURL()).hostname;
      try {const snapshot=await Dashboard.native('connectedFetch',{id:ctx.instance.id,credentialID:def.id,connection:c,values:{...values},...Dashboard.aiSettings()});if(!ctx.alive()||id!==request)return;display(snapshot);if(JSON.stringify(snapshot).length<=200000)ctx.prefs.connectionSnapshot=snapshot;else delete ctx.prefs.connectionSnapshot;ctx.save();}
      catch(error){if(ctx.alive()&&id===request){delete ctx.prefs.connectionSnapshot;results.textContent=error.message;status.textContent='Data unavailable · '+new URL(sourceURL()).hostname;ctx.save();}}
      finally{if(id===request){busy=false;refresh.disabled=false;cancel.hidden=true;}}
    };
    refresh.title=c.mode==='agent'?'Check sources using '+(Dashboard.aiSettings().provider==='claude'?'Claude Code':Dashboard.aiSettings().provider==='lmstudio'?'Codex or Claude Code (choose in Settings)':'Codex'):'Refresh from the API';refresh.onclick=()=>load(true);ctx.el.querySelector('form').onsubmit=event=>{event.preventDefault();if(c.mode==='browser')ctx.el.querySelector('.connection-open').click();else load(true);};
    cancel.onclick=()=>{invalidate();status.textContent='Check cancelled';};
    ctx.el.querySelector('.connection-open').onclick=()=>{if(!ctx.el.querySelector('form').reportValidity())return;try{Dashboard.open(sourceURL());}catch(error){status.textContent=error.message;}};
    ctx.el.querySelector('.connection-key')?.addEventListener('click',async()=>{try{if(await Dashboard.native('connectedKey',{id:def.id,connection:c}))load(true);}catch(error){status.textContent=error.message;}});
    ctx.cleanups.push(()=>{request++;if(busy)Dashboard.native('connectedCancel',{id:ctx.instance.id}).catch(()=>{});});
    empty();if(ctx.prefs.connectionSnapshot){try{display(ctx.prefs.connectionSnapshot);}catch{delete ctx.prefs.connectionSnapshot;}}
    // Web/agent checks are explicit, so opening Dashboard never spends an LLM request.
    if(c.mode==='json'&&!c.auth){load();ctx.interval(load,900000);}
    fit(ctx,def);ctx.onTheme(()=>fit(ctx,def));
    return {load};
  }
  const fandango={version:2,name:'Fandango Tickets',kind:'connected',size:'medium',width:348,height:170,html:'<!doctype html><html></html>',connection:{mode:'browser',url:'https://www.fandango.com/{zip}_movietimes?date={date}',query:'Find current movie showtimes and theater ticket links for the selected ZIP code and date. Do not infer showtimes, availability or prices.',itemsPath:'',fields:[],parameters:[{id:'zip',label:'ZIP code',type:'text',value:''},{id:'date',label:'Date',type:'date',value:'today'}],auth:null,actionLabel:'Find tickets'}};
  return {render,fit,sizes,fandango};
})();
