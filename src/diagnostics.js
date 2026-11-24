window.addEventListener('error',event=>{const target=document.getElementById('modeNote');if(target)target.textContent=`載入錯誤：${event.message}（${event.filename?.split('/').at(-1)||'未知檔案'}）`});
window.addEventListener('unhandledrejection',event=>{const target=document.getElementById('modeNote');if(target)target.textContent=`執行錯誤：${event.reason?.message||event.reason}`});
