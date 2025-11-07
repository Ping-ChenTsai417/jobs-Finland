(() => {
  const defaultJson = "finland_jobs_output.json"; // same-folder JSON
  const params = new URLSearchParams(location.search);
  const jsonParam = params.get("json");

  const qs = (s, el=document) => el.querySelector(s);
  const qsa = (s, el=document) => Array.from(el.querySelectorAll(s));

  const tableBody = qs("#tableBody");
  const searchInput = qs("#searchInput");
  const companyFilter = qs("#companyFilter");
  const categoryFilter = qs("#categoryFilter");
  const industryFilter = qs("#industryFilter");
  const resetBtn = qs("#resetBtn");
  const fileInput = qs("#fileInput");

  const statTotal = qs("#statTotal");
  const statCompanies = qs("#statCompanies");
  const statCategories = qs("#statCategories");

  const state = {
    rows: [], filtered: [], sortKey:"company", sortAsc:true
  };

  const normalize = s => (s || "").toString().trim();

  function flattenData(data) {
    const out = [];
    Object.entries(data || {}).forEach(([company, jobs]) => {
      (jobs || []).forEach(j => {
        out.push({
          company,
          job_title: normalize(j.job_title),
          industry: normalize(j.industry),
          category: normalize(j.category),
          url: j.url
        });
      });
    });
    return out;
  }

  function populateFilters(rows) {
    const uniq = (arr) => Array.from(new Set(arr.filter(Boolean))).sort((a,b)=>a.localeCompare(b));
    const companies = uniq(rows.map(r => r.company));
    const cats = uniq(rows.map(r => r.category));
    const inds = uniq(rows.map(r => r.industry));

    // Clear old
    companyFilter.length = 1; categoryFilter.length = 1; industryFilter.length = 1;
    for (const c of companies) companyFilter.add(new Option(c, c));
    for (const c of cats) categoryFilter.add(new Option(c, c));
    for (const i of inds) industryFilter.add(new Option(i, i));

    // Stats
    statTotal.textContent = rows.length;
    statCompanies.textContent = companies.length;
    statCategories.textContent = cats.length;
  }

  function applyFilters() {
    const q = searchInput.value.toLowerCase().trim();
    const comp = companyFilter.value;
    const cat = categoryFilter.value;
    const ind = industryFilter.value;

    state.filtered = state.rows.filter(r => {
      const matchesQ = !q || (r.company + " " + r.job_title + " " + r.industry + " " + r.category).toLowerCase().includes(q);
      const matchesC = !comp || r.company === comp;
      const matchesCat = !cat || r.category === cat;
      const matchesInd = !ind || r.industry === ind;
      return matchesQ && matchesC && matchesCat && matchesInd;
    });
    sortAndRender();
  }

  function sortAndRender() {
    const key = state.sortKey;
    const dir = state.sortAsc ? 1 : -1;
    state.filtered.sort((a,b)=> a[key].localeCompare(b[key]) * dir);
    renderTable(state.filtered);
  }

  function renderTable(rows) {
    tableBody.innerHTML = "";
    if (!rows.length) {
      tableBody.innerHTML = `<tr><td colspan="5" class="loading">No results</td></tr>`;
      return;
    }
    for (const r of rows) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${r.company}</strong></td>
        <td>${r.job_title}</td>
        <td><span class="badge">${r.industry || "-"}</span></td>
        <td>${r.category || "-"}</td>
        <td><a class="btn" href="${r.url}" target="_blank" rel="noopener">Link</a></td>
      `;
      tableBody.appendChild(tr);
    }
  }

  function initSorting() {
    qsa("th[data-sort]").forEach(th => {
      th.addEventListener("click", () => {
        const key = th.getAttribute("data-sort");
        if (state.sortKey === key) state.sortAsc = !state.sortAsc;
        else { state.sortKey = key; state.sortAsc = true; }
        sortAndRender();
      });
    });
  }

  function bindUI() {
    searchInput.addEventListener("input", applyFilters);
    companyFilter.addEventListener("change", applyFilters);
    categoryFilter.addEventListener("change", applyFilters);
    industryFilter.addEventListener("change", applyFilters);
    resetBtn.addEventListener("click", () => {
      searchInput.value = "";
      companyFilter.value = "";
      categoryFilter.value = "";
      industryFilter.value = "";
      applyFilters();
    });

    fileInput.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        loadFromObject(data);
      } catch (err) {
        tableBody.innerHTML = `<tr><td colspan="5" class="loading">Failed to parse file: ${err}</td></tr>`;
      }
    });
  }

  function loadFromObject(data) {
    state.rows = flattenData(data);
    populateFilters(state.rows);
    state.filtered = [...state.rows];
    sortAndRender();
  }

  async function loadJSON() {
    const url = jsonParam || defaultJson;

    // If opened via file:// protocol, many browsers block fetch. We show a hint and avoid throwing.
    const isFile = location.protocol === "file:";
    try {
      if (isFile && !jsonParam) throw new Error("Local file protocol blocks fetch. Use the 'Load JSON file' button or run a local server.");
      const resp = await fetch(url, {cache:"no-store"});
      if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
      const data = await resp.json();
      loadFromObject(data);
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="5" class="loading">Failed to load JSON: ${err.message}</td></tr>`;
    }
  }

  initSorting();
  bindUI();
  loadJSON();
})();