// js/script.js - versión con selectores de ruta integrados
let paths = [];

document.addEventListener("DOMContentLoaded", () => {

  // Elementos de la página
  const mapContainer = document.getElementById("mapContainer");
  const modal = document.getElementById("modal");
  const modalBody = document.getElementById("modalBody");
  const closeModalBtn = document.getElementById("closeModal");
  const searchBtn = document.getElementById("searchBtn");
  const searchInput = document.getElementById("searchInput");

  // NUEVOS elementos (selectores de ruta)
  const fromSelect = document.getElementById("fromSelect");
  const toSelect = document.getElementById("toSelect");
  const generateRouteBtn = document.getElementById("generateRouteBtn");

  const markers = [];
  const FLOOR = Number(mapContainer.dataset.floor || 0);
  const DATA_URL = "data/aulas.json";
  const WAYS_URL = "data/caminos.json";

  // Modal (abrir/cerrar)
  function openModalWith(name) {
    if (!modal || !modalBody) return;
    modalBody.textContent = name;
    modal.setAttribute("aria-hidden", "false");
  }
  function closeModal() {
    if (!modal) return;
    modal.setAttribute("aria-hidden", "true");
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", closeModal);
  }
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
  }

  // Cargar datos de aulas y caminos
  Promise.all([fetch(DATA_URL), fetch(WAYS_URL)])
    .then(async ([aulasRes, caminosRes]) => {
      if (!aulasRes.ok) throw new Error("Error al cargar " + DATA_URL);
      if (!caminosRes.ok) throw new Error("Error al cargar " + WAYS_URL);
      const aulas = await aulasRes.json();
      paths = await caminosRes.json();
      const aulasDelPiso = aulas.filter((a) => Number(a.floor) === FLOOR);
      generateMarkers(aulasDelPiso);
      populateSelectors(aulasDelPiso);
      attachSearchHandlers();
    })
    .catch((err) => {
      console.error("Error al cargar datos:", err);
    });

  // Generar marcadores visuales
  function generateMarkers(aulas) {
    markers.forEach((m) => m.remove());
    markers.length = 0;

    aulas.forEach((aula, index) => {
      const btn = document.createElement("button");
      btn.className = "marker";
      btn.style.top = aula.top;
      btn.style.left = aula.left;
      btn.dataset.name = aula.name;
      btn.dataset.id = aula.id ?? index + 1;
      btn.textContent = String(index + 1);

      btn.addEventListener("click", () => {
        openModalWith(aula.name);
        highlightSingle(btn);
      });

      mapContainer.appendChild(btn);
      markers.push(btn);
    });
  }

  // --- NUEVO: Llenar selectores Desde/Hasta ---
  function populateSelectors(aulas) {
    if (!fromSelect || !toSelect) return;

    // Limpiar opciones previas
    fromSelect.innerHTML = '<option value="">Desde...</option>';
    toSelect.innerHTML = '<option value="">Hasta...</option>';

    aulas.forEach((aula) => {
      const opt1 = document.createElement("option");
      opt1.value = aula.id;
      opt1.textContent = aula.name;
      fromSelect.appendChild(opt1);

      const opt2 = document.createElement("option");
      opt2.value = aula.id;
      opt2.textContent = aula.name;
      toSelect.appendChild(opt2);
    });
  }

  // --- NUEVO: Generar ruta ---
  if (generateRouteBtn) {
    generateRouteBtn.addEventListener("click", () => {
      const fromId = fromSelect.value;
      const toId = toSelect.value;

      if (!fromId || !toId) {
        alert("Por favor selecciona ambas aulas.");
        return;
      }
      if (fromId === toId) {
        alert("El origen y destino no pueden ser iguales.");
        return;
      }

      const pathKey = `${fromId}-${toId}`;
      const reverseKey = `${toId}-${fromId}`;
console.log(paths);
      // Intentar buscar la ruta en caminos.json
      if (paths[pathKey]) {
        drawPath(pathKey);
      } else if (paths[reverseKey]) {
        drawPath(reverseKey);
      } else {
        alert("No hay una ruta definida entre esas aulas.");
      }
    });
  }

  // Destacar marcador seleccionado
  function highlightSingle(marker) {
    markers.forEach((m) => m.classList.remove("highlight"));
    marker.classList.add("highlight");
    centerMarker(marker);
    setTimeout(() => marker.classList.remove("highlight"), 3000);
  }

  // Búsqueda de aulas
  function attachSearchHandlers() {
    if (!searchBtn || !searchInput) return;
    searchBtn.addEventListener("click", handleSearch);
    searchInput.addEventListener("keyup", (e) => {
      if (e.key === "Enter") handleSearch();
    });
  }

  function handleSearch() {
    const q = (searchInput.value || "").trim().toLowerCase();
    if (!q) {
      markers.forEach((m) => m.classList.remove("highlight"));
      return;
    }

    const match = markers.find((m) => {
      const name = (m.dataset.name || "").toLowerCase();
      const label = (m.textContent || "").toLowerCase();
      return name.includes(q) || label === q || label.includes(q);
    });

    markers.forEach((m) => m.classList.remove("highlight"));
    if (match) {
      match.classList.add("highlight");
      centerMarker(match);
      openModalWith(match.dataset.name);
    } else {
      alert("No se encontró ninguna aula que coincida.");
    }
  }

  // Centrar el mapa en un marcador
  function centerMarker(marker) {
    if (!mapContainer || !marker) return;
    const containerRect = mapContainer.getBoundingClientRect();
    const markerCenterX = marker.offsetLeft;
    const markerCenterY = marker.offsetTop;
    const newScrollLeft = Math.max(0, markerCenterX - containerRect.width / 2);
    const newScrollTop = Math.max(0, markerCenterY - containerRect.height / 2);
    smoothScrollTo(mapContainer, newScrollLeft, newScrollTop, 350);
  }

  function smoothScrollTo(element, left, top, duration = 400) {
    const startLeft = element.scrollLeft;
    const startTop = element.scrollTop;
    const dx = left - startLeft;
    const dy = top - startTop;
    const start = performance.now();

    function step(ts) {
      const t = Math.min(1, (ts - start) / duration);
      const ease = 0.5 - Math.cos(t * Math.PI) / 2;
      element.scrollLeft = startLeft + dx * ease;
      element.scrollTop = startTop + dy * ease;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
});

// --- Funciones globales para las líneas del camino ---
function clearPaths() {
  document.querySelectorAll(".line").forEach((line) => line.remove());
}

function drawPath(key) {
  clearPaths();
  const pathData = paths[key];
  const mapContainer = document.getElementById("mapContainer");
  if (!pathData) return;

  pathData.forEach((segment) => {
    const line = document.createElement("div");
    line.classList.add("line", segment.type);
    line.style.top = segment.top;
    line.style.left = segment.left;

    if (segment.type === "horizontal") {
      line.style.width = segment.length;
    } else {
      line.style.height = segment.length;
    }

    mapContainer.appendChild(line);
  });
}
