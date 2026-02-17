let data=[];
let quiz=[];
let index=0;
let score=0;
let weak={};

fetch("question.json")
.then(res=>res.json())
.then(q=>{
data=q;
quiz=shuffle(data).slice(0,100);
loadQ();
});

function shuffle(a){
return a.sort(()=>0.5-Math.random());
}

function loadQ(){
let q=quiz[index];
document.getElementById("topic").innerText="Topic: "+q.topic;
document.getElementById("question").innerText=q.q;

if(q.type==="mcq"){
document.getElementById("longDiv").style.display="none";
let html="";
q.options.forEach((o,i)=>{
html+=`<div class='option' onclick='check(${i})'>${o}</div>`;
});
document.getElementById("mcq").innerHTML=html;
}else{
document.getElementById("mcq").innerHTML="";
document.getElementById("longDiv").style.display="block";
}
}

function check(i){
let q=quiz[index];
if(i===q.answer){
score++;
}else{
weak[q.topic]=(weak[q.topic]||0)+1;
}
show();
}

function checkLong(){
let q=quiz[index];
let ans=document.getElementById("longAns").value.toLowerCase();
let marks=0;

q.keywords.forEach(k=>{
if(ans.includes(k)) marks++;
});

if(marks>=2) score++;
else weak[q.topic]=(weak[q.topic]||0)+1;

show();
}

function show(){
document.getElementById("score").innerText="Score: "+score;

let w=Object.keys(weak).reduce((a,b)=>weak[a]>weak[b]?a:b,"None");
document.getElementById("weak").innerText="Weakest Topic: "+w;
}

function nextQ(){
index++;
if(index>=quiz.length){
alert("Test Finished!");
index=0;
score=0;
quiz=shuffle(data).slice(0,100);
}
loadQ();
}
