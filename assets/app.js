const storageKey = "pantryInventory.items.v1";
const syncSettingsKey = "pantryInventory.googleSheetsSync.v1";
const locationsKey = "pantryInventory.locations.v1";
const uiSettingsKey = "pantryInventory.ui.v1";
const expiringSoonDays = 30;
const starterLocations = ["Kitchen pantry", "Basement shelves", "Deep freezer"];

const starterItems = [
  {
    id: makeId(),
    name: "Black beans",
    quantity: 4,
    unit: "can",
    category: "Canned",
    location: "Kitchen pantry",
    expires: addDays(220),
    minimum: 2,
    lastChecked: "",
    shoppingBought: false,
    shoppingQuantity: 0,
    notes: "Good for chili and taco bowls"
  },
  {
    id: makeId(),
    name: "Jasmine rice",
    quantity: 1,
    unit: "bag",
    category: "Dry goods",
    location: "Basement shelves",
    expires: addDays(180),
    minimum: 1,
    lastChecked: "",
    shoppingBought: false,
    shoppingQuantity: 0,
    notes: ""
  },
  {
    id: makeId(),
    name: "Baking powder",
    quantity: 0.5,
    unit: "count",
    category: "Baking",
    location: "Kitchen pantry",
    expires: addDays(20),
    minimum: 1,
    lastChecked: "",
    shoppingBought: false,
    shoppingQuantity: 0,
    notes: "Check before weekend pancakes"
  }
];

let items = loadItems();
let managedLocations = loadManagedLocations();
let uiSettings = loadUiSettings();
let activeView = "all";
let syncTimer;
let syncSettings = loadSyncSettings();

const elements = {
  form: document.querySelector("#itemForm"),
  itemId: document.querySelector("#itemId"),
  name: document.querySelector("#name"),
  quantity: document.querySelector("#quantity"),
  unit: document.querySelector("#unit"),
  category: document.querySelector("#category"),
  location: document.querySelector("#location"),
  newLocationField: document.querySelector("#newLocationField"),
  newLocation: document.querySelector("#newLocation"),
  expires: document.querySelector("#expires"),
  minimum: document.querySelector("#minimum"),
  notes: document.querySelector("#notes"),
  cancelEdit: document.querySelector("#cancelEdit"),
  search: document.querySelector("#search"),
  categoryFilter: document.querySelector("#categoryFilter"),
  locationFilter: document.querySelector("#locationFilter"),
  sortBy: document.querySelector("#sortBy"),
  body: document.querySelector("#inventoryBody"),
  emptyState: document.querySelector("#emptyState"),
  totalItems: document.querySelector("#totalItems"),
  lowStockCount: document.querySelector("#lowStockCount"),
  expiringCount: document.querySelector("#expiringCount"),
  locationNameInput: document.querySelector("#locationNameInput"),
  addLocation: document.querySelector("#addLocation"),
  toggleLocationList: document.querySelector("#toggleLocationList"),
  locationManagerList: document.querySelector("#locationManagerList"),
  syncEnabled: document.querySelector("#syncEnabled"),
  syncUrl: document.querySelector("#syncUrl"),
  syncKey: document.querySelector("#syncKey"),
  syncAutoLoad: document.querySelector("#syncAutoLoad"),
  syncDetails: document.querySelector("#syncDetails"),
  toggleSyncPanel: document.querySelector("#toggleSyncPanel"),
  syncStatus: document.querySelector("#syncStatus"),
  saveSyncSettings: document.querySelector("#saveSyncSettings"),
  loadLatest: document.querySelector("#loadLatest"),
  syncNow: document.querySelector("#syncNow"),
  transferPanel: document.querySelector("#transferPanel"),
  transferItemName: document.querySelector("#transferItemName"),
  transferItemId: document.querySelector("#transferItemId"),
  transferAmount: document.querySelector("#transferAmount"),
  transferDestination: document.querySelector("#transferDestination"),
  transferNewLocationField: document.querySelector("#transferNewLocationField"),
  transferNewLocation: document.querySelector("#transferNewLocation"),
  transferNote: document.querySelector("#transferNote"),
  closeTransfer: document.querySelector("#closeTransfer"),
  completeTransfer: document.querySelector("#completeTransfer"),
  restockPanel: document.querySelector("#restockPanel"),
  restockItemName: document.querySelector("#restockItemName"),
  restockItemId: document.querySelector("#restockItemId"),
  restockAmount: document.querySelector("#restockAmount"),
  restockDestination: document.querySelector("#restockDestination"),
  restockNewLocationField: document.querySelector("#restockNewLocationField"),
  restockNewLocation: document.querySelector("#restockNewLocation"),
  closeRestock: document.querySelector("#closeRestock"),
  completeRestock: document.querySelector("#completeRestock"),
  markVisibleChecked: document.querySelector("#markVisibleChecked"),
  locationCards: document.querySelector("#locationCards"),
  tableWrap: document.querySelector("#tableWrap"),
  tabs: document.querySelectorAll(".tab")
};

