document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.getElementById('mainNavbar');
    const searchTrigger = document.getElementById('searchTrigger');
    const searchBar = document.getElementById('searchBar');
    const searchClose = document.getElementById('searchClose');
    const searchInput = document.getElementById('searchInput');
    const autocompleteBox = document.getElementById('autocompleteBox');
    const autocompleteList = document.getElementById('autocompleteList');
    const dataContainer = document.querySelector('.cards__container');
    const filterItems = document.querySelectorAll('.filters__item');
    const scrollSentinel = document.querySelector('.cards__sentinel');
    const menuBtn = document.getElementById('menuBtn');
    const mobileMenu = document.getElementById('mobileMenu');

    function debounce(func, timeout = 300) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => { func.apply(this, args); }, timeout);
        };
    }

    const templateSource = `
        {{#each gotData}}
        <article class="card">
            <div class="card__image-box">
                <img src="{{imageUrl}}" alt="{{title}}" class="card__image">
            </div>
            <div class="card__content">
                <h6 class="card__title heading">{{title}}</h6>
                <p class="card__description">{{description}}</p>
                <span class="card__tag">{{tag}}</span>
            </div>
        </article>
        {{/each}}
    `;
    const template = Handlebars.compile(templateSource);

    let allData = [];
    const state = {
        searchQuery: '',
        filters: new Set()
    };
    let start = 0;
    const limit = 4;
    let isLoading = false;

    async function fetchData() {
        try {
            const response = await fetch('info.json');
            allData = await response.json();
            loadMore();
            setupInfiniteScroll();
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    function renderCards(data, append = false) {
        const html = template({ gotData: data });
        if (append) {
            dataContainer.insertAdjacentHTML('beforeend', html);
        } else {
            dataContainer.innerHTML = html;
        }
    }

    function getFilteredData() {
        let data = allData;

        if (state.filters.size > 0) {
            data = data.filter(d => state.filters.has(d.tag));
        }

        if (state.searchQuery) {
            const query = state.searchQuery.toLowerCase();
            data = data.filter(item =>
                item.title.toLowerCase().includes(query) ||
                item.description.toLowerCase().includes(query)
            );
        }

        return data;
    }

    function loadMore() {
        if (isLoading) return;

        const filteredData = getFilteredData();

        if (state.searchQuery || state.filters.size > 0) {
            if (filteredData.length === 0) {
                
                dataContainer.innerHTML = '<div class="no-results">No results found matching your criteria.</div>';
                scrollSentinel.style.display = 'none';
                return;
            }
        }

        if (start >= filteredData.length) {
            scrollSentinel.textContent = 'No more content';
            scrollSentinel.style.display = 'none';
            return;
        }

        isLoading = true;
        scrollSentinel.textContent = 'Loading more...';
        scrollSentinel.style.display = 'flex';

        setTimeout(() => {
            const nextBatch = filteredData.slice(start, start + limit);
            start += nextBatch.length;

            if (nextBatch.length > 0) {
                renderCards(nextBatch, true);
            }

            isLoading = false;

            if (start >= filteredData.length) {
                scrollSentinel.textContent = 'No more content';
                scrollSentinel.style.display = 'none';
            } else {
                scrollSentinel.textContent = 'Scroll for more';
            }
        }, 500);
    }

    function setupInfiniteScroll() {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !isLoading) {
                loadMore();
            }
        }, {
            rootMargin: '100px',
            threshold: 0.1
        });

        observer.observe(scrollSentinel);
    }

    window.addEventListener('scroll', () => {
        if (window.scrollY > 80) {
            navbar.classList.add('navbar--scrolled');
        } else {
            navbar.classList.remove('navbar--scrolled');
        }
    });

    const dropdownCloseButtons = document.querySelectorAll('.dropdown__close');
    dropdownCloseButtons.forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = closeBtn.closest('.navbar__dropdown');
            if (dropdown) {
                dropdown.style.visibility = 'hidden';
                dropdown.style.opacity = '0';
                dropdown.style.transform = 'translateX(-50%) translateY(-20px)';
                dropdown.style.pointerEvents = 'none';
            }
        });
    });

    if (menuBtn && mobileMenu) {
        menuBtn.addEventListener('click', () => {
            menuBtn.classList.toggle('is-active');
            mobileMenu.classList.toggle('is-open');
            document.body.style.overflow = mobileMenu.classList.contains('is-open') ? 'hidden' : '';
        });

        const mobileHeaders = mobileMenu.querySelectorAll('.navbar__mobile-header');
        mobileHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                e.preventDefault();
                const item = header.parentElement;

                const items = mobileMenu.querySelectorAll('.navbar__mobile-item');
                items.forEach(i => {
                    if (i !== item) i.classList.remove('is-active');
                });

                item.classList.toggle('is-active');
            });
        });

        const mobileSubHeaders = mobileMenu.querySelectorAll('.navbar__mobile-sub-header');
        mobileSubHeaders.forEach(subHeader => {
            subHeader.addEventListener('click', (e) => {
                e.stopPropagation();
                const subItem = subHeader.parentElement;
                const toggle = subHeader.querySelector('.navbar__mobile-toggle');

                subItem.classList.toggle('is-active');
                if (toggle) {
                    toggle.textContent = subItem.classList.contains('is-active') ? '-' : '+';
                }
            });
        });

        const mobileDropdownLinks = mobileMenu.querySelectorAll('.navbar__mobile-dropdown a, .navbar__mobile-nested-dropdown a');
        mobileDropdownLinks.forEach(link => {
            link.addEventListener('click', () => {
                menuBtn.classList.remove('is-active');
                mobileMenu.classList.remove('is-open');
                document.body.style.overflow = '';
            });
        });
    }

    searchTrigger.addEventListener('click', () => {
        searchBar.classList.add('search-bar--active');
        setTimeout(() => {
            searchInput.focus();
        }, 300);
    });

    searchClose.addEventListener('click', () => {
        searchBar.classList.remove('search-bar--active');
        autocompleteBox.style.display = 'none';
        searchInput.value = '';
        resetToInitial();
    });

    const dropdownContainers = document.querySelectorAll('.navbar__dropdown');

    dropdownContainers.forEach(container => {
        const items = container.querySelectorAll('.dropdown__item');
        const contents = container.querySelectorAll('.dropdown__sub-content');

        items.forEach(item => {
            item.addEventListener('mouseenter', () => {
                const targetId = item.getAttribute('data-sub');

                items.forEach(di => di.classList.remove('active'));
                item.classList.add('active');

                contents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === targetId) {
                        content.classList.add('active');
                    }
                });
            });
        });
    });

    const handleSearchInput = debounce((e) => {
        const query = e.target.value.toLowerCase().trim();
        state.searchQuery = query;

        if (query.length > 0) {
            
            let potentialMatches = allData;
            if (state.filters.size > 0) {
                potentialMatches = potentialMatches.filter(d => state.filters.has(d.tag));
            }

            const autocompleteResults = potentialMatches.filter(item =>
                item.title.toLowerCase().includes(query) ||
                item.description.toLowerCase().includes(query)
            );

            if (autocompleteResults.length > 0) {
                autocompleteBox.style.display = 'block';
                
                autocompleteList.innerHTML = autocompleteResults.slice(0, 5).map(item =>
                    `<li class="autocomplete-item" tabindex="0">${item.title}</li>`
                ).join('');
            } else {
                autocompleteBox.style.display = 'block';
                autocompleteList.innerHTML = '<li class="autocomplete-item">No results found</li>';
            }
        } else {
            autocompleteBox.style.display = 'none';
        }

        resetToInitial();
    });

    searchInput.addEventListener('input', handleSearchInput);

    filterItems.forEach(item => {
        item.addEventListener('click', () => {
            const filterValue = item.getAttribute('data-filter');

            if (filterValue === 'all') {
                state.filters.clear();
                filterItems.forEach(i => i.classList.remove('filters__item--active'));
                item.classList.add('filters__item--active');
            } else {
                document.querySelector('[data-filter="all"]').classList.remove('filters__item--active');

                if (state.filters.has(filterValue)) {
                    state.filters.delete(filterValue);
                    item.classList.remove('filters__item--active');
                } else {
                    state.filters.add(filterValue);
                    item.classList.add('filters__item--active');
                }

                if (state.filters.size === 0) {
                    document.querySelector('[data-filter="all"]').classList.add('filters__item--active');
                }
            }

            resetToInitial();
        });
    });

    function resetToInitial() {
        start = 0;
        dataContainer.innerHTML = '';
        isLoading = false;
        loadMore();
    }

    autocompleteList.addEventListener('click', (e) => {
        if (e.target.classList.contains('autocomplete-item') && e.target.textContent !== 'No results found') {
            const selectedTitle = e.target.textContent;
            state.searchQuery = selectedTitle;
            searchInput.value = selectedTitle;
            autocompleteBox.style.display = 'none';
            resetToInitial();
        }
    });


    fetchData();
});