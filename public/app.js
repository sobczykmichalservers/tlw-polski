document.addEventListener("DOMContentLoaded", () => {
    const loginView = document.getElementById("login-view");
    const levelSelection = document.getElementById("level-selection");
    const passwordForm = document.getElementById("password-form");
    const passwordInput = document.getElementById("password-input");
    const passwordTitle = document.getElementById("password-title");
    const submitLoginBtn = document.getElementById("submit-login-btn");
    const cancelLoginBtn = document.getElementById("cancel-login-btn");
    const loginError = document.getElementById("login-error");
    const homeView = document.getElementById("home-view");
    const postsGrid = document.getElementById("posts-grid");
    const articleView = document.getElementById("article-view");
    const articleContent = document.getElementById("article-content");
    const categoryTabs = document.getElementById("category-tabs");
    const subcategoryTabs = document.getElementById("subcategory-tabs");
    const searchInput = document.getElementById("search-input");
    const noResults = document.getElementById("no-results");
    const backBtn = document.getElementById("back-btn");
    const backToLevelsBtn = document.getElementById("back-to-levels-btn");
    const heroTitle = document.getElementById("hero-title");
    const heroSubtitle = document.getElementById("hero-subtitle");
    const notFoundView = document.getElementById("not-found-view");
    const printBtn = document.getElementById("print-btn");

    // --- KONFIGURACJA REPOZYTORIUM GITHUB ---
    const GITHUB_REPO = 'sobczykmichalservers/tlw-polski';

    // Przekształca względne ścieżki CMS (/images/...) na bezpośrednie linki do surowych plików z GitHuba
    function resolveMediaUrl(url) {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
            return url;
        }
        const clean = url.startsWith('/') ? url : '/' + url;
        const encodedPath = clean.split('/').map(seg => {
            try { return encodeURIComponent(decodeURIComponent(seg)); }
            catch (e) { return encodeURIComponent(seg); }
        }).join('/');
        return `https://raw.githubusercontent.com/${GITHUB_REPO}/main/public${encodedPath}`;
    }

    let allPosts = [];
    let activeCategory = 'Wszystkie';
    let activeSubcategory = 'Wszystkie';
    let currentLevel = '';
    let settingsData = null;
    let lastFetchedLevel = '';
    
    // --- KOLORY TAGÓW ---
    let tagColors = {};
    let tagsFetched = false;
    const colorClasses = {
        'indigo': { bg: 'bg-indigo-100 dark:bg-indigo-900/60', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800', badgeBg: 'bg-indigo-50 dark:bg-indigo-900/40', badgeText: 'text-indigo-600 dark:text-indigo-400' },
        'emerald': { bg: 'bg-emerald-100 dark:bg-emerald-900/60', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', badgeBg: 'bg-emerald-50 dark:bg-emerald-900/40', badgeText: 'text-emerald-600 dark:text-emerald-400' },
        'red': { bg: 'bg-red-100 dark:bg-red-900/60', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800', badgeBg: 'bg-red-50 dark:bg-red-900/40', badgeText: 'text-red-600 dark:text-red-400' },
        'amber': { bg: 'bg-amber-100 dark:bg-amber-900/60', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800', badgeBg: 'bg-amber-50 dark:bg-amber-900/40', badgeText: 'text-amber-600 dark:text-amber-400' },
        'sky': { bg: 'bg-sky-100 dark:bg-sky-900/60', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200 dark:border-sky-800', badgeBg: 'bg-sky-50 dark:bg-sky-900/40', badgeText: 'text-sky-600 dark:text-sky-400' },
        'fuchsia': { bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/60', text: 'text-fuchsia-700 dark:text-fuchsia-300', border: 'border-fuchsia-200 dark:border-fuchsia-800', badgeBg: 'bg-fuchsia-50 dark:bg-fuchsia-900/40', badgeText: 'text-fuchsia-600 dark:text-fuchsia-400' },
        'slate': { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700', badgeBg: 'bg-slate-100 dark:bg-slate-800/60', badgeText: 'text-slate-600 dark:text-slate-400' }
    };
    
    function fetchTagsAndColors() {
        if (tagsFetched) return Promise.resolve();
        return fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/public/data/podkategorie`, { cache: 'no-cache' })
            .then(res => { if (!res.ok) throw new Error(); return res.json(); })
            .then(files => {
                const jsonFiles = Array.isArray(files) ? files.filter(f => f.name.endsWith('.json')) : [];
                return Promise.all(jsonFiles.map(fi => fetch(`${fi.download_url}?v=${fi.sha}`).then(r => r.json())));
            })
            .then(tags => {
                tags.forEach(t => { if(t.title && t.color) tagColors[t.title] = t.color; });
                tagsFetched = true;
            })
            .catch(() => { tagsFetched = true; }); // fallback
    }

    let favorites = JSON.parse(localStorage.getItem('polski_favorites') || '[]');
    function toggleFavorite(slug) {
        if (favorites.includes(slug)) {
            favorites = favorites.filter(f => f !== slug);
        } else {
            favorites.push(slug);
        }
        localStorage.setItem('polski_favorites', JSON.stringify(favorites));
        
        // Zaktualizuj serduszka na siatce bez przeładowywania DOM
        updateGridHearts();
        
        // Przelicz zakładki
        let favCount = 0;
        allPosts.forEach(p => { if (favorites.includes(p.slug)) favCount++; });
        
        // Jeśli usunęliśmy ostatnie ulubione będąc w zakładce Ulubione, wracamy do Wszystkich
        if (activeCategory === 'Ulubione' && favCount === 0) {
            activeCategory = 'Wszystkie';
        }
        
        renderTabs(allPosts);
        filterPosts();
        
        // Zaktualizuj widok artykułu jeśli jest otwarty
        const heartBtn = document.getElementById(`fav-btn-${slug}`);
        if(heartBtn) {
            const heartSvg = heartBtn.querySelector('svg');
            if (heartSvg) {
                heartSvg.classList.toggle('text-red-500');
                heartSvg.classList.toggle('fill-current');
                heartSvg.classList.toggle('text-slate-400');
                heartSvg.classList.toggle('dark:text-slate-500');
            }
            heartBtn.classList.add('heart-animate');
            setTimeout(() => heartBtn.classList.remove('heart-animate'), 300);
        }
    }

    function updateGridHearts() {
        document.querySelectorAll('.fav-grid-btn').forEach(btn => {
            const slug = btn.dataset.slug;
            const svg = btn.querySelector('svg');
            if (favorites.includes(slug)) {
                svg.classList.remove('text-white', 'drop-shadow-md');
                svg.classList.add('text-red-500', 'fill-current');
            } else {
                svg.classList.add('text-white', 'drop-shadow-md');
                svg.classList.remove('text-red-500', 'fill-current');
            }
        });
    }

    // Sterowanie rozmiarem czcionki
    let currentFontSize = 18; // bazowy rozmiar w px (tekst-lg)
    const fontMinusBtn = document.getElementById("font-minus-btn");
    const fontPlusBtn = document.getElementById("font-plus-btn");
    
    if (fontMinusBtn) fontMinusBtn.addEventListener('click', () => changeFontSize(-2));
    if (fontPlusBtn) fontPlusBtn.addEventListener('click', () => changeFontSize(2));
    
    function changeFontSize(change) {
        currentFontSize = Math.max(14, Math.min(26, currentFontSize + change));
        const proseDiv = document.querySelector('.prose');
        if (proseDiv) proseDiv.style.fontSize = `${currentFontSize}px`;
    }

    // Pasek postępu czytania
    let isScrolling = false;
    window.addEventListener('scroll', () => {
        if (articleView.classList.contains('hidden')) return;
        if (!isScrolling) {
            window.requestAnimationFrame(() => {
                const scrollPx = document.documentElement.scrollTop || document.body.scrollTop;
                const winHeightPx = document.documentElement.scrollHeight - document.documentElement.clientHeight;
                const scrolled = scrollPx / winHeightPx; // 0 do 1
                const progressBar = document.getElementById("progress-bar");
                if (progressBar) progressBar.style.transform = `scaleX(${scrolled})`;
                isScrolling = false;
            });
            isScrolling = true;
        }
    });

    initTheme();

    // --- PRZEŁĄCZANIE WIDOKÓW Z ANIMACJĄ ---
    const allViews = [loginView, homeView, articleView, notFoundView];

    function showView(viewEl) {
        if (viewEl !== articleView) {
            const activeAudio = document.getElementById('article-audio');
            if (activeAudio) {
                activeAudio.pause();
            }
        }
        allViews.forEach(v => {
            if (v === viewEl) {
                v.classList.remove('hidden');
                requestAnimationFrame(() => { v.classList.add('fade-in'); });
            } else {
                v.classList.add('hidden');
                v.classList.remove('fade-in');
            }
        });
    }

    // --- ROUTER & ZABEZPIECZENIA ---
    window.addEventListener('hashchange', handleRoute);

    function handleRoute() {
        const hash = window.location.hash;

        if (hash.startsWith('#/artykul/')) {
            const parts = hash.split('/');
            const level = decodeURIComponent(parts[2]);
            const slug = decodeURIComponent(parts[3]);
            if (level && slug) { requireAuth(level, () => loadArticleRoute(level, slug)); return; }
        }
        if (hash === '#/Podstawa' || hash === '#/Rozszerzenie' || hash === '#/SP') {
            const level = hash.replace('#/', '');
            requireAuth(level, () => loadGridRoute(level));
            return;
        }
        if (!hash || hash === '#' || hash === '#/') {
            showView(loginView);
            levelSelection.classList.remove('hidden');
            passwordForm.classList.add('hidden');
            loginError.classList.add('hidden');
            currentLevel = '';
            return;
        }
        // Nieznany hash = 404
        showView(notFoundView);
        if(notFoundView) notFoundView.style.display = 'flex';
    }

    function fetchSettingsJson() {
        const rawUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/public/data/settings.json?t=${Math.floor(Date.now() / 60000)}`;
        return fetch(rawUrl, { cache: 'no-cache' })
            .then(r => {
                if (!r.ok) throw new Error('RAW');
                return r.json();
            })
            .catch(() => {
                return fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/public/data/settings.json`, { cache: 'no-cache' })
                    .then(res => { if (res.status === 404) return null; if (!res.ok) throw new Error('API'); return res.json(); })
                    .then(fi => fi ? fetch(`${fi.download_url}?v=${fi.sha}`, { cache: 'no-cache' }).then(r => r.json()) : null);
            });
    }

    function requireAuth(level, onSuccess) {
        const savedPass = localStorage.getItem(`pass_${level}`);
        if (!savedPass) {
            window.location.hash = '#/';
            return;
        }

        if (settingsData) {
            validateAndProceed(level, savedPass, onSuccess);
        } else {
            fetchSettingsJson()
                .then(s => { 
                    if (s) settingsData = s; 
                    validateAndProceed(level, savedPass, onSuccess);
                })
                .catch(() => {
                    // W razie błędu sieci wpuszczamy ucznia awaryjnie, by nie stracił dostępu przed maturą
                    onSuccess();
                });
        }
    }

    function validateAndProceed(level, savedPass, onSuccess) {
        let correct;
        if (level === 'Podstawa') correct = settingsData?.password_podstawa;
        else if (level === 'Rozszerzenie') correct = settingsData?.password_rozszerzenie;
        else if (level === 'SP') correct = settingsData?.password_sp;

        if (savedPass === correct) {
            onSuccess();
        } else {
            localStorage.removeItem(`pass_${level}`);
            window.location.hash = '#/';
        }
    }

    // --- EKRAN LOGOWANIA ---
    document.querySelectorAll('.level-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const level = btn.dataset.level;
            if (localStorage.getItem(`pass_${level}`)) {
                window.location.hash = `#/${level}`; // Router wywoła requireAuth
            } else {
                currentLevel = level;
                levelSelection.classList.add('hidden');
                passwordForm.classList.remove('hidden');
                
                let titleLabel = currentLevel;
                if (currentLevel === 'SP') titleLabel = 'Egzamin Ósmoklasisty';
                else if (currentLevel === 'Podstawa') titleLabel = 'Matura Podstawowa';
                else if (currentLevel === 'Rozszerzenie') titleLabel = 'Matura Rozszerzona';
                
                passwordTitle.textContent = `Hasło: ${titleLabel}`;
                passwordInput.value = '';
                passwordInput.focus();
                loginError.classList.add('hidden');
            }
        });
    });

    cancelLoginBtn.addEventListener('click', () => {
        levelSelection.classList.remove('hidden');
        passwordForm.classList.add('hidden');
        loginError.classList.add('hidden');
        currentLevel = '';
        window.location.hash = '#/';
    });
    
    backToLevelsBtn.addEventListener('click', () => { window.location.hash = '#/'; });
    
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('pass_Podstawa');
            localStorage.removeItem('pass_Rozszerzenie');
            localStorage.removeItem('pass_SP');
            window.location.hash = '#/';
        });
    }

    if (backBtn) backBtn.addEventListener('click', () => { window.location.hash = `#/${currentLevel}`; });
    if (printBtn) printBtn.addEventListener('click', () => { window.print(); });

    submitLoginBtn.addEventListener('click', verifyPassword);
    passwordInput.addEventListener('keypress', e => { if (e.key === 'Enter') verifyPassword(); });

    function verifyPassword() {
        const entered = passwordInput.value.trim();
        if (!entered) return;
        submitLoginBtn.textContent = 'Sprawdzam...';
        submitLoginBtn.disabled = true;
        if (!settingsData) {
            fetchSettingsAndVerify(entered);
        } else {
            checkPassword(entered);
        }
    }

    function fetchSettingsAndVerify(entered) {
        fetchSettingsJson()
            .then(s => { if (s) settingsData = s; checkPassword(entered); })
            .catch(() => {
                loginError.textContent = 'Błąd połączenia. Odśwież stronę.';
                loginError.classList.remove('hidden');
                submitLoginBtn.textContent = 'Wejdź';
                submitLoginBtn.disabled = false;
            });
    }

    function checkPassword(entered) {
        let correct;
        if (currentLevel === 'Podstawa') correct = settingsData?.password_podstawa;
        else if (currentLevel === 'Rozszerzenie') correct = settingsData?.password_rozszerzenie;
        else if (currentLevel === 'SP') correct = settingsData?.password_sp;
        
        submitLoginBtn.textContent = 'Wejdź';
        submitLoginBtn.disabled = false;
        
        if (entered === correct) {
            localStorage.setItem(`pass_${currentLevel}`, entered);
            window.location.hash = `#/${currentLevel}`;
        } else {
            loginError.textContent = 'Niepoprawne hasło! Spróbuj ponownie.';
            loginError.classList.remove('hidden');
            passwordInput.value = '';
            passwordInput.focus();
        }
    }

    // --- WIDOK SIATKI ---
    function loadGridRoute(level) {
        currentLevel = level;
        showView(homeView);
        
        let title = '';
        let subtitle = '';
        let icon = '';
        
        if (level === 'Podstawa') { 
            title = 'Matura Podstawowa'; 
            subtitle = 'Baza wiedzy i streszczenia na egzamin podstawowy.';
            icon = `<img src="w kursie pp3.webp" class="h-28 sm:h-32 md:h-40 lg:h-48 w-auto mb-4 md:mb-6 object-contain shrink-0 rounded-3xl shadow-sm" alt="PP">`;
        }
        else if (level === 'Rozszerzenie') { 
            title = 'Matura Rozszerzona'; 
            subtitle = 'Zaawansowane analizy i materiały dla rozszerzenia.';
            icon = `<img src="w kursie pr3.webp" class="h-28 sm:h-32 md:h-40 lg:h-48 w-auto mb-4 md:mb-6 object-contain shrink-0 rounded-3xl shadow-sm" alt="PR">`;
        }
        else if (level === 'SP') { 
            title = 'Egzamin Ósmoklasisty'; 
            subtitle = 'Lektury i zagadnienia do szkoły podstawowej.';
            icon = `<img src="w kursie e83.webp" class="h-28 sm:h-32 md:h-40 lg:h-48 w-auto mb-4 md:mb-6 object-contain shrink-0 rounded-3xl shadow-sm" alt="E8">`;
        }
        
        if (heroTitle) {
            heroTitle.innerHTML = `<span class="flex flex-col items-center justify-center">${icon}<span>${title}</span></span>`;
        }
        if (heroSubtitle) heroSubtitle.textContent = subtitle;
        if (searchInput) searchInput.value = '';
        fetchDataForLevel(level);
    }

    function showSkeletons() {
        if (!postsGrid) return;
        postsGrid.innerHTML = '';
        for (let i = 0; i < 6; i++) {
            postsGrid.innerHTML += `
                <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div class="skeleton h-48 w-full"></div>
                    <div class="p-6 space-y-3">
                        <div class="skeleton h-3 w-16"></div>
                        <div class="skeleton h-5 w-3/4"></div>
                        <div class="skeleton h-3 w-full"></div>
                        <div class="skeleton h-3 w-2/3"></div>
                    </div>
                </div>`;
        }
    }

    function fetchDataForLevel(level) {
        if (lastFetchedLevel === level && allPosts.length > 0) {
            renderTabs(allPosts);
            renderInitialGrid(allPosts);
            return;
        }

        showSkeletons();
        let folder = '';
        if (level === 'Podstawa') folder = 'notatki_podstawa';
        else if (level === 'Rozszerzenie') folder = 'notatki_rozszerzenie';
        else if (level === 'SP') folder = 'notatki_sp';

        fetchTagsAndColors().then(() => {
            fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/public/data/${folder}`, { cache: 'no-cache' })
                .then(res => {
                    if (res.status === 404) return [];
                    if (!res.ok) throw new Error('API');
                    return res.json();
                })
                .then(files => {
                    const jsonFiles = Array.isArray(files) ? files.filter(f => f.name.endsWith('.json')) : [];
                    return Promise.all(jsonFiles.map(fi =>
                        fetch(`${fi.download_url}?v=${fi.sha}`, { cache: 'no-cache' })
                            .then(r => r.ok ? r.json().then(d => ({ ...d, slug: fi.name.replace('.json', '') })) : null)
                            .catch(() => null)
                    ));
                })
                .then(posts => {
                    allPosts = posts.filter(p => p && p.title);
                    lastFetchedLevel = level;
                    renderTabs(allPosts);
                    renderInitialGrid(allPosts);
                })
                .catch(() => {
                    if (postsGrid) postsGrid.innerHTML = `
                        <div class="col-span-full p-8 text-center bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800">
                            <h3 class="text-red-700 dark:text-red-400 font-bold mb-2">Błąd ładowania</h3>
                            <p class="text-red-600 dark:text-red-500 text-sm">Nie udało się załadować notatek. Spróbuj odświeżyć stronę za chwilę.</p>
                        </div>`;
                });
        });
    }

    // --- ZAKŁADKI Z LICZNIKIEM + ULUBIONE ---
    function renderTabs(posts) {
        if (!categoryTabs) return;
        const catCounts = new Map();
        
        let favCount = 0;
        posts.forEach(p => {
            if (p.category) catCounts.set(p.category, (catCounts.get(p.category) || 0) + 1);
            if (favorites.includes(p.slug)) favCount++;
        });

        categoryTabs.innerHTML = '';
        activeCategory = 'Wszystkie';
        activeSubcategory = 'Wszystkie';
        
        const baseClass = 'min-h-[44px] px-5 py-2 rounded-xl text-sm font-medium transition-colors border';
        const activeClass = 'bg-slate-900 dark:bg-indigo-500 text-white border-slate-900 dark:border-indigo-500';
        const inactiveClass = 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50';

        createTab('Wszystkie', posts.length);
        if (favCount > 0) createTab('Ulubione', favCount, '❤️');
        
        catCounts.forEach((count, category) => {
            createTab(category, count);
        });

        function createTab(name, count, icon = '') {
            const btn = document.createElement('button');
            btn.dataset.cat = name;
            btn.innerHTML = `${icon ? icon + ' ' : ''}${name} <span class="ml-1 opacity-60">(${count})</span>`;
            btn.className = `${baseClass} ${name === activeCategory ? activeClass : inactiveClass}`;
            btn.addEventListener('click', () => {
                activeCategory = name;
                activeSubcategory = 'Wszystkie'; // Reset podkategorii przy zmianie głównej
                
                Array.from(categoryTabs.children).forEach(c => {
                    c.className = `${baseClass} ${c.dataset.cat === activeCategory ? activeClass : inactiveClass}`;
                });
                renderSubcategoryTabs(posts);
                filterPosts();
            });
            categoryTabs.appendChild(btn);
        }
        
        renderSubcategoryTabs(posts);
    }

    function renderSubcategoryTabs(posts) {
        if (!subcategoryTabs) return;
        subcategoryTabs.innerHTML = '';
        
        if (activeCategory === 'Wszystkie' || activeCategory === 'Ulubione') {
            subcategoryTabs.classList.add('hidden');
            return;
        }

        const subCounts = new Map();
        let totalInCat = 0;
        
        posts.forEach(p => {
            if (p.category === activeCategory) {
                totalInCat++;
                const tags = Array.isArray(p.subcategory) ? p.subcategory : (p.subcategory ? [p.subcategory] : []);
                tags.forEach(tag => {
                    subCounts.set(tag, (subCounts.get(tag) || 0) + 1);
                });
            }
        });

        if (subCounts.size === 0) {
            subcategoryTabs.classList.add('hidden');
            return;
        }

        subcategoryTabs.classList.remove('hidden');
        
        const baseClass = 'px-4 py-1.5 rounded-full text-xs font-medium transition-colors border';
        const inactiveClass = 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50';

        createSubTab('Wszystkie', totalInCat);
        subCounts.forEach((count, subName) => {
            createSubTab(subName, count);
        });

        function createSubTab(name, count) {
            const btn = document.createElement('button');
            btn.dataset.sub = name;
            btn.innerHTML = `${name} <span class="opacity-60 ml-1">(${count})</span>`;
            
            const color = tagColors[name] || 'indigo';
            const c = colorClasses[color] || colorClasses['indigo'];
            const isActive = (name === activeSubcategory);
            
            if (name === 'Wszystkie') {
                const activeAllClass = 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100';
                btn.className = `${baseClass} ${isActive ? activeAllClass : inactiveClass}`;
            } else {
                btn.className = `${baseClass} ${isActive ? (c.bg + ' ' + c.text + ' ' + c.border) : inactiveClass}`;
            }

            btn.addEventListener('click', () => {
                if (name === 'Wszystkie' || activeSubcategory === name) {
                    activeSubcategory = 'Wszystkie';
                } else {
                    activeSubcategory = name;
                }
                renderSubcategoryTabs(posts);
                filterPosts();
            });
            subcategoryTabs.appendChild(btn);
        }
    }

    function filterPosts() {
        if (!searchInput || !postsGrid) return;
        const query = searchInput.value.toLowerCase();
        let visible = 0;
        
        Array.from(postsGrid.children).forEach(card => {
            const isFavTab = activeCategory === 'Ulubione';
            
            // Warunek kategorii głównej
            let matchesCategory = isFavTab ? favorites.includes(card.dataset.slug) : (activeCategory === 'Wszystkie' || card.dataset.category === activeCategory);
            
            // Warunek podkategorii (pojedynczy wybór)
            let matchesSubcategory = true;
            if (!isFavTab && activeCategory !== 'Wszystkie' && activeSubcategory !== 'Wszystkie') {
                const cardTags = card.dataset.subcategory ? card.dataset.subcategory.split(',') : [];
                matchesSubcategory = cardTags.includes(activeSubcategory);
            }

            const matchesSearch = card.dataset.search.includes(query);
            
            const ok = matchesCategory && matchesSubcategory && matchesSearch;
            card.classList.toggle('hidden', !ok);
            if (ok) visible++;
        });
        
        if (noResults) noResults.classList.toggle('hidden', visible > 0);
    }

    if (searchInput) searchInput.addEventListener('input', filterPosts);

    // --- SIATKA ARTYKUŁÓW / EMPTY STATE ---
    function renderInitialGrid(posts) {
        if (!postsGrid) return;
        postsGrid.innerHTML = '';

        if (posts.length === 0) {
            postsGrid.classList.add('hidden');
            if (noResults) {
                noResults.innerHTML = `
                    <svg class="w-20 h-20 mx-auto text-slate-300 dark:text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                    <p class="text-slate-500 dark:text-slate-400 text-lg font-medium">Tu jeszcze nic nie ma</p>
                    <p class="text-slate-400 dark:text-slate-500 text-sm mt-1">Dodaj notatki w panelu CMS, aby się tutaj pojawiły.</p>`;
                noResults.classList.remove('hidden');
            }
            return;
        }
        postsGrid.classList.remove('hidden');
        if (noResults) noResults.classList.add('hidden');

        posts.forEach(post => {
            const card = document.createElement('article');
            const cat = post.category || 'Inne';
            card.dataset.category = cat;
            
            const cardTags = Array.isArray(post.subcategory) ? post.subcategory : (post.subcategory ? [post.subcategory] : []);
            if (cardTags.length > 0) card.dataset.subcategory = cardTags.join(',');
            
            card.dataset.slug = post.slug;
            card.dataset.search = (post.title + ' ' + (post.content || '')).toLowerCase();
            card.className = 'group bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-all flex flex-col overflow-hidden hover:shadow-md dark:hover:border-slate-700 relative';

            const img = post.thumbnail ? resolveMediaUrl(post.thumbnail) : 'https://images.unsplash.com/photo-1456953180671-730de08edaa7?auto=format&fit=crop&q=80&w=600&h=400';
            let plain = (post.content || '').replace(/(\*|_|#|-|\d\.)/g, '').replace(/\n/g, ' ').trim();
            const excerpt = plain.length > 100 ? plain.substring(0, 100) + '...' : plain;

            const isFav = favorites.includes(post.slug);
            const heartColor = isFav ? 'text-red-500 fill-current' : 'text-white drop-shadow-md';
            
            let badgesHtml = '';
            cardTags.forEach(tag => {
                const color = tagColors[tag] || 'indigo';
                const c = colorClasses[color] || colorClasses['indigo'];
                badgesHtml += `<span class="ml-2 inline-block px-2 py-0.5 ${c.badgeBg} ${c.badgeText} rounded-md text-[10px] font-bold tracking-wider">${tag}</span>`;
            });
            if (post.audio) {
                badgesHtml += `<span class="ml-2 inline-flex items-center px-2 py-0.5 bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-md text-[10px] font-bold tracking-wider">🎧 AUDIO</span>`;
            }

            card.innerHTML = `
                <div class="h-48 overflow-hidden border-b border-slate-100 dark:border-slate-800 relative cursor-pointer" onclick="window.location.hash = '#/artykul/${currentLevel}/${post.slug}'">
                    <img src="${img}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" alt="${post.title}" onerror="this.src='https://images.unsplash.com/photo-1456953180671-730de08edaa7?auto=format&fit=crop&q=80&w=600&h=400'">
                </div>
                <button class="absolute top-3 right-3 p-2 bg-black/20 hover:bg-black/40 backdrop-blur-sm rounded-full transition-colors z-10 fav-grid-btn" data-slug="${post.slug}">
                    <svg class="w-5 h-5 ${heartColor} transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                </button>
                <div class="p-6 flex flex-col flex-grow cursor-pointer" onclick="window.location.hash = '#/artykul/${currentLevel}/${post.slug}'">
                    <div class="flex items-center mb-2 flex-wrap gap-y-1">
                        <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">${cat}</span>
                        ${badgesHtml}
                    </div>
                    <h3 class="text-xl font-bold font-serif text-slate-900 dark:text-white mb-3 leading-snug line-clamp-2">${post.title}</h3>
                    <p class="text-slate-600 dark:text-slate-400 text-sm flex-grow line-clamp-3 leading-relaxed">${excerpt}</p>
                </div>`;
                
            postsGrid.appendChild(card);
        });

        // Obsługa polubień na kafelkach
        document.querySelectorAll('.fav-grid-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFavorite(btn.dataset.slug);
            });
        });
    }

    // --- WIDOK ARTYKUŁU ---
    function loadArticleRoute(level, slug) {
        currentLevel = level;
        const prevAudio = document.getElementById('article-audio');
        if (prevAudio) {
            prevAudio.pause();
            prevAudio.removeAttribute('src');
        }
        showView(articleView);
        document.getElementById("progress-bar").style.transform = "scaleX(0)";
        articleContent.innerHTML = `<div class="max-w-4xl mx-auto mt-10 space-y-6 px-4"><div class="skeleton h-10 w-2/3 mx-auto"></div><div class="skeleton h-6 w-1/3 mx-auto"></div><div class="skeleton h-72 w-full rounded-2xl"></div><div class="skeleton h-4 w-full"></div><div class="skeleton h-4 w-5/6"></div><div class="skeleton h-4 w-4/6"></div></div>`;
        window.scrollTo(0, 0);

        const cached = allPosts.find(p => p.slug === slug);
        if (cached) { renderArticle(cached); return; }

        let folder = '';
        if (level === 'Podstawa') folder = 'notatki_podstawa';
        else if (level === 'Rozszerzenie') folder = 'notatki_rozszerzenie';
        else if (level === 'SP') folder = 'notatki_sp';
        
        fetchTagsAndColors().then(() => {
            const rawUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/public/data/${folder}/${encodeURIComponent(slug)}.json?t=${Math.floor(Date.now() / 60000)}`;
            fetch(rawUrl, { cache: 'no-cache' })
                .then(r => {
                    if (r.ok) return r.json();
                    return fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/public/data/${folder}/${slug}.json`, { cache: 'no-cache', headers: { 'Accept': 'application/vnd.github.v3.raw' } })
                        .then(res => res.ok ? res.json() : null);
                })
                .then(post => {
                    if (post) {
                        post.slug = slug;
                        renderArticle(post);
                    }
                    else articleContent.innerHTML = `<div class="text-center py-20"><svg class="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><p class="text-slate-500 text-lg font-medium">Nie znaleziono artykułu</p></div>`;
                });
        });
    }

    function formatAudioTime(sec) {
        if (!sec || !isFinite(sec)) return '0:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    function renderArticle(post) {
        const img = post.thumbnail ? resolveMediaUrl(post.thumbnail) : '';
        const audioUrl = post.audio ? resolveMediaUrl(post.audio) : '';
        const cat = post.category || 'Inne';
        
        // Rozwiązanie ścieżek obrazków z CMS (/images/...) w treści notatki markdown
        let rawContent = post.content || '';
        rawContent = rawContent.replace(/!\[(.*?)\]\(\s*(\/images\/[^\s)]+)\s*\)/g, (match, alt, src) => {
            return `![${alt}](${resolveMediaUrl(src)})`;
        });

        // Generowanie HTML
        const html = DOMPurify.sanitize(marked.parse(rawContent));
        const words = rawContent.trim().split(/\s+/).length;
        const time = `${Math.ceil(words / 200)} min czytania`;

        const isFav = favorites.includes(post.slug);
        const heartColor = isFav ? 'text-red-500 fill-current' : 'text-slate-400 dark:text-slate-500';

        // Generowanie Spisu Treści (TOC)
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const headings = tempDiv.querySelectorAll('h1, h2, h3');
        let tocHtml = '';
        
        if (headings.length > 1) {
            tocHtml = `
            <div class="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 mb-8">
                <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                    <svg class="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"></path></svg>
                    Spis Treści
                </h3>
                <ul class="space-y-2 text-sm text-slate-600 dark:text-slate-400 font-sans">
            `;
            
            headings.forEach((h, index) => {
                const id = `heading-${index}`;
                h.id = id;
                const pl = h.tagName === 'H3' ? 'pl-4' : (h.tagName === 'H1' ? 'font-bold' : '');
                tocHtml += `<li class="${pl}"><a href="#${id}" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors inline-block py-1" onclick="document.getElementById('${id}').scrollIntoView({behavior: 'smooth'}); return false;">${h.textContent}</a></li>`;
            });
            tocHtml += `</ul></div>`;
        }

        // Odtwarzacz Audio MP3 pod Spisem Treści (z funkcją przypięcia podczas przewijania tekstu)
        const audioHtml = audioUrl ? `
            <div id="article-audio-wrapper" class="mb-10 no-print transition-all duration-300">
                <div id="article-audio-card" class="bg-indigo-50/95 dark:bg-slate-800/95 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-indigo-200/80 dark:border-slate-700 shadow-sm transition-all duration-300">
                    <audio id="article-audio" src="${audioUrl}" preload="none"></audio>
                    <div class="flex flex-col gap-2.5">
                        <div class="flex items-center justify-between gap-2">
                            <div class="flex items-center gap-2.5 min-w-0">
                                <button id="audio-play-btn" type="button" class="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white flex items-center justify-center shrink-0 shadow-sm transition-all focus:outline-none" title="Odtwórz / Pauza">
                                    <svg id="audio-icon-play" class="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                    <svg id="audio-icon-pause" class="w-5 h-5 hidden" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                                </button>
                                <div class="min-w-0 text-left">
                                    <div class="flex items-center gap-1.5">
                                        <span class="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">🎧 Odsłuchaj artykuł</span>
                                    </div>
                                    <p id="audio-status-text" class="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 truncate">Kliknij, aby włączyć nagranie i czytać</p>
                                </div>
                            </div>

                            <div class="flex items-center gap-1 sm:gap-1.5 shrink-0">
                                <button id="audio-rw-btn" type="button" class="px-2 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors" title="Cofnij o 10 sekund">-10s</button>
                                <button id="audio-ff-btn" type="button" class="px-2 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors" title="Przewiń o 10 sekund">+10s</button>
                                <button id="audio-speed-btn" type="button" class="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/60 transition-colors min-w-[42px]" title="Zmień prędkość odtwarzania">1x</button>
                                <button id="audio-unpin-btn" type="button" class="hidden p-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors" title="Odepnij odtwarzacz podczas przewijania">✕</button>
                            </div>
                        </div>

                        <div class="flex items-center gap-2.5">
                            <span id="audio-current-time" class="text-[11px] sm:text-xs font-mono font-medium text-slate-500 dark:text-slate-400 w-9 text-right shrink-0">0:00</span>
                            <input id="audio-seek-bar" type="range" min="0" max="100" value="0" step="0.1" class="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-400">
                            <span id="audio-duration" class="text-[11px] sm:text-xs font-mono font-medium text-slate-500 dark:text-slate-400 w-9 shrink-0">--:--</span>
                        </div>
                    </div>
                </div>
            </div>
        ` : '';

        // Finalny HTML
        const articleTags = Array.isArray(post.subcategory) ? post.subcategory : (post.subcategory ? [post.subcategory] : []);
        let badgesHtml = '';
        articleTags.forEach(tag => {
            const color = tagColors[tag] || 'indigo';
            const c = colorClasses[color] || colorClasses['indigo'];
            badgesHtml += `<span class="ml-2 inline-block px-2.5 py-1 ${c.badgeBg} ${c.badgeText} rounded-md text-xs font-bold tracking-wider align-middle shadow-sm">${tag}</span>`;
        });
        
        let levelIcon = '';
        
        const thumbnailHtml = img ? `
            <figure class="mb-12 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 no-print">
                <img src="${img}" alt="${post.title}" class="w-full h-auto max-h-[500px] object-cover mx-auto block" onerror="this.parentElement.style.display='none'">
            </figure>
        ` : '';

        articleContent.innerHTML = `
            <div class="max-w-4xl mx-auto bg-white dark:bg-slate-900 p-8 sm:p-12 md:p-16 rounded-[2rem] shadow-sm dark:shadow-none border border-slate-200 dark:border-slate-800 mt-6 sm:mt-10 mb-20 relative z-10 transition-colors duration-300">
                <header class="mb-10 text-center relative">
                    <button id="fav-btn-${post.slug}" class="absolute right-0 top-0 p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors" title="Dodaj do ulubionych">
                        <svg class="w-6 h-6 ${heartColor} transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                    </button>
                    
                    <div class="flex flex-wrap items-center justify-center gap-y-2 mt-2">
                        <span class="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">${cat}</span>
                        ${badgesHtml}
                    </div>
                    <h1 class="text-4xl md:text-5xl font-bold font-serif text-slate-900 dark:text-white mt-4 mb-6 leading-tight flex items-center justify-center text-center">
                        ${levelIcon}
                        ${post.title}
                    </h1>
                    <div class="flex justify-center items-center text-slate-500 dark:text-slate-400 text-sm font-medium">
                        <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        ${time}
                    </div>
                </header>
                ${thumbnailHtml}
                
                ${tocHtml}
                ${audioHtml}
                
                <div class="prose prose-slate dark:prose-invert max-w-3xl font-serif leading-relaxed prose-headings:font-sans prose-headings:font-bold prose-a:text-indigo-600 dark:prose-a:text-indigo-400 mx-auto transition-all" style="font-size: ${currentFontSize}px;">
                    ${tempDiv.innerHTML}
                </div>
            </div>`;

        // Event ulubionych w artykule
        document.getElementById(`fav-btn-${post.slug}`).addEventListener('click', () => {
            toggleFavorite(post.slug);
        });

        // Inicjalizacja logiki odtwarzacza Audio MP3 (jeśli istnieje)
        if (audioUrl) {
            const audio = document.getElementById('article-audio');
            const audioWrapper = document.getElementById('article-audio-wrapper');
            const audioCard = document.getElementById('article-audio-card');
            const playBtn = document.getElementById('audio-play-btn');
            const iconPlay = document.getElementById('audio-icon-play');
            const iconPause = document.getElementById('audio-icon-pause');
            const statusText = document.getElementById('audio-status-text');
            const rwBtn = document.getElementById('audio-rw-btn');
            const ffBtn = document.getElementById('audio-ff-btn');
            const speedBtn = document.getElementById('audio-speed-btn');
            const unpinBtn = document.getElementById('audio-unpin-btn');
            const seekBar = document.getElementById('audio-seek-bar');
            const currentTimeEl = document.getElementById('audio-current-time');
            const durationEl = document.getElementById('audio-duration');

            const speeds = [1, 1.25, 1.5, 1.75, 2, 0.75];
            let speedIdx = 0;
            let isSeeking = false;
            let isUnpinnedManually = false;

            function pinPlayer() {
                if (!isUnpinnedManually && audioWrapper && audioCard) {
                    audioWrapper.classList.add('sticky', 'top-[72px]', 'z-30');
                    audioCard.classList.add('shadow-lg', 'ring-1', 'ring-indigo-500/20');
                    if (unpinBtn) unpinBtn.classList.remove('hidden');
                }
            }

            if (unpinBtn) {
                unpinBtn.addEventListener('click', () => {
                    isUnpinnedManually = true;
                    audioWrapper.classList.remove('sticky', 'top-[72px]', 'z-30');
                    audioCard.classList.remove('shadow-lg', 'ring-1', 'ring-indigo-500/20');
                    unpinBtn.classList.add('hidden');
                });
            }

            playBtn.addEventListener('click', () => {
                if (audio.paused) {
                    isUnpinnedManually = false;
                    pinPlayer();
                    statusText.textContent = 'Ładowanie nagrania...';
                    audio.play().catch(() => {
                        statusText.textContent = 'Nie udało się odtworzyć pliku MP3';
                    });
                } else {
                    audio.pause();
                }
            });

            audio.addEventListener('play', () => {
                iconPlay.classList.add('hidden');
                iconPause.classList.remove('hidden');
                statusText.textContent = 'Odtwarzanie — możesz przewijać tekst poniżej';
                pinPlayer();
            });

            audio.addEventListener('playing', () => {
                statusText.textContent = 'Odtwarzanie — możesz przewijać tekst poniżej';
            });

            audio.addEventListener('waiting', () => {
                statusText.textContent = 'Buforowanie nagrania...';
            });

            audio.addEventListener('pause', () => {
                iconPause.classList.add('hidden');
                iconPlay.classList.remove('hidden');
                if (!audio.ended) {
                    statusText.textContent = 'Wstrzymano (kliknij Play, aby kontynuować)';
                }
            });

            audio.addEventListener('ended', () => {
                iconPause.classList.add('hidden');
                iconPlay.classList.remove('hidden');
                statusText.textContent = 'Zakończono odsłuchiwanie';
                seekBar.value = 0;
                currentTimeEl.textContent = '0:00';
            });

            const updateDuration = () => {
                if (audio.duration && isFinite(audio.duration)) {
                    durationEl.textContent = formatAudioTime(audio.duration);
                }
            };
            audio.addEventListener('loadedmetadata', updateDuration);
            audio.addEventListener('durationchange', updateDuration);

            audio.addEventListener('timeupdate', () => {
                if (!isSeeking) {
                    currentTimeEl.textContent = formatAudioTime(audio.currentTime);
                    if (audio.duration && isFinite(audio.duration)) {
                        seekBar.value = (audio.currentTime / audio.duration) * 100;
                    }
                }
            });

            rwBtn.addEventListener('click', () => {
                audio.currentTime = Math.max(0, (audio.currentTime || 0) - 10);
            });

            ffBtn.addEventListener('click', () => {
                if (audio.duration && isFinite(audio.duration)) {
                    audio.currentTime = Math.min(audio.duration, (audio.currentTime || 0) + 10);
                }
            });

            speedBtn.addEventListener('click', () => {
                speedIdx = (speedIdx + 1) % speeds.length;
                const rate = speeds[speedIdx];
                audio.playbackRate = rate;
                speedBtn.textContent = `${rate}x`;
            });

            seekBar.addEventListener('input', () => {
                isSeeking = true;
                if (audio.duration && isFinite(audio.duration)) {
                    currentTimeEl.textContent = formatAudioTime((parseFloat(seekBar.value) / 100) * audio.duration);
                }
            });

            seekBar.addEventListener('change', () => {
                const pct = parseFloat(seekBar.value);
                if (audio.duration && isFinite(audio.duration)) {
                    audio.currentTime = (pct / 100) * audio.duration;
                    isSeeking = false;
                } else {
                    audio.addEventListener('loadedmetadata', () => {
                        if (audio.duration && isFinite(audio.duration)) {
                            audio.currentTime = (pct / 100) * audio.duration;
                        }
                        isSeeking = false;
                    }, { once: true });
                    audio.load();
                }
            });
        }
    }

    // --- DARK MODE ---
    function initTheme() {
        const toggle = () => {
            document.documentElement.classList.toggle('dark');
            localStorage.theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        };
        ['theme-toggle-login', 'theme-toggle-home', 'theme-toggle-article'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', toggle);
        });
    }

    handleRoute();
});