elements.form.addEventListener("submit", saveItem);
elements.cancelEdit.addEventListener("click", resetForm);
elements.location.addEventListener("change", updateNewLocationVisibility);
elements.addLocation.addEventListener("click", addManagedLocation);
elements.toggleLocationList.addEventListener("click", toggleLocationList);
elements.locationNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addManagedLocation();
  }
});
elements.search.addEventListener("input", render);
elements.categoryFilter.addEventListener("change", render);
elements.locationFilter.addEventListener("change", render);
elements.sortBy.addEventListener("change", render);
elements.saveSyncSettings.addEventListener("click", saveSyncSettings);
elements.syncEnabled.addEventListener("change", saveSyncSettings);
elements.syncAutoLoad.addEventListener("change", saveSyncSettings);
elements.toggleSyncPanel.addEventListener("click", toggleSyncPanel);
elements.loadLatest.addEventListener("click", () => loadFromGoogleSheets({ manual: true }));
elements.syncNow.addEventListener("click", () => syncToGoogleSheets({ manual: true }));
elements.closeTransfer.addEventListener("click", closeTransferPanel);
elements.completeTransfer.addEventListener("click", completeTransfer);
elements.transferDestination.addEventListener("change", updateTransferNewLocationVisibility);
elements.closeRestock.addEventListener("click", closeRestockPanel);
elements.completeRestock.addEventListener("click", completeRestock);
elements.restockDestination.addEventListener("change", updateRestockNewLocationVisibility);
elements.markVisibleChecked.addEventListener("click", markVisibleChecked);

elements.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    activeView = tab.dataset.view;
    if (activeView === "locations") {
      elements.locationFilter.value = "all";
    }
    elements.tabs.forEach((button) => button.classList.toggle("active", button === tab));
    render();
  });
});

renderSyncSettings();
renderLocationListState();
render();

if (syncSettings.enabled && syncSettings.autoLoad && syncSettings.url && syncSettings.key) {
  window.setTimeout(() => loadFromGoogleSheets({ manual: false }), 400);
}

function loadItems() {
  const rawItems = localStorage.getItem(storageKey);

  if (!rawItems) {
    localStorage.setItem(storageKey, JSON.stringify(starterItems));
    return starterItems;
  }

  try {
    const parsedItems = JSON.parse(rawItems);
    return Array.isArray(parsedItems) ? parsedItems : [];
  } catch {
    return [];
  }
}

function saveItems() {
  localStorage.setItem(storageKey, JSON.stringify(items));
}

function loadManagedLocations() {
  try {
    const parsedLocations = JSON.parse(localStorage.getItem(locationsKey));
    if (Array.isArray(parsedLocations)) {
      return mergeLocations(parsedLocations);
    }
  } catch {
    // Fall through to starter locations.
  }

  return mergeLocations(starterLocations);
}

function saveManagedLocations() {
  managedLocations = mergeLocations(managedLocations);
  localStorage.setItem(locationsKey, JSON.stringify(managedLocations));
}

function loadUiSettings() {
  try {
    return {
      locationsExpanded: false,
      ...(JSON.parse(localStorage.getItem(uiSettingsKey)) || {})
    };
  } catch {
    return { locationsExpanded: false };
  }
}

function saveUiSettings() {
  localStorage.setItem(uiSettingsKey, JSON.stringify(uiSettings));
}

function loadSyncSettings() {
  try {
    return {
      enabled: false,
      url: "",
      key: "",
      autoLoad: false,
      expanded: false,
      lastSyncAt: "",
      lastLoadAt: "",
      ...(JSON.parse(localStorage.getItem(syncSettingsKey)) || {})
    };
  } catch {
    return { enabled: false, url: "", key: "", autoLoad: false, expanded: false, lastSyncAt: "", lastLoadAt: "" };
  }
}

function saveSyncSettingsToStorage() {
  localStorage.setItem(syncSettingsKey, JSON.stringify(syncSettings));
}

function saveSyncSettings() {
  syncSettings = {
    ...syncSettings,
    enabled: elements.syncEnabled.checked,
    autoLoad: elements.syncAutoLoad.checked,
    url: elements.syncUrl.value.trim(),
    key: elements.syncKey.value.trim()
  };
  saveSyncSettingsToStorage();
  renderSyncSettings();

  if (syncSettings.enabled && syncSettings.url) {
    syncToGoogleSheets({ manual: true });
  }
}

function renderSyncSettings() {
  elements.syncEnabled.checked = Boolean(syncSettings.enabled);
  elements.syncAutoLoad.checked = Boolean(syncSettings.autoLoad);
  elements.syncUrl.value = syncSettings.url || "";
  elements.syncKey.value = syncSettings.key || "";
  renderSyncPanelState();

  if (!syncSettings.url) {
    setSyncStatus("Not connected", "warn");
    return;
  }

  if (!syncSettings.key) {
    setSyncStatus("Add a private sync key", "warn");
    return;
  }

  if (!syncSettings.enabled) {
    setSyncStatus("Saved, currently off", "warn");
    return;
  }

  if (syncSettings.lastSyncAt) {
    setSyncStatus(`Last sync attempt ${formatDateTime(syncSettings.lastSyncAt)}`, "ok");
    return;
  }

  if (syncSettings.lastLoadAt) {
    setSyncStatus(`Loaded latest ${formatDateTime(syncSettings.lastLoadAt)}`, "ok");
    return;
  }

  setSyncStatus("Ready to sync", "ok");
}

function toggleSyncPanel() {
  syncSettings = {
    ...syncSettings,
    expanded: !syncSettings.expanded
  };
  saveSyncSettingsToStorage();
  renderSyncPanelState();
}

function renderSyncPanelState() {
  const expanded = Boolean(syncSettings.expanded);
  elements.syncDetails.hidden = !expanded;
  elements.toggleSyncPanel.textContent = expanded ? "Collapse" : "Expand";
  elements.toggleSyncPanel.setAttribute("aria-expanded", String(expanded));
}

