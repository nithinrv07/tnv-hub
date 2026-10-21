// Google Translate, driven by our own language menu instead of Google's widget.
// The script is only loaded when a language other than English is chosen.
// The choice lives in Google's `googtrans` cookie, so it survives reloads.

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'മലയാളം' },
  { code: 'ur', label: 'اردو' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ' },
  { code: 'fr', label: 'Français' },
  { code: 'ja', label: '日本語' },
  { code: 'ms', label: 'Bahasa Melayu' },
  { code: 'zh-CN', label: '中文 (简体)' }
];

const SCRIPT_SRC = 'https://translate.google.com/translate_a/element.js?cb=__tnvTranslateInit';
const HOLDER_ID = 'google_translate_element';

export function currentLanguage() {
  const m = document.cookie.match(/(?:^|;\s*)googtrans=\/[^/]+\/([^;]+)/);
  return m ? decodeURIComponent(m[1]) : 'en';
}

function setCookie(value) {
  const host = window.location.hostname;
  const expire = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
  // Google may have written the cookie for the host and for the parent domain; clear both
  for (const domain of ['', `;domain=${host}`, `;domain=.${host}`]) {
    document.cookie = `googtrans=;path=/;${expire}${domain}`;
  }
  if (value) document.cookie = `googtrans=${value};path=/`;
}

let loading = null;
function loadScript() {
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    if (!document.getElementById(HOLDER_ID)) {
      const holder = document.createElement('div');
      holder.id = HOLDER_ID;
      holder.hidden = true;
      document.body.appendChild(holder);
    }
    window.__tnvTranslateInit = () => {
      // eslint-disable-next-line no-new
      new window.google.translate.TranslateElement(
        {
          pageLanguage: 'en',
          includedLanguages: LANGUAGES.map(l => l.code).join(','),
          autoDisplay: false
        },
        HOLDER_ID
      );
      resolve();
    };
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onerror = () => {
      loading = null;
      reject(new Error('Google Translate could not be loaded'));
    };
    document.head.appendChild(s);
  });
  return loading;
}

// Google builds a hidden <select class="goog-te-combo">; choosing a value in it translates the page
function selectInCombo(code, tries = 20) {
  const combo = document.querySelector('select.goog-te-combo');
  if (combo) {
    combo.value = code;
    combo.dispatchEvent(new Event('change'));
    return;
  }
  if (tries > 0) setTimeout(() => selectInCombo(code, tries - 1), 150);
}

export async function setLanguage(code) {
  if (code === 'en') {
    // Google can't reliably undo a translation in place, so clear the choice and reload
    setCookie('');
    window.location.reload();
    return;
  }
  setCookie(`/en/${code}`);
  await loadScript();
  selectInCombo(code);
}

// Re-apply a saved language on page load
export function restoreLanguage() {
  if (currentLanguage() !== 'en') loadScript().catch(() => {});
}
