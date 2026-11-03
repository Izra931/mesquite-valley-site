// Shared email forms for the whole site (custom furniture, designs and lumber pages).
//
// To have requests go straight to the inbox, create a free form at formspree.io
// and paste its address below, for example "https://formspree.io/f/abcdwxyz".
// While it's empty, sending opens the visitor's email program with everything filled in.
const FORM_ENDPOINT = "";
const SHOP_EMAIL = "mesquitevalley@yahoo.com";
const SHOP_PHONE = "254-307-8624";

// The text of a field's label, for writing "Label: value" lines in the email.
function labelFor(el) {
  if (el.dataset.label) return el.dataset.label;
  const label = el.closest("label");
  if (!label) return el.name;
  const text = [...label.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(" ").trim();
  return text || el.name;
}

document.querySelectorAll("form.send-form").forEach(form => {
  const msg = form.querySelector(".form-msg");
  const say = text => { if (msg) msg.textContent = text; };

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const f = form.elements;

    if (!f.name.value.trim()) {
      say("Please add your name.");
      f.name.focus();
      return;
    }
    if (!f.phone.value.trim() && !f.email.value.trim()) {
      say("Please add a phone number or email so we can reach you.");
      f.phone.focus();
      return;
    }

    const subjectField = form.dataset.subjectField && f[form.dataset.subjectField];
    const subject = form.dataset.subject + (subjectField && subjectField.value ? ": " + subjectField.value : "");

    if (FORM_ENDPOINT) {
      say("Sending...");
      const data = new FormData(form);
      data.append("_subject", subject);
      try {
        const res = await fetch(FORM_ENDPOINT, { method: "POST", body: data, headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error();
        form.reset();
        form.dispatchEvent(new Event("sent"));
        say("Request sent. We'll be in touch soon.");
      } catch {
        say(`Your request didn't send. Please call ${SHOP_PHONE} or email ${SHOP_EMAIL}.`);
      }
      return;
    }

    const lines = [...form.querySelectorAll("[name]")]
      .filter(el => el.type !== "submit" && el.value.trim())
      .map(el => {
        const label = labelFor(el), head = /[?:]$/.test(label) ? label : label + ":";
        return el.tagName === "TEXTAREA" ? `\n${head}\n${el.value}` : `${head} ${el.value}`;
      });
    location.href = `mailto:${SHOP_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
    say("Your email program should open with your request filled in. Press send there to finish.");
  });
});