function saveItem(event) {
  event.preventDefault();

  const existingIndex = items.findIndex((currentItem) => currentItem.id === elements.itemId.value);
  const item = {
    id: elements.itemId.value || makeId(),
    name: elements.name.value.trim(),
    quantity: Number(elements.quantity.value),
    unit: elements.unit.value,
    category: elements.category.value,
    location: getSelectedLocation(),
    expires: elements.expires.value,
    minimum: Number(elements.minimum.value),
    lastChecked: existingIndex >= 0 ? items[existingIndex].lastChecked || "" : "",
    shoppingBought: existingIndex >= 0 ? Boolean(items[existingIndex].shoppingBought) : false,
    shoppingQuantity: existingIndex >= 0 ? Number(items[existingIndex].shoppingQuantity || 0) : 0,
    notes: elements.notes.value.trim()
  };

  if (!item.name) {
    elements.name.focus();
    return;
  }

  if (!item.location) {
    if (elements.location.value === "__new__") {
      elements.newLocation.focus();
    } else {
      elements.location.focus();
    }
    return;
  }

  if (existingIndex >= 0) {
    items[existingIndex] = item;
  } else {
    items.unshift(item);
  }

  saveItems();
  addLocationIfMissing(item.location);
  queueSync();
  resetForm();
  render();
}

function resetForm() {
  elements.form.reset();
  elements.itemId.value = "";
  elements.quantity.value = "1";
  elements.minimum.value = "1";
  elements.newLocation.value = "";
  elements.newLocationField.hidden = true;
  elements.cancelEdit.hidden = true;
  elements.form.querySelector(".primary").textContent = "Save item";
}

function editItem(id) {
  const item = items.find((currentItem) => currentItem.id === id);
  if (!item) return;

  elements.itemId.value = item.id;
  elements.name.value = item.name;
  elements.quantity.value = item.quantity;
  elements.unit.value = item.unit;
  elements.category.value = item.category;
  setLocationSelectValue(elements.location, item.location || "");
  updateNewLocationVisibility();
  elements.expires.value = item.expires || "";
  elements.minimum.value = item.minimum ?? 0;
  elements.notes.value = item.notes || "";
  elements.cancelEdit.hidden = false;
  elements.form.querySelector(".primary").textContent = "Update item";
  elements.name.focus();
}

function deleteItem(id) {
  const item = items.find((currentItem) => currentItem.id === id);
  if (!item || !confirm(`Remove ${item.name} from your pantry?`)) return;

  items = items.filter((currentItem) => currentItem.id !== id);
  saveItems();
  queueSync();
  render();
}

function adjustQuantity(id, amount) {
  items = items.map((item) => {
    if (item.id !== id) return item;
    return {
      ...item,
      quantity: Math.max(0, Number((Number(item.quantity) + amount).toFixed(2)))
    };
  });

  saveItems();
  queueSync();
  render();
}

function confirmAudit(id) {
  items = items.map((item) => {
    if (item.id !== id) return item;
    return {
      ...item,
      lastChecked: new Date().toISOString().slice(0, 10)
    };
  });

  saveItems();
  queueSync();
  render();
}

function transferItem(id) {
  const item = items.find((currentItem) => currentItem.id === id);
  if (!item) return;

  elements.transferPanel.hidden = false;
  elements.transferItemId.value = item.id;
  elements.transferItemName.textContent = `${item.name} from ${item.location || "Unassigned"}`;
  elements.transferAmount.value = Math.min(1, Number(item.quantity)) || 1;
  elements.transferAmount.max = item.quantity;
  setLocationSelectValue(elements.transferDestination, getDefaultTransferDestination(item.location));
  elements.transferNewLocation.value = "";
  updateTransferNewLocationVisibility();
  elements.transferNote.value = "";
  elements.transferAmount.focus();
}

function closeTransferPanel() {
  elements.transferPanel.hidden = true;
  elements.transferItemId.value = "";
  elements.transferNewLocation.value = "";
  elements.transferNewLocationField.hidden = true;
}

function completeTransfer() {
  const item = items.find((currentItem) => currentItem.id === elements.transferItemId.value);
  if (!item) return;

  const amount = Number(elements.transferAmount.value);
  if (!Number.isFinite(amount) || amount <= 0) return;

  const availableAmount = Math.min(amount, Number(item.quantity));
  if (availableAmount <= 0) return;

  const destinationLocation = getSelectedTransferDestination();
  if (!destinationLocation) {
    if (elements.transferDestination.value === "__new__") {
      elements.transferNewLocation.focus();
    } else {
      elements.transferDestination.focus();
    }
    return;
  }

  const note = elements.transferNote.value.trim();
  const sourceLocation = normalizeLocation(item.location);
  if (destinationLocation === sourceLocation) return;

  const match = items.find(
    (currentItem) =>
      currentItem.id !== item.id &&
      currentItem.name.toLowerCase() === item.name.toLowerCase() &&
      currentItem.unit === item.unit &&
      currentItem.category === item.category &&
      normalizeLocation(currentItem.location) === destinationLocation
  );

  items = items
    .map((currentItem) => {
      if (currentItem.id === item.id) {
        return {
          ...currentItem,
          quantity: Number((Number(currentItem.quantity) - availableAmount).toFixed(2))
        };
      }

      if (match && currentItem.id === match.id) {
        return {
          ...currentItem,
          quantity: Number((Number(currentItem.quantity) + availableAmount).toFixed(2))
        };
      }

      return currentItem;
    })
    .filter((currentItem) => currentItem.quantity > 0);

  if (!match) {
    items.unshift({
      ...item,
      id: makeId(),
      quantity: availableAmount,
      location: destinationLocation,
      notes: buildTransferNote(item.notes, sourceLocation, note),
      shoppingBought: false,
      shoppingQuantity: 0,
      lastChecked: ""
    });
  }

  saveItems();
  addLocationIfMissing(destinationLocation);
  queueSync();
  closeTransferPanel();
  render();
}

