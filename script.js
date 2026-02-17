let data=[];
let quiz=[];
let index=0;
let score=0;
let weak={};
let answered=false;
let autoAdvanceTimer=null;
let weightage={};
let selectedType="mixed";

fetch("question.json")
.then(res=>res.json())
.then(q=>{
data=q;
});

function selectType(type){
selectedType=type;
document.querySelectorAll('.choice-card').forEach(c=>c.classList.remove('selected'));
event.target.closest('.choice-card').classList.add('selected');
document.getElementById('startBtn').disabled=false;
}

function startQuiz(){
quiz=buildSmartQuiz(data,selectedType);
document.getElementById('setupScreen').style.display='none';
document.getElementById('quizScreen').style.display='block';
loadQ();
}

function buildSmartQuiz(allQ,type){
let filtered=allQ;
if(type==='mcq'){
filtered=allQ.filter(q=>q.type==='mcq');
}else if(type==='quiz'){
filtered=allQ.filter(q=>q.type==='quiz');
}else if(type==='balanced'){
let mcqs=allQ.filter(q=>q.type==='mcq');
let quizzes=allQ.filter(q=>q.type==='quiz');
let selected=[];
for(let i=0;i<25;i++){
if(i<mcqs.length) selected.push(mcqs[i]);
}
for(let i=0;i<25;i++){
if(i<quizzes.length) selected.push(quizzes[i]);
}
filtered=selected;
}
let selected=shuffle(filtered).slice(0,50);
let topicMap={};
selected.forEach(q=>{ topicMap[q.topic]=(topicMap[q.topic]||0)+1; });
selected.forEach(q=>{ weightage[q.topic]=0; });
return selected;
}

function shuffle(a){
return a.sort(()=>0.5-Math.random());
}

function loadQ(){
answered=false;
document.getElementById("mcq").innerHTML="";
document.getElementById("messageDisplay").innerHTML="";
document.getElementById("autoAdvanceMsg").style.display="none";
document.getElementById("answerBox").style.display="none";
document.getElementById("navButtons").style.display="none";
clearTimeout(autoAdvanceTimer);

let q=quiz[index];
document.getElementById("topic").innerText=q.topic;
document.getElementById("question").innerText=q.q;

let progress=((index+1)/quiz.length)*100;
document.getElementById("progressFill").style.width=progress+"%";
document.getElementById("progressText").innerText=`Question ${index+1} of ${quiz.length}`;

if(q.type==="mcq"){
document.getElementById("longDiv").style.display="none";
let html="";
q.options.forEach((o,i)=>{
html+=`<div class='option' onclick='check(${i})' id='opt${i}'>${o}</div>`;
});
document.getElementById("mcq").innerHTML=html;
}else{
document.getElementById("mcq").innerHTML="";
document.getElementById("longDiv").style.display="block";
document.getElementById("navButtons").style.display="flex";
document.getElementById("longAns").value="";
document.getElementById("longAns").disabled=false;
document.querySelector(".submit-btn").disabled=false;
document.getElementById("prevBtn").disabled=(index===0);
}

updateStats();
}

function check(i){
if(answered) return;
answered=true;

let q=quiz[index];
let options=document.querySelectorAll('.option');
options.forEach(o=>o.classList.add('disabled'));

if(i===q.answer){
score++;
document.getElementById(`opt${i}`).classList.add('correct');
showMessage('✅ Correct!','correct');
}else{
weak[q.topic]=(weak[q.topic]||0)+1;
document.getElementById(`opt${i}`).classList.add('incorrect');
document.getElementById(`opt${q.answer}`).classList.add('correct');
showMessage('❌ Incorrect! The correct answer is: '+q.options[q.answer],'incorrect');
}

updateStats();
autoAdvance();
}

function checkLong(){
if(answered) return;
answered=true;

let q=quiz[index];
let ans=document.getElementById("longAns").value.toLowerCase();
let marks=0;

if(q.keywords){
q.keywords.forEach(k=>{
if(ans.includes(k)) marks++;
});
}else if(q.answer){
let keywords=q.answer.toLowerCase().split(/\s+/).filter(w=>w.length>4);
let matchCount=keywords.filter(k=>ans.includes(k)).length;
marks=Math.min(matchCount,3);
}

if(marks>=2){
score++;
showMessage('✅ Good Answer!','correct');
}else{
weak[q.topic]=(weak[q.topic]||0)+1;
showMessage('❌ Incorrect or incomplete answer!','incorrect');
}

document.getElementById("longAns").disabled=true;
document.querySelector('.submit-btn').disabled=true;
showAnswer();
updateStats();
}

function showAnswer(){
let q=quiz[index];
document.getElementById("answerBox").style.display="block";
document.getElementById("answerText").innerText=q.answer;
}

function showMessage(msg,type){
let div=document.createElement('div');
div.className='message '+type;
div.innerText=msg;
document.getElementById("messageDisplay").appendChild(div);
}

function updateStats(){
document.getElementById("score").innerText=score;

if(Object.keys(weak).length>0){
let w=Object.keys(weak).reduce((a,b)=>weak[a]>weak[b]?a:b);
document.getElementById("weakTopic").innerText=w+" ("+weak[w]+")";
}else{
document.getElementById("weakTopic").innerText="-";
}
}

function autoAdvance(){
let q=quiz[index];
if(q.type==="mcq"){
let msg=document.getElementById("autoAdvanceMsg");
msg.style.display="block";
let countdown=3;
document.getElementById("countdown").innerText=countdown;

let counter=setInterval(()=>{
countdown--;
if(countdown>0){
document.getElementById("countdown").innerText=countdown;
}else{
clearInterval(counter);
nextQ();
}
},1000);

autoAdvanceTimer=counter;
}else{
document.getElementById("navButtons").style.display="flex";
}
}

function nextQ(){
clearTimeout(autoAdvanceTimer);
index++;

if(index>=quiz.length){
showFinalResults();
return;
}

if(Object.keys(weak).length>0){
let weakTopic=Object.keys(weak).sort((a,b)=>weak[b]-weak[a])[0];
let weakQuestions=quiz.filter(q=>q.topic===weakTopic);
if(weakQuestions.length>0){
let wq=weakQuestions[Math.floor(Math.random()*weakQuestions.length)];
let wIdx=quiz.indexOf(wq);
if(wIdx>-1 && wIdx!==index){
[quiz[index],quiz[wIdx]]=[quiz[wIdx],quiz[index]];
}
}
}

loadQ();
}

function prevQ(){
if(index>0){
index--;
loadQ();
}
}

function showFinalResults(){
let threshold=2;
let weakTopics=Object.entries(weak)
.filter(([topic,count])=>count>=threshold)
.sort((a,b)=>b[1]-a[1]);

let message="🎉 Test Finished!\n\n📊 Final Score: "+score+"/"+quiz.length+"\n";

if(weakTopics.length>0){
message+="\n⚠️ Weak Areas (Threshold: "+threshold+" errors):\n";
weakTopics.forEach(([t,c])=>{ message+=`  • ${t}: ${c} errors\n`; });
}else{
message+="✅ No weak areas identified!";
}

alert(message);

restartQuiz();
}

function restartQuiz(){
index=0;
score=0;
weak={};
weightage={};
selectedType="mixed";
document.querySelectorAll('.choice-card').forEach(c=>c.classList.remove('selected'));
document.getElementById('startBtn').disabled=true;
document.getElementById('setupScreen').style.display='block';
document.getElementById('quizScreen').style.display='none';
}
