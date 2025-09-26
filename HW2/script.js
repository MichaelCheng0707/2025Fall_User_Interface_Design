const STORAGE_KEY = "todo-app-v1";


document.addEventListener("DOMContentLoaded", () => {
  loadFromStorage();

  // still enforce today's date as min
  const dateInput = document.querySelector("#AssignTask input[type='date']");
  dateInput.min = todayISO();
  sortDropdownExceptPlaceholder(dropdown);
});

// global elements
const dropdown = document.querySelector("#AssignTask select");
const section = document.getElementById("AddTeammate");
const button = section.querySelector("button");
const input = section.querySelector("input");

// global event listeners
dropdown.addEventListener("change", () => {
  dropdown.dataset.touched = "1"; // user has chosen something once
});

function getPlaceholder(select) {
  return select.querySelector("option[disabled]");
}

function rebuildOptionsKeepPlaceholderFirst(select, sortedOptions) {
  const placeholder = getPlaceholder(select);
  const prevValue = select.value;  // remember current selection (value or text都可)

  // clear and rebuild: placeholder first, then others
  select.innerHTML = "";
  if (placeholder) select.appendChild(placeholder);
  sortedOptions.forEach(opt => select.appendChild(opt));

  // selection rule:
  // - if user never touched → force placeholder selected
  // - else try restore previous selection
  if (!select.dataset.touched) {
    if (placeholder) placeholder.selected = true;
  } else {
    const toRestore = Array.from(select.options)
      .find(o => o.value === prevValue || o.text === prevValue);
    if (toRestore) toRestore.selected = true;
  }
}

function sortDropdownExceptPlaceholder(select) {
  const placeholder = getPlaceholder(select);
  const others = Array.from(select.options).filter(o => o !== placeholder);
  others.sort((a, b) =>
    a.text.localeCompare(b.text, undefined, { sensitivity: "base" })
  );
  rebuildOptionsKeepPlaceholderFirst(select, others);
}

button.addEventListener("click", () => {
  const name = input.value.trim();

  if (!name) {
    alert("Please enter a teammate name");
    return;
  }

  addTeammateToDropdown(name);
  input.value = "";
});

function addTeammateToDropdown(name) {
  // check duplicate cases
  const exists = Array.from(dropdown.options).some(
    (opt) => opt.value.toLowerCase() === name.toLowerCase()
  );

  if (exists) {
    alert(`Teammate "${name}" already exists!`);
    return;
  }

  const option = document.createElement("option");
  option.textContent = name;
  option.value = name;

  dropdown.appendChild(option);

  sortDropdownExceptPlaceholder(dropdown);


  saveFromDOM(); 
}


const assignSec   = document.getElementById("AssignTask");
const selectEl    = assignSec.querySelector("select");
const taskInput   = assignSec.querySelector("input[type='text']");
const dateInput   = assignSec.querySelector("input[type='date']");
const assignBtn   = assignSec.querySelector("button");
const groupsHost  = document.getElementById("groups");

assignBtn.addEventListener("click", () => {
  const selected = selectEl.selectedOptions[0];
  if (!selected || selected.disabled) {
    alert("Please select a teammate");
    return;
  }
  // if (!selectEl.value) { alert("Please select a teammate"); return; }
  const teammate = selectEl.value;
  const text = taskInput.value.trim();
  if (!text) { alert("Please enter a task"); return; }
  const due = dateInput.value; // already YYYY-MM-DD from <input type="date">
  if (!due) { alert("Please select a due date"); return; }
  if (due < todayISO()) {
    alert("Due date cannot be earlier than today");
    return;
  }

  const groupSection = getOrCreateGroup(teammate);
  const list = groupSection.querySelector(".task-list");
  list.appendChild(createTaskItem(text, due));
  sortListByDue(list);
  updateEmptyState();
  saveFromDOM(); 
  // clear inputs
  taskInput.value = "";
  dateInput.value = "";
});

function todayISO() {
  const today = new Date();
  return today.toLocaleDateString("en-CA"); 
  // "en-CA" output as YYYY-MM-DD
}

function getOrCreateGroup(name) {
  // try find existing section by data-name
  let sect = groupsHost.querySelector(`section.group[data-name="${CSS.escape(name)}"]`);
  if (!sect) {
    sect = document.createElement("section");
    sect.className = "group";
    sect.dataset.name = name.trim();

    const h2 = document.createElement("h2");
    h2.textContent = name;

    const ul = document.createElement("ul");
    ul.className = "task-list";

    sect.append(h2, ul);
    groupsHost.appendChild(sect);

    // keep groups sorted by name
    sortGroupsByName();
  }
  return sect;
}

function createTaskItem(text, due) {
  const li = document.createElement("li");
  li.className = "task-item";
  li.dataset.due = due; // for sorting if needed

  const title = document.createElement("span");
  title.className = "task-title";
  title.textContent = text;

  const dueSpan = document.createElement("span");
  dueSpan.className = "task-due";
  dueSpan.textContent = `Due: ${due || "N/A"}`;

  const label = document.createElement("label");
  label.className = "task-check";
  const cb = document.createElement("input");
  cb.type = "checkbox";

  cb.addEventListener("change", () => {
    li.classList.toggle("completed", cb.checked);
    saveFromDOM(); 
  });

  label.appendChild(cb);
  li.append(title, dueSpan, label);
  return li;
}

