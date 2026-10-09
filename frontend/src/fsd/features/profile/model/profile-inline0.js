// Behavior migrated from profile-inline0; resources are owned by the React mount.
import { API_BASE_URL as API_ORIGIN, SOCKET_URL as SOCKET_ORIGIN } from '@/shared/config';
export default function initialize(scope, context) {
scope.listen(scope.document.getElementById("avatarInput"), "change", function (event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 50 * 1024 * 1024) {
    context.showToast("The file is too big! Maximum 50MB.", "error");
    return;
  }
  const reader = new FileReader();
  reader.onload = async function (e) {
    const objectUrl = URL.createObjectURL(file);
    scope.document.getElementById("avatarPreview").style.backgroundImage = `url('${objectUrl}')`;
    try {
      const response = await scope.fetch(`${context.API_BASE_URL}/profile/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${context.token}`
        },
        body: JSON.stringify({
          avatar: objectUrl
        })
      });
      if (response.ok) {
        context.showToast("Avatar Succesfully Updated!", "success");
      } else {
        context.showToast("Loading Failed!", "error");
      }
    } catch (error) {
      console.error("Error uploading avatar:", error);
    }
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
