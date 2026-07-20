/* ============================================================
   vision.js — give JARVIS sight: image upload, camera, screen
   ============================================================ */
(function (J) {
  "use strict";

  let pending = null; // { media_type, data, url }

  function setPending(dataUrl) {
    const m = /^data:(image\/[a-zA-Z+]+);base64,(.*)$/.exec(dataUrl);
    if (!m) { J.toast("Unsupported image."); return; }
    pending = { media_type: m[1], data: m[2], url: dataUrl };
    paintPending();
  }
  J.takePendingImage = function () { const p = pending; pending = null; paintPending(); return p; };

  function paintPending() {
    const wrap = document.getElementById("chatPending");
    if (!wrap) return;
    if (!pending) { wrap.hidden = true; wrap.replaceChildren(); return; }
    wrap.hidden = false;
    wrap.replaceChildren(
      J.el("img", { src: pending.url }),
      J.el("span", { class: "muted tiny", text: "image attached" }),
      J.el("button", { class: "chip-x", text: "✕", onclick: () => { pending = null; paintPending(); } })
    );
  }

  // ---- capture a frame from a MediaStream ----
  function frameToData(video) {
    const w = Math.min(video.videoWidth || 1280, 1280);
    const scale = w / (video.videoWidth || w);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = (video.videoHeight || 720) * scale;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  }

  async function capture(kind) {
    try {
      const md = navigator.mediaDevices;
      const stream = kind === "screen"
        ? await md.getDisplayMedia({ video: true })
        : await md.getUserMedia({ video: { facingMode: "environment" } });
      await captureModal(stream, kind);
    } catch (e) {
      J.toast(kind === "screen" ? "Screen capture cancelled or blocked." : "Camera unavailable or blocked.");
    }
  }

  function captureModal(stream, kind) {
    return new Promise((resolve) => {
      const video = J.el("video", { autoplay: "", playsinline: "", muted: "" });
      video.srcObject = stream; video.muted = true; video.play().catch(() => {});
      const shot = J.el("button", { class: "pill primary", text: "📸 Capture" });
      const cancel = J.el("button", { class: "pill", text: "Cancel" });
      const modal = J.el("div", { class: "cap-modal" }, [
        J.el("div", { class: "cap-inner" }, [
          J.el("div", { class: "cap-title", text: kind === "screen" ? "Screen — capture a frame" : "Camera — line up your shot" }),
          video,
          J.el("div", { class: "cap-controls" }, [shot, cancel])
        ])
      ]);
      const overlay = J.el("div", { class: "overlay", style: "z-index:90" }, [modal]);
      document.body.appendChild(overlay);
      const close = () => { stream.getTracks().forEach(t => t.stop()); overlay.remove(); resolve(); };
      shot.addEventListener("click", () => { try { setPending(frameToData(video)); } catch (e) { J.toast("Couldn't grab the frame."); } close(); J.openChat(); });
      cancel.addEventListener("click", close);
      overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
      // screen: many browsers give a still-ish stream — let it settle briefly
      setTimeout(() => {}, 300);
    });
  }

  function menu(show) {
    const m = document.getElementById("attachMenu");
    if (m) m.hidden = show === undefined ? !m.hidden : !show;
  }

  J.initVision = function () {
    const btn = document.getElementById("attachBtn");
    const m = document.getElementById("attachMenu");
    const file = document.getElementById("imgFile");
    if (!btn) return;

    btn.addEventListener("click", (e) => { e.stopPropagation(); menu(); });
    document.addEventListener("click", () => menu(false));
    m.addEventListener("click", (e) => e.stopPropagation());

    m.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
      menu(false);
      const act = b.dataset.act;
      if (act === "file") file.click();
      else if (act === "camera") capture("camera");
      else if (act === "screen") capture("screen");
    }));

    file.addEventListener("change", () => {
      const f = file.files[0]; file.value = "";
      if (!f) return;
      const r = new FileReader();
      r.onload = () => setPending(r.result);
      r.readAsDataURL(f);
    });

    // paste an image straight into the chat input
    const input = document.getElementById("chatInput");
    if (input) input.addEventListener("paste", (e) => {
      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (const it of items) {
        if (it.type.startsWith("image/")) {
          const f = it.getAsFile();
          const r = new FileReader(); r.onload = () => setPending(r.result); r.readAsDataURL(f);
        }
      }
    });
  };

})(window.J);