function sortListByDue(ulEl) {
  const items = Array.from(ulEl.children);
  items.sort((a, b) => {
    const da = a.dataset.due || "";
    const db = b.dataset.due || "";
    return da.localeCompare(db);     // YYYY-MM-DD lexicographical sort
  });
  // re-append in sorted order
  items.forEach(li => ulEl.appendChild(li));
}

function sortGroupsByName() {
  const sections = Array.from(groupsHost.querySelectorAll("section.group"));
  sections.sort((a, b) =>
    (a.dataset.name || "").localeCompare(b.dataset.name || "", undefined, { sensitivity: "base" })
  );
  sections.forEach(s => groupsHost.appendChild(s)); // re-append in sorted order
}

// Clear Completed: remove all completed items, then remove empty groups
const clearBtn = document.querySelector(".footer-controls .btn-success");

clearBtn.addEventListener("click", () => {

  // 1) remove completed tasks
  groupsHost.querySelectorAll(".task-item.completed").forEach(li => li.remove());

  // 2) remove empty teammate sections
  groupsHost.querySelectorAll("section.group").forEach(section => {
    const list = section.querySelector(".task-list");
    if (!list || list.children.length === 0) {
      section.remove();
    }
  });
  updateEmptyState();
  saveFromDOM(); 
});

// Reset: confirm, then wipe everything back to initial state
const resetBtn   = document.querySelector(".footer-controls .btn-neutral");

resetBtn.addEventListener("click", () => {
  const ok = confirm("Are you sure you want to reset all teammates and to-do items?");
  if (!ok) return;

  // 1) remove all groups / tasks
  groupsHost.innerHTML = "";

  // 2) reset the Assign select back to placeholder-only
  const assignSec = document.getElementById("AssignTask");
  const selectEl  = assignSec.querySelector("select");
  selectEl.innerHTML = '<option disabled selected>Assign to</option>';
  selectEl.selectedIndex = 0;           // make sure placeholder is selected
  delete selectEl.dataset?.touched;     // if you used this flag earlier

  // 3) clear all form inputs
  const addSec   = document.getElementById("AddTeammate");
  addSec.querySelector("input[type='text']").value = "";          // teammate name
  assignSec.querySelector("input[type='text']").value = "";       // task title
  assignSec.querySelector("input[type=\'date\']").value = "";     // due date

  updateEmptyState();
  saveFromDOM(); 
});


function updateEmptyState() {
  const groupsHost = document.getElementById("groups");
  const hasTasks = !!groupsHost.querySelector(".task-item");
  const existing = document.getElementById("emptyState");

  if (hasTasks) {
    if (existing) existing.remove();
  } else {
    if (!existing) {
      const p = document.createElement("p");
      p.id = "emptyState";
      p.className = "empty-state";
      p.textContent = "No tasks right now. Please add a teammate and assign a task.";
      groupsHost.appendChild(p);
    }
  }
}

/**
 * Snapshot current DOM and write to localStorage.
 * Shape:
 * {
 *   teammates: [
 *     { name: "Leo", tasks: [ { text, due, completed } ] }
 *     { name: "Mia", tasks: [ ... ] }
 *     { name: "Zoe", tasks: [ ... ] }
 *   ]
 * }
*/

function saveFromDOM() {
  try {
    // 1) Collect teammate names from the dropdown (exclude disabled placeholder)
    const teammateNames = Array.from(dropdown.options)
      .filter(o => !o.disabled)
      .map(o => (o.value || o.text).trim())
      .filter(Boolean);

    // 2) Collect tasks from each group section
    const groups = document.querySelectorAll("#groups section.group");
    const byName = {};
    groups.forEach(sec => {
      const name = (sec.dataset.name || sec.querySelector("h2")?.textContent || "").trim();
      const lis = sec.querySelectorAll("li.task-item");
      byName[name] = Array.from(lis).map(li => ({
        text: li.querySelector(".task-title").textContent,
        // prefer dataset.due (we set it when creating the item)
        due: li.dataset.due,
        completed: li.classList.contains("completed")
      }));
    });

    // 3) Build state in teammate name order
    const state = {
      teammates: teammateNames.map(n => ({
        name: n,
        tasks: byName[n] || []
      }))
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save to localStorage:", e);
  }
}

/**
 * Load state from localStorage and rebuild the UI
 */
function loadFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    updateEmptyState(); // nothing saved → show empty state
    return;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error("Failed to parse localStorage data:", e);
    updateEmptyState();
    return;
  }

  if (!data || !Array.isArray(data.teammates)) {
    updateEmptyState();
    return;
  }

  // --- 1) Rebuild dropdown ---
  const placeholder = dropdown.querySelector("option[disabled]") || dropdown.options[0];
  dropdown.innerHTML = "";
  if (placeholder) dropdown.appendChild(placeholder);

  data.teammates
    .map(t => t.name)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    .forEach(name => {
      const opt = new Option(name, name);
      dropdown.add(opt);
    });

  // --- 2) Rebuild groups + tasks ---
  groupsHost.innerHTML = ""; // clear old
  data.teammates.forEach(t => {
    if (!t.tasks || t.tasks.length === 0) return;

    const sect = getOrCreateGroup(t.name);
    const ul = sect.querySelector(".task-list");
    ul.innerHTML = "";

    t.tasks
      .slice()
      .sort((x, y) => (x.due || "").localeCompare(y.due || ""))
      .forEach(task => {
        const li = createTaskItem(task.text, task.due);
        if (task.completed) {
          li.classList.add("completed");
          li.querySelector("input[type='checkbox']").checked = true;
        }
        ul.appendChild(li);
      });
  });

  sortGroupsByName();
  updateEmptyState();
}