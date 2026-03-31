const BELL_MIN_INTERVAL_MS=15*60*1000;
  const BELL_REMINDER_MS=25*60*1000;
  let lastBellTime=0;
  let bellReminderTimer=null;
  function playBell() {
    const now=Date.now();
    lastBellTime=now;
    try {
      localStorage.setItem('lastBellTime',now);

    }
    catch(e) {

    }
    const audio=document.getElementById('bellAudio');
    if(!audio)return;
    audio.currentTime=0;
    const p=audio.play();
    if(p&&p.catch)p.catch(()=>{});
    scheduleBellReminder();

  }
  function scheduleBellReminder() {
    clearTimeout(bellReminderTimer);
    bellReminderTimer=setTimeout(function tickReminder(){if(!document.hidden&&state.currentScreen==='game'){const now=Date.now();if(now-lastBellTime>=BELL_MIN_INTERVAL_MS){lastBellTime=now;try{localStorage.setItem('lastBellTime',now);}catch(e){}const audio=document.getElementById('bellAudio');if(audio){audio.currentTime=0;const p=audio.play();if(p&&p.catch)p.catch(()=>{});}}}if(state.currentScreen==='game'){bellReminderTimer=setTimeout(tickReminder,BELL_REMINDER_MS);}else{bellReminderTimer=null;}},BELL_REMINDER_MS);

  }
  try {
    const stored=localStorage.getItem('lastBellTime');
    if(stored)lastBellTime=parseInt(stored)||0;

  }
  catch(e) {

  }