function markBought(id) {
  items = items.map((item) => {
    if (item.id !== id) return item;
    return {
      ...item,
      shoppingBought: true,
      shoppingQuantity: getNeededQuantity(item)
    };
  });

  saveItems();
  queueSync();
  render();
}

function clearBought(id) {
  items = items.map((item) => {
    if (item.id !== id) return item;
    return {
      ...item,
      shoppingBought: false,
      shoppingQuantity: 0
    };
  });

  saveItems();
  queueSync();
  render();
}

function restockItem(id) {
  const item = items.find((currentItem) => currentItem.id === id);
  if (!item) return;

  elements.restockPanel.hidden = false;
  elements.restockItemId.value = item.id;
  elements.restockItemName.textContent = `${item.name} for ${item.location || "Unassigned"}`;
  elements.restockAmount.value = item.shoppingQuantity || getNeededQuantity(item) || 1;
  setLocationSelectValue(elements.restockDestination, item.location || getDefaultTransferDestination(""));
  elements.restockNewLocation.value = "";
  updateRestockNewLocationVisibility();
  elements.restockAmount.focus();
}

function closeRestockPanel() {
  elements.restockPanel.hidden = true;
  elements.restockItemId.value = "";
  elements.restockNewLocation.value = "";
  elements.restockNewLocationField.hidden = true;
}

function completeRestock() {
  const item = items.find((currentItem) => currentItem.id === elements.restockItemId.value);
  if (!item) return;

  const amount = Number(elements.restockAmount.value);
  if (!Number.isFinite(amount) || amount <= 0) return;

  const destinationLocation = getSelectedRestockDestination();
  if (!destinationLocation) {
    if (elements.restockDestination.value === "__new__") {
      elements.restockNewLocation.focus();
    } else {
      elements.restockDestination.focus();
    }
    return;
  }

  const match = items.find(
    (currentItem) =>
      currentItem.id !== item.id &&
      currentItem.name.toLowerCase() === item.name.toLowerCase() &&
      currentItem.unit === item.unit &&
      currentItem.category === item.category &&
      normalizeLocation(currentItem.location) === destinationLocation
  );

  items = items.map((currentItem) => {
    if (normalizeLocation(currentItem.location) === destinationLocation && currentItem.id === item.id) {
      return {
        ...currentItem,
        quantity: Number((Number(currentItem.quantity) + amount).toFixed(2)),
        shoppingBought: false,
        shoppingQuantity: 0
      };
    }

    if (match && currentItem.id === match.id) {
      return {
        ...currentItem,
        quantity: Number((Number(currentItem.quantity) + amount).toFixed(2))
      };
    }

    if (currentItem.id === item.id) {
      return {
        ...currentItem,
        shoppingBought: false,
        shoppingQuantity: 0
      };
    }

    return currentItem;
  });

  if (!match && normalizeLocation(item.location) !== destinationLocation) {
    items.unshift({
      ...item,
      id: makeId(),
      quantity: amount,
      location: destinationLocation,
      notes: buildTransferNote(item.notes, "Shopping", "Restocked"),
      shoppingBought: false,
      shoppingQuantity: 0,
      lastChecked: ""
    });
  }

  saveItems();
  addLocationIfMissing(destinationLocation);
  queueSync();
  closeRestockPanel();
  render();
}

function addToShopping(id) {
  items = items.map((item) => {
    if (item.id !== id) return item;

    return {
      ...item,
      shoppingQuantity: item.shoppingQuantity || getSuggestedShoppingQuantity(item),
      shoppingBought: false
    };
  });

  saveItems();
  queueSync();
  activeView = "shopping";
  elements.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === activeView));
  render();
}

function render() {
  renderCategoryFilter();
  renderLocationControls();
  renderLocationManager();
  renderSummary();
  renderLocationCards();

  const visibleItems = getVisibleItems();
  elements.body.innerHTML = visibleItems.map(itemRow).join("");
  elements.emptyState.classList.toggle("visible", visibleItems.length === 0);
  elements.locationCards.hidden = activeView !== "locations";
  elements.markVisibleChecked.hidden = activeView !== "audit";

  elements.body.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.id;
      const action = button.dataset.action;

      if (action === "edit") editItem(id);
      if (action === "delete") deleteItem(id);
      if (action === "add") adjustQuantity(id, 1);
      if (action === "subtract") adjustQuantity(id, -1);
      if (action === "check") confirmAudit(id);
      if (action === "transfer") transferItem(id);
      if (action === "shop") addToShopping(id);
      if (action === "bought") markBought(id);
      if (action === "unbought") clearBought(id);
      if (action === "restock") restockItem(id);
    });
  });

  elements.locationCards.querySelectorAll("[data-location]").forEach((button) => {
    button.addEventListener("click", () => {
      elements.locationFilter.value = button.dataset.location;
      activeView = "all";
      elements.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === activeView));
      render();
    });
  });

  elements.locationManagerList.querySelectorAll("[data-location-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const location = button.dataset.location;
      const action = button.dataset.locationAction;

      if (action === "rename") renameManagedLocation(location);
      if (action === "delete") deleteManagedLocation(location);
    });
  });
}

