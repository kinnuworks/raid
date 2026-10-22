/*
 * Raid army embed. Add this where the card should appear:
 *   <script src="https://YOUR-RAID-HOST/embed.js" data-army="snek" async></script>
 * It inserts a sandboxed iframe. Enlisting opens Raid in a new tab, so no wallet or trading key
 * ever touches the host page.
 */
(function () {
  var s = document.currentScript;
  if (!s) return;
  var army = (s.getAttribute("data-army") || "snek").toLowerCase().replace(/[^a-z0-9]/g, "");
  var origin = new URL(s.src).origin;
  var f = document.createElement("iframe");
  f.src = origin + "/embed/" + army;
  f.title = "Raid: " + army.toUpperCase() + " army on Strike";
  f.loading = "lazy";
  f.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox");
  f.style.cssText = "width:100%;max-width:960px;height:" + (s.getAttribute("data-height") || "640") + "px;border:2px solid #1b1a17;background:#ede6d6;display:block";
  s.parentNode.insertBefore(f, s.nextSibling);
})();
