const appDiv = document.getElementById('app');
let currentUser = null;

auth.onAuthStateChanged(user => {
    currentUser = user;
    renderHome();
});

function renderHome(){
    appDiv.innerHTML = `
        <h1>Contract & Procurement Discussion Forum</h1>
        <p>This webpage has been created for discussion on Contract Management issues. Choose a category to view discussions or submit your case.</p>
        ${currentUser ? `<p>Welcome, ${currentUser.displayName} <button onclick="logout()">Logout</button></p>` : `<button onclick="login()">Login with Google</button>`}
        <button onclick="showSubmitCase()">Submit Case</button>
        <button onclick="listCases()">View Cases</button>
    `;
}

function login(){
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(alert);
}

function logout(){
    auth.signOut();
}

function showSubmitCase(){
    if(!currentUser){ alert('Please login first'); return; }
    appDiv.innerHTML = `
        <h2>Submit New Case</h2>
        <input id="caseTitle" placeholder="Case Title"><br><br>
        <select id="caseCategory">
            <option value="Pre-Tender">Pre-Tender</option>
            <option value="During Tender">During Tender</option>
            <option value="Post-Tender">Post-Tender</option>
        </select><br><br>
        <textarea id="caseDetails" placeholder="Case Details"></textarea><br><br>
        <button onclick="saveCase()">Save Case</button>
        <button onclick="renderHome()">Cancel</button>
    `;
}

function saveCase(){
    const title = document.getElementById('caseTitle').value;
    const category = document.getElementById('caseCategory').value;
    const details = document.getElementById('caseDetails').value;
    db.collection('cases').add({
        title, category, details,
        ownerUid: currentUser.uid,
        ownerName: currentUser.displayName,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert('Case submitted');
        renderHome();
    }).catch(alert);
}

function listCases(){
    db.collection('cases').orderBy('createdAt', 'desc').get().then(snapshot => {
        let html = '<h2>All Cases</h2>';
        snapshot.forEach(doc => {
            const c = doc.data();
            html += `<div class="case">
                        <h3>${c.title} (${c.category})</h3>
                        <p>${c.details}</p>
                        <small>by ${c.ownerName}</small>
                        ${currentUser && currentUser.uid === c.ownerUid ? `<button onclick="editCase('${doc.id}')">Edit</button>` : ''}
                        <button onclick="viewCase('${doc.id}')">View</button>
                     </div>`;
        });
        html += '<button onclick="renderHome()">Back</button>';
        appDiv.innerHTML = html;
    });
}

function editCase(id){
    db.collection('cases').doc(id).get().then(doc => {
        const c = doc.data();
        appDiv.innerHTML = `
            <h2>Edit Case</h2>
            <input id="caseTitle" value="${c.title}"><br><br>
            <select id="caseCategory">
                <option ${c.category==='Pre-Tender'?'selected':''}>Pre-Tender</option>
                <option ${c.category==='During Tender'?'selected':''}>During Tender</option>
                <option ${c.category==='Post-Tender'?'selected':''}>Post-Tender</option>
            </select><br><br>
            <textarea id="caseDetails">${c.details}</textarea><br><br>
            <button onclick="updateCase('${id}')">Update</button>
            <button onclick="listCases()">Cancel</button>
        `;
    });
}

function updateCase(id){
    const title = document.getElementById('caseTitle').value;
    const category = document.getElementById('caseCategory').value;
    const details = document.getElementById('caseDetails').value;
    db.collection('cases').doc(id).update({
        title, category, details
    }).then(() => {
        alert('Case updated');
        listCases();
    }).catch(alert);
}

function viewCase(id){
    db.collection('cases').doc(id).get().then(doc => {
        const c = doc.data();
        let html = `<h2>${c.title}</h2>
                    <p>${c.details}</p>
                    <small>by ${c.ownerName}</small><br><br>`;
        html += `<h3>Comments</h3>`;
        db.collection('cases').doc(id).collection('comments').orderBy('createdAt').get().then(comments => {
            comments.forEach(cm => {
                const d = cm.data();
                html += `<div class="comment"><p>${d.text}</p><small>by ${d.authorName}</small></div>`;
            });
            if(currentUser){
                html += `<textarea id="commentText" placeholder="Write a comment"></textarea><br>
                         <button onclick="addComment('${id}')">Add Comment</button>`;
            } else {
                html += `<p>Login to comment</p>`;
            }
            html += `<br><button onclick="listCases()">Back to Cases</button>`;
            appDiv.innerHTML = html;
        });
    });
}

function addComment(caseId){
    const text = document.getElementById('commentText').value;
    db.collection('cases').doc(caseId).collection('comments').add({
        text,
        authorUid: currentUser.uid,
        authorName: currentUser.displayName,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        viewCase(caseId);
    }).catch(alert);
}

renderHome();
