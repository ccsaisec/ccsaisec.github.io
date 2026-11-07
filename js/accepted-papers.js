/* AISec 2026: load the external paper list, then initialize its filters. */
(function () {
    "use strict";
    /* Optional progressive enhancement. Papers and abstract toggles also work without JavaScript. */
    function initializeAcceptedPapers() {
        "use strict";
        const root = document.getElementById("accepted");
        if (!root || root.dataset.apInitialized === "true") return;

        const controls = root.querySelector(".ap-controls");
        const search = root.querySelector(".ap-search");
        const spotlightButton = root.querySelector(".ap-spotlight-toggle");
        const clearButton = root.querySelector(".ap-clear");
        const status = root.querySelector(".ap-status");
        const empty = root.querySelector(".ap-empty");
        const themeButtons = Array.from(root.querySelectorAll("[data-ap-filter]"));
        const groups = Array.from(root.querySelectorAll("[data-ap-group]"));
        const cards = Array.from(root.querySelectorAll(".ap-paper"));
        const normalize = (value) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const searchable = new Map(cards.map((card) => [card, normalize([
            card.querySelector(".ap-paper-title").textContent,
            card.querySelector(".ap-authors").textContent,
            card.querySelector(".ap-affiliations").textContent
        ].join(" "))]));
        let activeTheme = "all";
        let spotlightOnly = false;

        function update() {
            const terms = normalize(search.value.trim()).split(/\s+/).filter(Boolean);
            let count = 0;
            cards.forEach((card) => {
                const visible = (activeTheme === "all" || card.dataset.apTheme === activeTheme)
                    && (!spotlightOnly || card.dataset.apSpotlight === "true")
                    && terms.every((term) => searchable.get(card).includes(term));
                card.hidden = !visible;
                if (visible) count += 1;
            });
            groups.forEach((group) => {
                const groupCards = Array.from(group.querySelectorAll(".ap-paper"));
                const visible = groupCards.filter((card) => !card.hidden).length;
                group.hidden = visible === 0;
                group.querySelector(".ap-theme-count").textContent = visible === groupCards.length
                    ? `${visible} papers`
                    : `${visible} of ${groupCards.length} papers`;
            });
            themeButtons.forEach((button) => {
                button.setAttribute("aria-pressed", String(button.dataset.apFilter === activeTheme));
            });
            spotlightButton.setAttribute("aria-pressed", String(spotlightOnly));
            status.textContent = `Showing ${count} of ${cards.length} papers`;
            clearButton.hidden = !(search.value || activeTheme !== "all" || spotlightOnly);
            empty.hidden = count !== 0;
        }

        search.addEventListener("input", update);
        // Some browsers fire "search" when the native search-field clear control is used.
        search.addEventListener("search", update);
        spotlightButton.addEventListener("click", () => {
            spotlightOnly = !spotlightOnly;
            update();
        });
        themeButtons.forEach((button) => button.addEventListener("click", () => {
            activeTheme = button.dataset.apFilter;
            update();
        }));
        clearButton.addEventListener("click", () => {
            search.value = "";
            activeTheme = "all";
            spotlightOnly = false;
            update();
            search.focus();
        });

        root.dataset.apInitialized = "true";
        update();
        controls.hidden = false;
    }

    // Resolve relative to this script so this also works in a year subdirectory.
    const scriptURL = document.currentScript && document.currentScript.src;
    const contentURL = scriptURL
        ? new URL("../accepted-papers.html", scriptURL)
        : new URL("accepted-papers.html", document.baseURI);

    async function mountAcceptedPapers() {
        const placeholder = document.getElementById("accepted");
        if (!placeholder) return;

        // The separate papers page already contains the complete section.
        if (placeholder.querySelector(".ap-paper")) {
            initializeAcceptedPapers();
            return;
        }

        placeholder.setAttribute("aria-busy", "true");
        const status = document.createElement("p");
        status.setAttribute("role", "status");
        status.textContent = "Loading accepted papers…";
        const container = placeholder.querySelector(".ap-container") || placeholder;
        container.prepend(status);

        try {
            const response = await fetch(contentURL, { cache: "no-cache" });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const page = new DOMParser().parseFromString(await response.text(), "text/html");
            const section = page.querySelector("section#accepted");
            if (!section || !section.querySelector(".ap-paper")) {
                throw new Error("The accepted papers section is missing.");
            }
            // Import just the section. Styles and behavior are loaded separately.
            const imported = document.importNode(section, true);
            placeholder.replaceWith(imported);
            initializeAcceptedPapers();
        } catch (error) {
            placeholder.removeAttribute("aria-busy");
            status.textContent = "The paper list could not be loaded here. Please use the link below to open it.";
            // Keep the original link usable, including when fetch is unavailable.
        }
    }

    mountAcceptedPapers();
})();
