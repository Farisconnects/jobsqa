// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBzPWXAJVsmFNSxDmS-YLloJiquPQipH0o",
  authDomain: "jobsqa.firebaseapp.com",
  projectId: "jobsqa",
  storageBucket: "jobsqa.appspot.com",
  messagingSenderId: "359475354641",
  appId: "1:359475354641:web:yourappid"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Admin email
const ADMIN_EMAIL = "farisbinrafeeque3@gmail.com";
let isAdmin = false;

// Sign in silently (your PC only)
auth.signInWithEmailAndPassword(ADMIN_EMAIL, "YourStrongPassword")
  .then(()=>console.log("Admin signed in"))
  .catch(err=>console.log("Admin sign-in error:", err));

// Track admin login state
auth.onAuthStateChanged(user=>{
    if(user && user.email === ADMIN_EMAIL) isAdmin = true;
});

// DOM elements
const jobsContainer = document.getElementById('jobs-container');
const jobForm = document.getElementById('jobForm');
const searchInput = document.getElementById('searchInput');
const categoryFiltersContainer = document.getElementById('categoryFilters');

// Create job card
function createJobCard(job){
    const jobCard = document.createElement('div');
    jobCard.classList.add('job-card');

    // Highlight new post (<10s old)
    if(Date.now() - job.timestamp < 10000){
        jobCard.classList.add('new-post');
        setTimeout(()=>jobCard.classList.remove('new-post'), 3000);
    }

    const imageHTML = job.logo ? `<img src="${job.logo}" alt="Job Image">` : '';
    const tagsHTML = job.category?.length ? `<p>${job.category.map(c=>`<span class="job-tag ${c}">${c}</span>`).join(' ')}</p>` : '';
    const infoHTML = `<div class="job-info">
        ${job.title ? `<p><strong>Position:</strong> ${job.title}</p>` : ''}
        ${job.description ? `<p><strong>Description:</strong> ${job.description}</p>` : ''}
        ${job.salary ? `<p class="salary">Salary: ${job.salary}</p>` : ''}
        ${job.location ? `<p class="location">Location: ${job.location}</p>` : ''}
        ${job.company ? `<p class="company">Company: ${job.company}</p>` : ''}
        ${job.contactEmail ? `<p>Email: <a href="mailto:${job.contactEmail}">${job.contactEmail}</a></p>` : ''}
        ${job.contactWhatsApp ? `<p>WhatsApp: <a href="https://wa.me/${job.contactWhatsApp}" target="_blank">${job.contactWhatsApp}</a></p>` : ''}
        ${tagsHTML}
    </div>`;

    const currentURL = window.location.href;
    const text = encodeURIComponent(`${job.title || ''} at ${job.company || ''}`);
    const shareHTML = `<div class="share-buttons">
        <a href="https://wa.me/?text=${text}%20${currentURL}" target="_blank">Share WhatsApp</a> |
        <a href="mailto:?subject=${text}&body=${currentURL}">Share Email</a> |
        <a href="#" class="copy-link">Copy Link</a>
    </div>`;

    jobCard.innerHTML = `${imageHTML}${infoHTML}${shareHTML}`;

    // Copy link
    jobCard.querySelector('.copy-link')?.addEventListener('click', e=>{
        e.preventDefault();
        navigator.clipboard.writeText(currentURL).then(()=>alert("Link copied!"));
    });

    // Admin delete
    if(isAdmin){
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = "Delete";
        deleteBtn.classList.add('delete-btn');
        deleteBtn.addEventListener('click', async ()=>{
            if(confirm("Delete this post?")){
                await db.collection('jobs').doc(job.id).delete();
            }
        });
        jobCard.querySelector('.share-buttons').appendChild(deleteBtn);
    }

    return jobCard;
}

// Display jobs - real-time
function displayJobs(filterCategory="All", searchText=""){
    db.collection('jobs').orderBy('timestamp','desc').onSnapshot(snapshot=>{
        jobsContainer.innerHTML = '';
        const allCategories = new Set();

        snapshot.forEach(doc=>{
            const job = doc.data();
            job.id = doc.id;

            // Auto-hide after 15 days
            if((Date.now()-job.timestamp)/(1000*60*60*24) > 15) return;

            // Collect categories
            job.category?.forEach(c=>allCategories.add(c));

            // Filter
            if(filterCategory !== "All" && (!job.category || !job.category.includes(filterCategory))) return;
            const search = searchText.toLowerCase();
            if(search && !(
                (job.title?.toLowerCase().includes(search)) ||
                (job.location?.toLowerCase().includes(search)) ||
                (job.category?.some(c=>c.toLowerCase().includes(search)))
            )) return;

            jobsContainer.appendChild(createJobCard(job));
        });

        // Update category filters
        const categories = ["All", ...allCategories];
        categoryFiltersContainer.innerHTML = '';
        categories.forEach(cat=>{
            const btn = document.createElement('button');
            btn.classList.add('filter-btn');
            btn.textContent = cat;
            btn.dataset.category = cat;
            categoryFiltersContainer.appendChild(btn);
            btn.addEventListener('click', ()=>{
                document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
                btn.classList.add('active');
                displayJobs(cat, searchInput.value.trim());
            });
        });
        categoryFiltersContainer.querySelector('[data-category="All"]')?.classList.add('active');
    });
}

// Post Job form
jobForm.addEventListener('submit', e=>{
    e.preventDefault();

    const title = document.getElementById('jobTitle').value.trim();
    const description = document.getElementById('jobDescription').value.trim();
    const salary = document.getElementById('jobSalary').value.trim();
    const location = document.getElementById('jobLocation').value.trim();
    const company = document.getElementById('companyName').value.trim();
    const contactEmail = document.getElementById('contactEmail').value.trim();
    const contactWhatsApp = document.getElementById('contactWhatsApp').value.trim();
    const logoInput = document.getElementById('companyLogo').files[0];
    const categoryCheckboxes = document.querySelectorAll('.category-selection input[type="checkbox"]:checked');
    const category = Array.from(categoryCheckboxes).map(cb=>cb.value);

    const addJob = (logo)=>{
        db.collection('jobs').add({
            title, description, salary, location, company,
            contactEmail, contactWhatsApp, logo, category, timestamp: Date.now()
        });
        jobForm.reset();
    }

    if(logoInput){
        const reader = new FileReader();
        reader.onload = e=>addJob(e.target.result);
        reader.readAsDataURL(logoInput);
    } else addJob(null);
});

// Image preview
const logoInput = document.getElementById('companyLogo');
logoInput.addEventListener('change', e=>{
    const file = e.target.files[0];
    if(file){
        const reader = new FileReader();
        reader.onload = function(ev){
            let existingPreview = document.querySelector('.post-job img.preview');
            if(existingPreview) existingPreview.remove();
            const img = document.createElement('img');
            img.src = ev.target.result;
            img.classList.add('preview');
            logoInput.parentNode.insertBefore(img, logoInput.nextSibling);
        }
        reader.readAsDataURL(file);
    }
});

// Search filter
searchInput.addEventListener('input', ()=>displayJobs(document.querySelector('.filter-btn.active')?.dataset.category || "All", searchInput.value.trim()));

// Initial display
displayJobs();
