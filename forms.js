// Shared email forms for the whole site (contact, custom furniture, designs and lumber pages).
//
// Every form is delivered by FormSubmit (formsubmit.co) to the address below.
// The very first time someone sends a form, FormSubmit emails this address a
// confirmation link. Click it once, and from then on every form arrives as an email.
// After confirming, FormSubmit also gives you a random code to use instead of the
// address, so the address isn't visible in the page source. Paste it here if you like.
const SEND_TO = "jonatan@niemela.se";

const MAX_PICTURES = 5;
const MAX_TOTAL_MB = 10; // FormSubmit's limit for all pictures in one message

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

function hidden(form, name, value) {
  let el = form.querySelector(`input[type=hidden][name="${name}"]`);
  if (!el) {
    el = document.createElement("input");
    el.type = "hidden";
    el.name = name;
    form.append(el);
  }
  el.value = value;
  return el;
}

// Optional picture picker: shows small previews and lets people remove a picture.
function setUpPictures(form) {
  const box = form.querySelector(".upload");
  if (!box) return null;
  const input = box.querySelector("input[type=file]");
  const list = box.querySelector(".upload-list");
  const note = box.querySelector(".upload-msg");
  let files = [];
  const totalMB = () => files.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024;

  const show = () => {
    list.innerHTML = "";
    files.forEach((file, i) => {
      const li = document.createElement("li");
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.onload = img.onerror = () => URL.revokeObjectURL(img.src); // free memory once shown
      img.alt = file.name;
      const name = document.createElement("span");
      name.textContent = file.name;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", "Remove " + file.name);
      remove.addEventListener("click", () => { files.splice(i, 1); note.textContent = ""; show(); input.focus(); });
      li.append(img, name, remove);
      list.append(li);
    });
    box.classList.toggle("has-files", files.length > 0);
    box.querySelector(".upload-pick").textContent = files.length ? "Add more pictures" : "Choose pictures";
  };

  const add = picked => {
    const problems = [];
    for (const file of picked) {
      if (!file.type.startsWith("image/")) { problems.push(`${file.name} isn't a picture`); continue; }
      if (files.length >= MAX_PICTURES) { problems.push(`you can add up to ${MAX_PICTURES} pictures`); break; }
      if (totalMB() + file.size / 1024 / 1024 > MAX_TOTAL_MB) { problems.push(`${file.name} would go over ${MAX_TOTAL_MB} MB in total`); continue; }
      if (!files.some(f => f.name === file.name && f.size === file.size)) files.push(file);
    }
    note.textContent = problems.length ? "Not added: " + problems.join("; ") + "." : "";
    input.value = ""; // let people pick the same picture again after removing it
    show();
  };

  input.addEventListener("change", () => add([...input.files]));
  box.addEventListener("dragover", e => { e.preventDefault(); box.classList.add("dragging"); });
  box.addEventListener("dragleave", () => box.classList.remove("dragging"));
  box.addEventListener("drop", e => { e.preventDefault(); box.classList.remove("dragging"); add([...e.dataTransfer.files]); });

  // Just before sending: give each picture its own file field (attachment1, attachment2, ...).
  const attach = () => {
    form.querySelectorAll(".sending-file").forEach(el => el.remove());
    input.disabled = true; // the picker itself isn't sent
    files.forEach((file, i) => {
      const el = document.createElement("input");
      el.type = "file";
      el.name = (input.dataset.files || "attachment") + (i + 1);
      el.className = "sending-file";
      el.hidden = true;
      const dt = new DataTransfer();
      dt.items.add(file);
      el.files = dt.files;
      form.append(el);
    });
  };

  return { count: () => files.length, attach };
}

document.querySelectorAll("form.send-form").forEach(form => {
  const msg = form.querySelector(".form-msg");
  const say = text => { if (msg) msg.textContent = text; };
  const pictures = setUpPictures(form);
  const button = form.querySelector("button[type=submit]");

  form.method = "POST";
  form.enctype = "multipart/form-data";
  form.action = "https://formsubmit.co/" + SEND_TO;

  // A hidden "trap" field: people never see it, spam robots fill it in and get ignored.
  const trap = hidden(form, "_honey", "");
  trap.type = "text";
  trap.tabIndex = -1;
  trap.autocomplete = "off";
  trap.className = "trap";
  trap.setAttribute("aria-hidden", "true");

  form.addEventListener("submit", e => {
    const f = form.elements;
    if (!f.Name.value.trim()) {
      e.preventDefault();
      say("Please add your name.");
      f.Name.focus();
      return;
    }
    if (!f.Phone.value.trim() && !f.Email.value.trim()) {
      e.preventDefault();
      say("Please add a phone number or email so we can reach you.");
      f.Phone.focus();
      return;
    }

    const subjectField = form.dataset.subjectField && f[form.dataset.subjectField];
    const subject = "Website: " + form.dataset.subject + (subjectField && subjectField.value ? " - " + subjectField.value : "");
    hidden(form, "_subject", subject);
    hidden(form, "_template", "table");
    hidden(form, "_captcha", "false");
    hidden(form, "_next", new URL("thanks.html", location.href).href);
    if (f.Email.value.trim()) hidden(form, "_replyto", f.Email.value.trim());
    if (pictures) {
      pictures.attach();
      if (pictures.count()) hidden(form, "Reference pictures", plural(pictures.count(), "picture") + " attached");
    }

    say(pictures && pictures.count() ? "Sending your request and pictures..." : "Sending...");
    button.disabled = true;
    button.textContent = "Sending...";
    // The browser now sends the form and then shows the thank-you page.
  });
});

// Coming back with the browser's Back button: make the form usable again.
window.addEventListener("pageshow", e => {
  if (!e.persisted) return;
  document.querySelectorAll("form.send-form").forEach(form => {
    const button = form.querySelector("button[type=submit]");
    button.disabled = false;
    button.textContent = button.dataset.label || button.textContent.replace("Sending...", "Send");
    form.querySelectorAll(".sending-file").forEach(el => el.remove());
    form.querySelectorAll("input[type=file]").forEach(el => { el.disabled = false; });
    const msg = form.querySelector(".form-msg");
    if (msg) msg.textContent = "";
  });
});
document.querySelectorAll("form.send-form button[type=submit]").forEach(b => { b.dataset.label = b.textContent; });
