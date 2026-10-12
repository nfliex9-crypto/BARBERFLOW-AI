(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const message = (text, error=false) => {
    const n=$('message');n.className='notice'+(error?' error':'');n.textContent=text;
  };
  async function api(path, options={}) {
    const r=await fetch(path,{credentials:'same-origin',...options});
    let j={};try{j=await r.json();}catch{}
    if(!r.ok)throw new Error(typeof j.detail==='string'?j.detail:'Er is iets misgegaan');
    return j;
  }
  async function refresh(){
    let installed=false;
    try{
      const publicInfo=await api('/api/nizo/site');
      installed=publicInfo.configured;
      if(!installed){
        $('setup-panel').hidden=false;
        $('publish-panel').hidden=true;
        message('Nog geen eigenaar geactiveerd. Gebruik de privé setup-code om een beheeraccount aan te maken.');
        return;
      }
    }catch(error){message(error.message,true);return;}
    $('setup-panel').hidden=true;
    try{
      const info=await api('/api/nizo/admin');
      $('publish-panel').hidden=false;
      message(info.published?'WEBSITE ACTIEF: klanten kunnen afspraken aanvragen.':'PREVIEW: het publiek kan nog geen afspraken aanvragen.');
    }catch(error){
      $('publish-panel').hidden=true;
      message('De website heeft al een beheerder. Meld je aan bij BarberFlow om de website te beheren. Alleen de eigenaar heeft toegang. '+error.message,true);
    }
  }
  $('setup-form').addEventListener('submit',async e=>{
    e.preventDefault();
    try{
      await api('/api/nizo/setup',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          setup_code:$('code').value,owner_name:$('owner').value,
          email:$('email').value,password:$('password').value
        })
      });
      $('code').value='';$('password').value='';
      await refresh();
    }catch(error){message(error.message,true);}
  });
  $('publish-form').addEventListener('submit',async e=>{
    e.preventDefault();
    try{
      const result=await api('/api/nizo/publish',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          business_permission:$('approve-business').checked,
          services_checked:$('approve-services').checked,
          opening_hours_checked:$('approve-hours').checked,
          privacy_notice_checked:$('approve-privacy').checked,
          enable:true
        })
      });
      message(result.published?'Website geactiveerd. Online aanvragen wachten nog op jouw bevestiging.':'Website blijft in preview.');
      await refresh();
    }catch(error){message(error.message,true);}
  });
  $('unpublish-button').addEventListener('click',async()=>{
    try{
      await api('/api/nizo/publish',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          business_permission:false,services_checked:false,opening_hours_checked:false,
          privacy_notice_checked:false,enable:false
        })
      });
      await refresh();
    }catch(error){message(error.message,true);}
  });
  refresh();
})();