function getVisibleItems() {
  const searchTerm = elements.search.value.trim().toLowerCase();
  const category = elements.categoryFilter.value;
  const location = elements.locationFilter.value;
  const sortBy = elements.sortBy.value;

  return items
    .filter((item) => {
      const values = [item.name, item.category, item.location, item.notes].join(" ").toLowerCase();
      const matchesSearch = activeView === "locations" || values.includes(searchTerm);
      const matchesCategory = activeView === "locations" || category === "all" || item.category === category;
      const matchesLocation =
        activeView === "locations" || location === "all" || getItemLocation(item) === location;
      const matchesView =
        activeView === "all" ||
        (activeView === "low" && isLowStock(item)) ||
        (activeView === "expiring" && isExpiringSoon(item)) ||
        activeView === "locations" ||
        activeView === "audit" ||
        (activeView === "shopping" && isShoppingItem(item));

      return matchesSearch && matchesCategory && matchesLocation && matchesView;
    })
    .sort((first, second) => {
      if (sortBy === "quantity") return Number(first.quantity) - Number(second.quantity);
      if (sortBy === "expires") return expirationValue(first) - expirationValue(second);
      if (sortBy === "lastChecked") return checkedValue(first) - checkedValue(second);
      return String(first[sortBy] || "").localeCompare(String(second[sortBy] || ""));
    });
}

function renderCategoryFilter() {
  const categories = [...new Set(items.map((item) => item.category))].sort();
  const selected = elements.categoryFilter.value;
  elements.categoryFilter.innerHTML = `<option value="all">All categories</option>${categories
    .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
    .join("")}`;
  elements.categoryFilter.value = categories.includes(selected) ? selected : "all";
}

function renderLocationControls() {
  const locations = getLocations();
  const selected = elements.locationFilter.value;
  elements.locationFilter.innerHTML = `<option value="all">All locations</option>${locations
    .map((location) => `<option value="${escapeHtml(location)}">${escapeHtml(location)}</option>`)
    .join("")}`;
  elements.locationFilter.value = locations.includes(selected) ? selected : "all";

  refreshLocationSelect(elements.location, getSelectedLocation());
  refreshLocationSelect(elements.transferDestination, getSelectedTransferDestination());
  refreshLocationSelect(elements.restockDestination, getSelectedRestockDestination());
  updateNewLocationVisibility();
  updateTransferNewLocationVisibility();
  updateRestockNewLocationVisibility();

  const locationOptions = document.querySelector("#locationOptions");
  locationOptions.innerHTML = locations.map((location) => `<option value="${escapeHtml(location)}"></option>`).join("");
}

function renderLocationCards() {
  const cards = getLocations().map((location) => {
    const locationItems = items.filter((item) => getItemLocation(item) === location);
    const lowCount = locationItems.filter(isLowStock).length;
    const expiringCount = locationItems.filter(isExpiringSoon).length;
    const totalQuantity = locationItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

    return `
      <button class="location-card" type="button" data-location="${escapeHtml(location)}">
        <strong>${escapeHtml(location)}</strong>
        <span>${locationItems.length} items, ${formatNumber(totalQuantity)} total units</span>
        <span>${lowCount} low stock, ${expiringCount} expiring</span>
      </button>
    `;
  });

  elements.locationCards.innerHTML = cards.join("");
}

function renderLocationManager() {
  elements.locationManagerList.innerHTML = getLocations()
    .map((location) => {
      const itemCount = items.filter((item) => getItemLocation(item) === location).length;
      const deleteDisabled = itemCount > 0 ? "disabled" : "";
      const deleteTitle = itemCount > 0 ? "Move or rename items before deleting this location" : "Delete location";

      return `
        <div class="location-manager-row">
          <div>
            <strong>${escapeHtml(location)}</strong>
            <div class="location-meta">${itemCount} item${itemCount === 1 ? "" : "s"}</div>
          </div>
          <button type="button" data-location-action="rename" data-location="${escapeHtml(location)}">Rename</button>
          <button type="button" data-location-action="delete" data-location="${escapeHtml(location)}" title="${escapeHtml(deleteTitle)}" ${deleteDisabled}>Delete</button>
        </div>
      `;
    })
    .join("");
  renderLocationListState();
}

function toggleLocationList() {
  uiSettings = {
    ...uiSettings,
    locationsExpanded: !uiSettings.locationsExpanded
  };
  saveUiSettings();
  renderLocationListState();
}

function renderLocationListState() {
  const expanded = Boolean(uiSettings.locationsExpanded);
  elements.locationManagerList.hidden = !expanded;
  elements.toggleLocationList.textContent = expanded ? "Hide list" : "Show list";
  elements.toggleLocationList.setAttribute("aria-expanded", String(expanded));
}

function addManagedLocation() {
  const location = normalizeLocation(elements.locationNameInput.value);
  if (!location) {
    elements.locationNameInput.focus();
    return;
  }

  addLocationIfMissing(location);
  elements.locationNameInput.value = "";
  render();
}

