// Behavior migrated from profile-inline0; resources are owned by the React mount.

export default function initialize(scope, context) {
scope.listen(scope.document.getElementById("avatarInput"), "change", function (event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 50 * 1024 * 1024) {
    context.showToast("The file is too big! Maximum 50MB.", "error");
    return;
  }
  // A blob: URL only lives in this tab, so the server gets a small square
  // data URL that survives reloads and other devices.
  // Animated formats are kept as uploaded (re-encoding keeps only the first frame).
  const animated = file.type === "image/gif" || file.type === "image/webp";
  if (animated && file.size > 2 * 1024 * 1024) {
    context.showToast("Animated avatars can be up to 2 MB.", "error");
    return;
  }
  const reader = new FileReader();
  reader.onload = function (e) {
    const image = new Image();
    image.onload = async function () {
      let avatar = e.target.result;
      if (!animated) {
        const size = 256;
        const canvas = scope.document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const side = Math.min(image.naturalWidth, image.naturalHeight);
        canvas.getContext("2d").drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, size, size);
        avatar = canvas.toDataURL("image/jpeg", 0.88);
      }
      scope.document.getElementById("avatarPreview").style.backgroundImage = `url('${avatar}')`;
      try {
        const response = await scope.fetch(`${context.API_BASE_URL}/profile/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${context.token}`
          },
          body: JSON.stringify({ avatar })
        });
        if (response.ok) {
          try { localStorage.setItem("userAvatar", avatar); } catch { /* Too large to cache; the next profile load supplies it. */ }
          scope.document.querySelectorAll("#navAvatar, .dropdown-avatar").forEach((img) => { img.src = avatar; });
          scope.document.dispatchEvent(new Event("genyxo:session"));
          context.showToast("Avatar updated", "success");
        } else {
          context.showToast("The avatar could not be saved.", "error");
        }
      } catch (error) {
        console.error("Error uploading avatar:", error);
        context.showToast("The avatar could not be saved.", "error");
      }
    };
    image.onerror = () => context.showToast("This file is not an image we can read.", "error");
    image.src = e.target.result;
  };
  reader.readAsDataURL(file);
});
const saveBtn = scope.document.querySelector('.save-btn');
if (saveBtn) {
  scope.listen(saveBtn, 'click', async e => {
    e.preventDefault();
    const nameInput = scope.document.querySelector('input[placeholder="John Doe"]');
    const newName = nameInput.value;
    await scope.fetch(`${context.API_BASE_URL}/profile/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${context.token}`
      },
      body: JSON.stringify({
        name: newName
      })
    });
    context.showToast("Data Saved!", "success");
    scope.document.getElementById('profileName').textContent = newName;
  });
}
scope.document.querySelectorAll(".menu-item").forEach(btn => {
  scope.listen(btn, "click", () => {
    scope.document.querySelectorAll(".page").forEach(page => {
      page.classList.remove("active");
    });
    const pageId = btn.getAttribute("data-page");
    if (pageId && scope.document.getElementById(pageId)) {
      scope.document.getElementById(pageId).classList.add("active");
      if (pageId === 'page-affiliate' && typeof context.loadAffiliateData === 'function') {
        context.loadAffiliateData();
      }
    }
    scope.document.querySelectorAll(".menu-item").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  });
});
Object.defineProperty(context, "saveBtn", { configurable: true, get: () => saveBtn });



}
