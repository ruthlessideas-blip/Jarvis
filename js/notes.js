/* ============================================================
   notes.js — auto-saving scratchpad
   ============================================================ */
(function (J) {
  "use strict";

  J.initNotes = function () {
    const area = document.getElementById("notes");
    const saved = document.getElementById("notesSaved");
    if (!area) return;
    area.value = J.state().notes || "";

    let t = null;
    area.addEventListener("input", () => {
      J.state().notes = area.value;
      saved.textContent = "saving…";
      clearTimeout(t);
      t = setTimeout(() => { J.save(); saved.textContent = "saved ✓"; }, 400);
    });
  };

})(window.J);