function renameManagedLocation(location) {
  const currentLocation = normalizeLocation(location);
  const nextLocation = normalizeLocation(prompt("Rename location to:", currentLocation));
  if (!nextLocation || nextLocation === currentLocation) return;

  const existingLocation = getLocations().find((knownLocation) => knownLocation.toLowerCase() === nextLocation.toLowerCase());
  if (existingLocation && existingLocation !== currentLocation) {
    alert("That location already exists.");
    return;
  }

  items = items.map((item) =>
    normalizeLocation(item.location) === currentLocation ? { ...item, location: nextLocation } : item
  );
  managedLocations = managedLocations.map((knownLocation) =>
    knownLocation === currentLocation ? nextLocation : knownLocation
  );
  addLocationIfMissing(nextLocation);
  saveManagedLocations();
  saveItems();
  queueSync();
  render();
}

function deleteManagedLocation(location) {
  const currentLocation = normalizeLocation(location);
  const itemCount = items.filter((item) => normalizeLocation(item.location) === currentLocation).length;

  if (itemCount > 0) {
    alert("Move or rename items before deleting this location.");
    return;
  }

  if (!confirm(`Delete ${currentLocation}?`)) return;

  managedLocations = managedLocations.filter((knownLocation) => knownLocation !== currentLocation);
  saveManagedLocations();
  render();
}

function renderSummary() {
  elements.totalItems.textContent = items.length;
  elements.lowStockCount.textContent = items.filter(isLowStock).length;
  elements.expiringCount.textContent = items.filter(isExpiringSoon).length;
}

function markVisibleChecked() {
  const visibleIds = new Set(getVisibleItems().map((item) => item.id));
  if (!visibleIds.size) return;

  const checkedDate = new Date().toISOString().slice(0, 10);
  items = items.map((item) => (visibleIds.has(item.id) ? { ...item, lastChecked: checkedDate } : item));
  saveItems();
  queueSync();
  render();
}

function itemRow(item) {
  const expirationStatus = getExpirationStatus(item);
  const lowStock = isLowStock(item);
  const shoppingMode = activeView === "shopping";
  const auditMode = activeView === "audit";
  const checkedStatus = item.lastChecked ? `Checked ${formatDate(item.lastChecked)}` : "Not checked";
  const shoppingStatus = getShoppingStatus(item);

  return `
    <tr>
      <td>
        <div class="item-name">${escapeHtml(item.name)}</div>
        ${item.notes ? `<div class="item-notes">${escapeHtml(item.notes)}</div>` : ""}
      </td>
      <td>
        <span class="pill ${lowStock ? "status-low" : ""}">${formatNumber(item.quantity)} ${escapeHtml(item.unit)}</span>
      </td>
      <td>${escapeHtml(item.category)}</td>
      <td>${escapeHtml(item.location || "-")}</td>
      <td>
        ${auditMode ? `<span class="pill">${escapeHtml(checkedStatus)}</span>` : shoppingMode ? shoppingStatus : expirationStatus}
      </td>
      <td>
        <div class="row-actions">
          ${
            shoppingMode
              ? shoppingActions(item)
              : `<button type="button" data-action="subtract" data-id="${item.id}" title="Use one">-</button>
                 <button type="button" data-action="add" data-id="${item.id}" title="Add one">+</button>`
          }
          ${auditMode ? `<button type="button" data-action="check" data-id="${item.id}">Checked</button>` : ""}
          ${shoppingMode ? "" : `<button type="button" data-action="shop" data-id="${item.id}">Shop</button>`}
          <button type="button" data-action="transfer" data-id="${item.id}">Transfer</button>
          <button type="button" data-action="edit" data-id="${item.id}">Edit</button>
          <button type="button" data-action="delete" data-id="${item.id}">Delete</button>
        </div>
      </td>
    </tr>
  `;
}

function getExpirationStatus(item) {
  if (!item.expires) return "-";

  const days = daysUntil(item.expires);
  if (days < 0) {
    return `<span class="pill status-expired">Expired ${Math.abs(days)}d ago</span>`;
  }
  if (days <= expiringSoonDays) {
    return `<span class="pill status-soon">${days}d left</span>`;
  }

  return escapeHtml(formatDate(item.expires));
}

function getShoppingStatus(item) {
  if (item.shoppingBought) {
    const quantity = item.shoppingQuantity || getNeededQuantity(item) || 1;
    return `<span class="pill status-soon">Bought ${formatNumber(quantity)} ${escapeHtml(item.unit)}</span>`;
  }

  const needed = item.shoppingQuantity || getNeededQuantity(item) || 1;
  return `<span class="pill status-low">Need ${formatNumber(needed)} ${escapeHtml(item.unit)}</span>`;
}

function shoppingActions(item) {
  if (item.shoppingBought) {
    return `
      <button type="button" data-action="restock" data-id="${item.id}">Restock</button>
      <button type="button" data-action="unbought" data-id="${item.id}">Undo bought</button>
    `;
  }

  return `
    <button type="button" data-action="bought" data-id="${item.id}">Bought</button>
    <button type="button" data-action="edit" data-id="${item.id}">Edit</button>
  `;
}

function getNeededQuantity(item) {
  return Math.max(0, Number((Number(item.minimum || 0) - Number(item.quantity || 0)).toFixed(2)));
}

function getSuggestedShoppingQuantity(item) {
  return getNeededQuantity(item) || Number(item.minimum || 0) || 1;
}

function isShoppingItem(item) {
  return isLowStock(item) || item.shoppingBought || Number(item.shoppingQuantity || 0) > 0;
}

function isLowStock(item) {
  return Number(item.quantity) <= Number(item.minimum || 0);
}

