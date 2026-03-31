window._supabaseSDKReady=null;
  function _loadSupabaseSDK() {
    if(window._supabaseSDKReady)return window._supabaseSDKReady;
    window._supabaseSDKReady=new Promise((resolve,reject)=>{if(window.supabase){resolve();return;}const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';s.async=true;s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});
    return window._supabaseSDKReady;

  }
  _loadSupabaseSDK();