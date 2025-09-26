document.addEventListener("DOMContentLoaded", updateEmptyState);


const section = document.getElementById("AddTeammate");
const button = section.querySelector("button");
const input = section.querySelector("input");

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
  const dropdown = document.querySelector("#AssignTask select");
  
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

  const sorted = Array.from(dropdown.options).sort((a, b) =>
    a.text.localeCompare(b.text, undefined, { sensitivity: "base" })
  );
  dropdown.innerHTML = "";
  sorted.forEach((opt) => dropdown.appendChild(opt));

}


const assignSec   = document.getElementById("AssignTask");
const selectEl    = assignSec.querySelector("select");
const taskInput   = assignSec.querySelector("input[type='text']");
const dateInput   = assignSec.querySelector("input[type='date']");
dateInput.min = todayISO();
const assignBtn   = assignSec.querySelector("button");
const groupsHost  = document.getElementById("groups");

assignBtn.addEventListener("click", () => {
  if (!selectEl.value) { alert("Please select a teammate"); return; }
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

  // （可選）若你有其他狀態變數/快取，也在這裡一併清除
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
      p.textContent = "No tasks right now.";
      groupsHost.appendChild(p);
    }
  }
}