function isExpiringSoon(item) {
  if (!item.expires) return false;
  return daysUntil(item.expires) <= expiringSoonDays;
}

function expirationValue(item) {
  return item.expires ? new Date(`${item.expires}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
}

function checkedValue(item) {
  return item.lastChecked ? new Date(`${item.lastChecked}T00:00:00`).getTime() : 0;
}

function getLocations() {
  const itemLocations = items.map(getItemLocation).filter(Boolean);
  return mergeLocations([...managedLocations, ...itemLocations]);
}

function getItemLocation(item) {
  return normalizeLocation(item.location) || "Unassigned";
}

function normalizeLocation(location) {
  return String(location || "").trim();
}

function mergeLocations(locations) {
  const normalizedLocations = locations.map(normalizeLocation).filter(Boolean);
  const locationMap = new Map();

  normalizedLocations.forEach((location) => {
    const key = location.toLowerCase();
    if (!locationMap.has(key)) {
      locationMap.set(key, location);
    }
  });

  return [...locationMap.values()].sort();
}

function addLocationIfMissing(location) {
  const normalized = normalizeLocation(location);
  if (!normalized) return;

  const exists = managedLocations.some((knownLocation) => knownLocation.toLowerCase() === normalized.toLowerCase());
  if (!exists) {
    managedLocations.push(normalized);
    saveManagedLocations();
  }
}

function refreshLocationSelect(select, preferredValue) {
  const locations = getLocations();
  const currentValue = normalizeLocation(preferredValue);
  const options = locations
    .map((location) => `<option value="${escapeHtml(location)}">${escapeHtml(location)}</option>`)
    .join("");

  select.innerHTML = `${options}<option value="__new__">Add new location...</option>`;
  setLocationSelectValue(select, currentValue);
}

function setLocationSelectValue(select, location) {
  const normalized = normalizeLocation(location);
  const locations = getLocations();

  if (!normalized) {
    select.value = locations[0] || "__new__";
    return;
  }

  if (locations.includes(normalized)) {
    select.value = normalized;
    return;
  }

  select.value = "__new__";

  if (select === elements.location) {
    elements.newLocation.value = normalized;
  }

  if (select === elements.transferDestination) {
    elements.transferNewLocation.value = normalized;
  }

  if (select === elements.restockDestination) {
    elements.restockNewLocation.value = normalized;
  }
}

function getSelectedLocation() {
  if (elements.location.value === "__new__") {
    return normalizeLocation(elements.newLocation.value);
  }

  return normalizeLocation(elements.location.value);
}

function getSelectedTransferDestination() {
  if (elements.transferDestination.value === "__new__") {
    return normalizeLocation(elements.transferNewLocation.value);
  }

  return normalizeLocation(elements.transferDestination.value);
}

function getSelectedRestockDestination() {
  if (elements.restockDestination.value === "__new__") {
    return normalizeLocation(elements.restockNewLocation.value);
  }

  return normalizeLocation(elements.restockDestination.value);
}

function updateNewLocationVisibility() {
  elements.newLocationField.hidden = elements.location.value !== "__new__";
  if (!elements.newLocationField.hidden) {
    elements.newLocation.focus();
  }
}

function updateTransferNewLocationVisibility() {
  elements.transferNewLocationField.hidden = elements.transferDestination.value !== "__new__";
  if (!elements.transferNewLocationField.hidden) {
    elements.transferNewLocation.focus();
  }
}

function updateRestockNewLocationVisibility() {
  elements.restockNewLocationField.hidden = elements.restockDestination.value !== "__new__";
  if (!elements.restockNewLocationField.hidden) {
    elements.restockNewLocation.focus();
  }
}

function getDefaultTransferDestination(sourceLocation) {
  const normalized = normalizeLocation(sourceLocation);
  if (normalized === "Kitchen pantry") return "Basement shelves";
  return "Kitchen pantry";
}

function buildTransferNote(existingNotes, sourceLocation, transferNote) {
  const noteParts = [];
  if (existingNotes) noteParts.push(existingNotes);
  noteParts.push(`Transferred from ${sourceLocation || "Unassigned"}`);
  if (transferNote) noteParts.push(transferNote);
  return noteParts.join(" | ");
}

function daysUntil(dateString) {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(`${dateString}T00:00:00`);
  return Math.ceil((target - todayStart) / 86400000);
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(`${dateString}T00:00:00`)
  );
}

function formatNumber(value) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function makeId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function exportData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    locations: managedLocations,
    items
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `pantry-inventory-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function importData(event) {
  const [file] = event.target.files;
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const importedItems = Array.isArray(parsed) ? parsed : parsed.items;
    const importedLocations = Array.isArray(parsed.locations) ? parsed.locations : [];

    if (!Array.isArray(importedItems)) {
      throw new Error("No items found");
    }

    items = importedItems.map(normalizeImportedItem);
    managedLocations = mergeLocations([...managedLocations, ...importedLocations, ...items.map((item) => item.location)]);
    saveManagedLocations();

    saveItems();
    queueSync();
    resetForm();
    render();
  } catch {
    alert("That file could not be imported. Please choose a pantry inventory JSON export.");
  } finally {
    event.target.value = "";
  }
}

function normalizeImportedItem(item) {
  return {
    id: item.id || makeId(),
    name: String(item.name || "").trim(),
    quantity: Number(item.quantity || 0),
    unit: item.unit || "count",
    category: item.category || "Dry goods",
    location: item.location || "",
    expires: item.expires || "",
    minimum: Number(item.minimum || 0),
    lastChecked: item.lastChecked || "",
    shoppingBought: Boolean(item.shoppingBought),
    shoppingQuantity: Number(item.shoppingQuantity || 0),
    notes: item.notes || ""
  };
}

function queueSync() {
  if (!syncSettings.enabled || !syncSettings.url) return;

  window.clearTimeout(syncTimer);
  setSyncStatus("Sync pending", "warn");
  syncTimer = window.setTimeout(() => syncToGoogleSheets({ manual: false }), 800);
}

function syncToGoogleSheets({ manual }) {
  syncSettings = {
    ...syncSettings,
    enabled: elements.syncEnabled.checked,
    autoLoad: elements.syncAutoLoad.checked,
    url: elements.syncUrl.value.trim(),
    key: elements.syncKey.value.trim()
  };
  saveSyncSettingsToStorage();

  if (!syncSettings.url) {
    setSyncStatus("Add the Apps Script URL first", "error");
    return;
  }

  if (!syncSettings.enabled) {
    setSyncStatus("Turn sync on first", "warn");
    return;
  }

  if (!syncSettings.key) {
    setSyncStatus("Add the private sync key first", "error");
    return;
  }

  if (manual && !syncSettings.lastLoadAt) {
    const shouldSync = confirm(
      "This browser has not loaded latest from Google Sheets yet. Load latest first to avoid overwriting newer data from another device.\n\nSync anyway?"
    );

    if (!shouldSync) {
      setSyncStatus("Load latest before syncing this device", "warn");
      return;
    }
  }

  setSyncStatus("Syncing to Google Sheets", "warn");

  const payload = {
    source: "Pantry Inventory",
    key: syncSettings.key,
    syncedAt: new Date().toISOString(),
    itemCount: items.length,
    locations: managedLocations,
    items
  };

  submitSyncForm(syncSettings.url, JSON.stringify(payload));
  syncSettings.lastSyncAt = payload.syncedAt;
  saveSyncSettingsToStorage();
  setSyncStatus(`Last sync attempt ${formatDateTime(payload.syncedAt)}`, "ok");
}

async function loadFromGoogleSheets({ manual }) {
  syncSettings = {
    ...syncSettings,
    enabled: elements.syncEnabled.checked,
    autoLoad: elements.syncAutoLoad.checked,
    url: elements.syncUrl.value.trim(),
    key: elements.syncKey.value.trim()
  };
  saveSyncSettingsToStorage();

  if (!syncSettings.url) {
    setSyncStatus("Add the Apps Script URL first", "error");
    return;
  }

  if (!syncSettings.key) {
    setSyncStatus("Add the private sync key first", "error");
    return;
  }

  setSyncStatus("Loading latest from Google Sheets", "warn");

  try {
    const payload = await loadJsonp(syncSettings.url, {
      action: "load",
      key: syncSettings.key
    });

    if (!payload || payload.ok === false) {
      throw new Error(payload && payload.error ? payload.error : "Load failed");
    }

    const loadedItems = Array.isArray(payload.items) ? payload.items : [];
    const loadedLocations = Array.isArray(payload.locations) ? payload.locations : [];

    items = loadedItems.map(normalizeImportedItem);
    managedLocations = mergeLocations([...starterLocations, ...loadedLocations, ...items.map((item) => item.location)]);
    saveManagedLocations();
    saveItems();

    syncSettings.lastLoadAt = payload.loadedAt || new Date().toISOString();
    saveSyncSettingsToStorage();
    renderSyncSettings();
    resetForm();
    closeTransferPanel();
    closeRestockPanel();
    render();
    setSyncStatus(`Loaded latest ${formatDateTime(syncSettings.lastLoadAt)}`, "ok");
  } catch {
    setSyncStatus(manual ? "Could not load from Sheets" : "Auto-load failed", "error");
  }
}

function loadJsonp(url, params) {
  return new Promise((resolve, reject) => {
    const callbackName = `pantrySheetLoad_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Timed out"));
    }, 15000);

    function cleanup() {
      window.clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    }

    window[callbackName] = (payload) => {
      cleanup();
      resolve(payload);
    };

    const requestUrl = new URL(url);
    Object.entries({ ...params, callback: callbackName }).forEach(([key, value]) => {
      requestUrl.searchParams.set(key, value);
    });

    script.onerror = () => {
      cleanup();
      reject(new Error("Script load failed"));
    };
    script.src = requestUrl.toString();
    document.body.append(script);
  });
}

function submitSyncForm(url, payload) {
  const frameName = "pantry-sync-frame";
  let frame = document.querySelector(`iframe[name="${frameName}"]`);

  if (!frame) {
    frame = document.createElement("iframe");
    frame.name = frameName;
    frame.hidden = true;
    document.body.append(frame);
  }

  const form = document.createElement("form");
  form.action = url;
  form.method = "POST";
  form.target = frameName;
  form.hidden = true;

  const input = document.createElement("input");
  input.type = "hidden";
  input.name = "payload";
  input.value = payload;

  form.append(input);
  document.body.append(form);
  form.submit();
  form.remove();
}

function setSyncStatus(message, tone) {
  elements.syncStatus.textContent = message;
  elements.syncStatus.classList.toggle("sync-ok", tone === "ok");
  elements.syncStatus.classList.toggle("sync-warn", tone === "warn");
  elements.syncStatus.classList.toggle("sync-error", tone === "error");
}

function formatDateTime(dateString) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(dateString));
}
