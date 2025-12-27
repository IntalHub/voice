const logBox = document.getElementById("log");
const micBtn = document.getElementById("mic");
const callBtn = document.getElementById("call");
const answerBtn = document.getElementById("answer");
const peerInput = document.getElementById("peerId");
const myIdBox = document.getElementById("myId");
const audio = document.getElementById("audio");
const micMeter = document.getElementById("micMeter");
const remoteMeter = document.getElementById("remoteMeter");

function log(msg){const div=document.createElement("div");div.textContent="> "+msg;logBox.appendChild(div);logBox.scrollTop=logBox.scrollHeight;console.log(msg);}

log("Запуск приложения");

const peer = new Peer();
let localStream = null;
let activeCall = null;
let analyser = null;
let remoteAnalyser = null;

peer.on("open", id=>{
  log("PeerJS открыт, ID: "+id);
  myIdBox.textContent = id;
  myIdBox.onclick=()=>{navigator.clipboard.writeText(id);log("ID скопирован");};
  // Автоподключение по ?id=xxx
  const params=new URLSearchParams(window.location.search);
  const autoId=params.get("id");
  if(autoId){peerInput.value=autoId;log("Автоподключение к "+autoId);}
});

peer.on("error", e=>log("PeerJS ERROR: "+e.type));

micBtn.onclick=async()=>{
  try{
    log("Запрос микрофона...");
    localStream=await navigator.mediaDevices.getUserMedia({audio:true});
    log("Микрофон получен, трек: "+localStream.getAudioTracks()[0].label);
    micBtn.textContent="Микрофон включён";micBtn.style.background="#3bb273";
    setupLocalMeter(localStream);
  }catch(e){log("Ошибка микрофона: "+e);}
};

callBtn.onclick=()=>{makeCall(peerInput.value);};
answerBtn.onclick=()=>{if(activeCall){log("Звонок уже активен");return;}if(peerInput.value){makeCall(peerInput.value);}}
function makeCall(id){
  if(!localStream){log("Сначала включи микрофон");return;}
  if(!id){log("ID друга пустой");return;}
  log("Исходящий звонок: "+id);
  activeCall=peer.call(id, localStream);
  setupCall(activeCall);
}

peer.on("call", call=>{
  if(activeCall){log("Звонок уже есть, игнор");return;}
  log("Входящий звонок");
  activeCall=call;
  if(localStream){call.answer(localStream);}
  setupCall(call);
});

function setupCall(call){
  call.on("stream", async stream=>{
    log("Получен stream, треков: "+stream.getAudioTracks().length);
    audio.srcObject=stream;audio.muted=false;audio.volume=1;
    setupRemoteMeter(stream);
    try{await audio.play();log("audio.play OK");}catch(e){log("audio.play BLOCKED");}
  });
  call.on("close", ()=>{log("Звонок завершён");activeCall=null;remoteMeter.style.width="0%";});
  call.on("error", e=>log("CALL ERROR: "+e));
}

// Метр громкости микрофона
function setupLocalMeter(stream){
  const audioCtx=new AudioContext();
  const source=audioCtx.createMediaStreamSource(stream);
  analyser=audioCtx.createAnalyser();
  source.connect(analyser);
  analyser.fftSize=256;
  const data=new Uint8Array(analyser.frequencyBinCount);
  function update(){if(!analyser)return;analyser.getByteFrequencyData(data);let avg=data.reduce((a,b)=>a+b,0)/data.length;micMeter.style.width=Math.min(100,(avg/128*100))+"%";requestAnimationFrame(update);}
  update();
}

// Метр входящего потока
function setupRemoteMeter(stream){
  const audioCtx=new AudioContext();
  const source=audioCtx.createMediaStreamSource(stream);
  remoteAnalyser=audioCtx.createAnalyser();
  source.connect(remoteAnalyser);
  remoteAnalyser.fftSize=256;
  const data=new Uint8Array(remoteAnalyser.frequencyBinCount);
  function update(){if(!remoteAnalyser)return;remoteAnalyser.getByteFrequencyData(data);let avg=data.reduce((a,b)=>a+b,0)/data.length;remoteMeter.style.width=Math.min(100,(avg/128*100))+"%";requestAnimationFrame(update);}
  update();
}
