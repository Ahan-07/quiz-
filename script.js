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
// remove duplicate questions by text (case-insensitive)
let deduped=[];
let seen=new Set();
allQ.forEach(q=>{
	let key=(q.q||'').toString().trim().toLowerCase();
	if(!seen.has(key)){
		seen.add(key);
		deduped.push(q);
	}
});
let filtered=deduped;
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

// try to reorder selected so no two consecutive questions share the same topic
function interleaveByTopic(arr){
	let buckets={};
	arr.forEach(q=>{ if(!buckets[q.topic]) buckets[q.topic]=[]; buckets[q.topic].push(q); });
	// sort topics by remaining count when choosing
	let result=[];
	let last=null;
	while(true){
		let candidates=Object.keys(buckets).filter(t=>buckets[t].length>0 && t!==last);
		if(candidates.length===0) break;
		candidates.sort((a,b)=>buckets[b].length-buckets[a].length);
		let pick=candidates[0];
		result.push(buckets[pick].shift());
		last=pick;
	}
	// append any leftovers
	Object.keys(buckets).forEach(t=>{ while(buckets[t] && buckets[t].length) result.push(buckets[t].shift()); });
	return result;
}

selected = interleaveByTopic(selected);

// try to avoid consecutive questions of the same type (mcq/long/quiz/etc.)
for(let i=1;i<selected.length;i++){
	if(selected[i].type===selected[i-1].type){
		// find a later item with a different type to swap in
		let swapIdx=-1;
		for(let j=i+1;j<selected.length;j++){
			if(selected[j].type!==selected[i-1].type && selected[j].topic!==selected[i-1].topic){
				swapIdx=j; break;
			}

			// Shuffle options for MCQ questions and fix the answer index so the correct
			// option is preserved but not always at index 0.
			function shuffleMCQOptions(arr){
				arr.forEach(q=>{
					if(q.type==='mcq' && Array.isArray(q.options) && typeof q.answer==='number'){
						let correctText=q.options[q.answer];
						// shuffle options copy
						let opts=q.options.slice();
						for(let i=opts.length-1;i>0;i--){
							let j=Math.floor(Math.random()*(i+1));
							[opts[i],opts[j]]=[opts[j],opts[i]];
						}
						q.options=opts;
						q.answer=opts.indexOf(correctText);
					}
				});
			}

			shuffleMCQOptions(selected);
		}
		// fallback: find any with different type
		if(swapIdx===-1){
			for(let j=i+1;j<selected.length;j++){
				if(selected[j].type!==selected[i-1].type){ swapIdx=j; break; }
			}
		}
		if(swapIdx>-1){
			[selected[i], selected[swapIdx]] = [selected[swapIdx], selected[i]];
		}
	}
}
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
// For long/quiz types show the answer directly and remove submission UI
document.getElementById("navButtons").style.display="flex";
document.getElementById("longAns").value="";
document.getElementById("longAns").style.display="none";
let submitBtn=document.querySelector(".submit-btn");
if(submitBtn) submitBtn.style.display='none';
// mark as answered to prevent submission attempts
answered=true;
// display the canonical answer immediately
if(q.answer){
	document.getElementById("answerBox").style.display="block";
	document.getElementById("answerText").innerText=q.answer;
} else if(q.keywords){
	document.getElementById("answerBox").style.display="block";
	document.getElementById("answerText").innerText="Keywords: "+q.keywords.join(', ');
}
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
