/**
 * @file early-access.js
 * @description EchoSim 早期访问表单 Web Component，使用文本输入框与自定义下拉列表。
 * 支持 Autofill 并具有极佳的对焦体验：若输入值已是合法选项，对焦时不弹出下拉菜单。
 */

class EarlyAccessForm extends HTMLElement {
  constructor() {
    super();
    this.countries = [];
    this.states = [];
    this.cities = [];
    this.selected = { country: '', state: '', city: '', email: '', platform: '' };
    this.isSubmitting = false;
  }

  connectedCallback() {
    this.render();
    this.fetchCountries();
    this.bindClickOutside();
  }

  bindClickOutside() {
    document.addEventListener('click', (e) => {
      if (!this.contains(e.target)) this.closeAllDropdowns();
    });
  }

  closeAllDropdowns() {
    this.querySelectorAll('.custom-dropdown').forEach(d => d.style.display = 'none');
  }

  async fetchCountries() {
    try {
      this.countries = await window.EarlyAccessAPI.getCountries();
    } catch (err) {
      console.warn('API error fetching countries:', err);
    }
  }

  async fetchStates(country) {
    this.states = [];
    this.cities = [];
    try {
      this.states = await window.EarlyAccessAPI.getStates(country);
      if (this.states.length === 0) await this.fetchCitiesOfCountry(country);
    } catch (err) {
      try {
        await this.fetchCitiesOfCountry(country);
      } catch (e) {
        console.warn('API error fetching states:', e);
      }
    }
  }

  async fetchCities(country, state) {
    this.cities = [];
    try {
      this.cities = await window.EarlyAccessAPI.getCities(country, state);
    } catch (err) {
      console.warn('API error fetching cities:', err);
    }
  }

  async fetchCitiesOfCountry(country) {
    this.cities = [];
    try {
      this.cities = await window.EarlyAccessAPI.getCitiesOfCountry(country);
    } catch (err) {
      console.warn('API error fetching country cities:', err);
    }
  }

  /**
   * @description 校验邮箱输入，包含正则校验、拼写错误检查、临时邮箱过滤。
   * @param {HTMLInputElement} emailInput 邮箱输入框元素
   * @returns {boolean} 是否校验通过
   */
  checkEmailValidity(emailInput) {
    if (!emailInput) return true;
    emailInput.setCustomValidity('');
    const emailVal = emailInput.value.trim();
    if (!emailVal) return true;

    // 1. 严格正则表达式校验 (Strict regex validation)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(emailVal)) {
      emailInput.setCustomValidity('Please enter a valid email address with a valid domain extension (e.g. .com).');
      return false;
    }

    const domain = emailVal.split('@')[1]?.toLowerCase();
    
    // 2. 常见邮箱拼写纠错 (Common email domain typo correction)
    const typos = {
      'gamil.com': 'gmail.com',
      'gmaill.com': 'gmail.com',
      'gail.com': 'gmail.com',
      'gmaim.com': 'gmail.com',
      'yaho.com': 'yahoo.com',
      'yahooo.com': 'yahoo.com',
      'hotail.com': 'hotmail.com',
      'hotmai.com': 'hotmail.com',
      'outlok.com': 'outlook.com',
      'outllok.com': 'outlook.com',
      'gamil.co': 'gmail.com',
      'gamil.con': 'gmail.com'
    };
    if (typos[domain]) {
      emailInput.setCustomValidity(`Did you mean: ${emailVal.split('@')[0]}@${typos[domain]}?`);
      return false;
    }

    // 3. 临时邮箱服务过滤 (Disposable/Temp email address filter)
    const disposableDomains = [
      'mailinator.com',
      'tempmail.com',
      'trashmail.com',
      'yopmail.com',
      '10minutemail.com',
      'dispostable.com',
      'guerrillamail.com',
      'temp-mail.org',
      'sharklasers.com',
      'guerrillamailblock.com',
      'guerrillamail.net',
      'guerrillamail.org',
      'guerrillamail.biz'
    ];
    if (disposableDomains.includes(domain)) {
      emailInput.setCustomValidity('Disposable email addresses are not allowed. Please use a regular email address.');
      return false;
    }

    return true;
  }

  /**
   * @description 处理表单提交事件。通过即时锁定 submission 状态，防止在异步验证或请求进行时用户重复快速点击提交按钮。
   * @param {Event} e 表单提交事件对象
   */
  async handleSubmit(e) {
    e.preventDefault();
    if (this.isSubmitting) return;

    // 立即锁定并置灰提交按钮，防止在异步加载/验证期间重复提交
    this.isSubmitting = true;
    const submitBtn = this.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
    }

    const formEl = this.querySelector('form');
    const emailInput = this.querySelector('#earlyAccessEmail');

    // 辅助恢复函数，在验证失败或捕获错误时重置状态与按钮
    const resetSubmissionState = () => {
      this.isSubmitting = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Join Early Access';
      }
    };

    if (emailInput && !this.checkEmailValidity(emailInput)) {
      resetSubmissionState();
      return formEl.reportValidity();
    }

    const cInput = this.querySelector('#earlyAccessCountry');
    const sInput = this.querySelector('#earlyAccessState');
    const yInput = this.querySelector('#earlyAccessCity');

    cInput.setCustomValidity('');
    sInput.setCustomValidity('');
    yInput.setCustomValidity('');

    if (this.countries.length > 0) {
      const val = cInput.value.trim().toLowerCase();
      const matched = this.countries.find(c => c.toLowerCase() === val);
      if (matched) {
        cInput.value = matched;
        this.selected.country = matched;
        if (this.states.length === 0) await this.fetchStates(matched);
      } else {
        cInput.setCustomValidity('Please select a valid Country from the list.');
        resetSubmissionState();
        return formEl.reportValidity();
      }
    }
    if (this.states.length > 0) {
      const val = sInput.value.trim().toLowerCase();
      const matched = this.states.find(s => s.name.toLowerCase() === val || (s.state_code && s.state_code.toLowerCase() === val));
      if (matched) {
        sInput.value = matched.name;
        this.selected.state = matched.name;
        if (this.cities.length === 0) await this.fetchCities(this.selected.country, matched.name);
      } else {
        sInput.setCustomValidity('Please select a valid State/Province from the list.');
        resetSubmissionState();
        return formEl.reportValidity();
      }
    }
    if (this.cities.length > 0) {
      const val = yInput.value.trim().toLowerCase();
      const matched = this.cities.find(c => c.toLowerCase() === val);
      if (matched) {
        yInput.value = matched;
        this.selected.city = matched;
      } else {
        yInput.setCustomValidity('Please select a valid City from the list.');
        resetSubmissionState();
        return formEl.reportValidity();
      }
    }

    const formData = new FormData(formEl);
    // 渲染表单以在开始真实提交请求前完全禁用所有的输入框
    this.render();

    const googleFormUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSdRRVGnVEO8P5wiENS8EgS3v5igh6l9ZzujiDoKdrUrIt7iqg/formResponse';
    try {
      await fetch(googleFormUrl, { method: 'POST', mode: 'no-cors', body: formData });
      this.querySelector('form').style.display = 'none';
      this.querySelector('#earlyAccessSuccess').style.display = 'block';
    } catch (err) {
      alert('Failed to submit. Please try again.');
      this.isSubmitting = false;
      this.render();
    }
  }

  setupInput(inputId, dropdownId, listKey, nextFetch) {
    const input = this.querySelector(`#${inputId}`);
    const dropdown = this.querySelector(`#${dropdownId}`);
    if (!input || !dropdown) return;

    const filterList = () => {
      const list = this[listKey];
      const val = input.value;
      let filtered = [];
      if (listKey === 'states') {
        filtered = list.filter(s => s.name.toLowerCase().includes(val.toLowerCase()) || (s.state_code && s.state_code.toLowerCase() === val.toLowerCase())).map(s => s.name);
      } else {
        filtered = list.filter(item => item.toLowerCase().includes(val.toLowerCase()));
      }
      filtered = [...new Set(filtered)].sort();
      dropdown.innerHTML = filtered.map(item => `<div class="dropdown-item" data-value="${item}">${item}</div>`).join('');
      dropdown.style.display = filtered.length ? 'block' : 'none';
    };

    input.addEventListener('focus', () => {
      this.closeAllDropdowns();
      const list = this[listKey];
      const val = input.value.trim().toLowerCase();
      let isValid = false;
      if (listKey === 'states') {
        isValid = list.some(s => s.name.toLowerCase() === val || (s.state_code && s.state_code.toLowerCase() === val));
      } else {
        isValid = list.some(item => item.toLowerCase() === val);
      }
      if (!isValid) filterList();
    });

    input.addEventListener('input', (e) => {
      input.setCustomValidity('');
      this.selected[listKey.replace('ies', 'y').replace('s', '')] = e.target.value;
      filterList();
    });

    input.addEventListener('change', (e) => {
      const val = e.target.value.trim();
      const list = this[listKey];
      if (listKey === 'countries') {
        const matched = list.find(c => c.toLowerCase() === val.toLowerCase());
        if (matched) { input.value = matched; this.selected.country = matched; if (nextFetch) nextFetch(matched); }
      } else if (listKey === 'states') {
        const matched = list.find(s => s.name.toLowerCase() === val.toLowerCase() || (s.state_code && s.state_code.toLowerCase() === val.toLowerCase()));
        if (matched) { input.value = matched.name; this.selected.state = matched.name; if (nextFetch) nextFetch(matched.name); }
      }
    });

    dropdown.addEventListener('click', (e) => {
      const item = e.target.closest('.dropdown-item');
      if (item) {
        const val = item.getAttribute('data-value');
        input.value = val; this.selected[listKey.replace('ies', 'y').replace('s', '')] = val;
        dropdown.style.display = 'none'; input.setCustomValidity('');
        if (nextFetch) nextFetch(val);
      }
    });
  }

  bindEvents() {
    this.setupInput('earlyAccessCountry', 'country-dropdown', 'countries', (val) => {
      this.fetchStates(val);
      const stateInput = this.querySelector('#earlyAccessState');
      const cityInput = this.querySelector('#earlyAccessCity');
      if (stateInput) stateInput.value = '';
      if (cityInput) cityInput.value = '';
    });
    this.setupInput('earlyAccessState', 'state-dropdown', 'states', (val) => {
      this.fetchCities(this.selected.country, val);
      const cityInput = this.querySelector('#earlyAccessCity');
      if (cityInput) cityInput.value = '';
    });
    this.setupInput('earlyAccessCity', 'city-dropdown', 'cities');

    // 绑定邮箱输入与失去焦点的校验事件以实现即时校验反馈 (Bind email validation events)
    const emailInput = this.querySelector('#earlyAccessEmail');
    if (emailInput) {
      emailInput.addEventListener('input', () => {
        emailInput.setCustomValidity('');
      });
      emailInput.addEventListener('blur', () => {
        this.checkEmailValidity(emailInput);
      });
    }
  }

  render() {
    const emailInput = this.querySelector('#earlyAccessEmail');
    const platformInput = this.querySelector('select[name="entry.147168178"]');
    if (emailInput) this.selected.email = emailInput.value;
    if (platformInput) this.selected.platform = platformInput.value;

    this.innerHTML = `
      <style>
        .reserve-field-wrap { position: relative; width: 100%; box-sizing: border-box; }
        .reserve-field-wrap .reserve-input { width: 100%; box-sizing: border-box; }
        .custom-dropdown {
          position: absolute; top: calc(100% + 4px); left: 0; right: 0; max-height: 200px; overflow-y: auto;
          background: var(--bg-card); border: 1px solid var(--outline); border-radius: var(--radius);
          z-index: 1000; box-shadow: 0 10px 30px rgba(26,28,27,0.12); display: none; box-sizing: border-box;
        }
        html[data-theme="dark"] .custom-dropdown {
          background: #1e1324; border-color: rgba(255,255,255,0.12); box-shadow: 0 10px 30px rgba(0,0,0,0.35);
        }
        .dropdown-item {
          padding: 0.65rem 1.25rem; font-size: 0.9rem; color: var(--text); cursor: pointer;
          text-align: left; transition: background 0.15s, color 0.15s;
        }
        .dropdown-item:hover { background: rgba(142,75,110,0.1); color: var(--primary); }
        html[data-theme="dark"] .dropdown-item:hover { background: rgba(255,255,255,0.08); color: #fff; }
      </style>
      <form class="reserve-form-extended">
        <input
          type="email" id="earlyAccessEmail" name="entry.329827072" placeholder="Enter your email address"
          required class="reserve-input" value="${this.selected.email}" autocomplete="email" ${this.isSubmitting ? 'disabled' : ''}
        />
        <select name="entry.147168178" required class="reserve-input" ${this.isSubmitting ? 'disabled' : ''}>
          <option value="" disabled ${!this.selected.platform ? 'selected' : ''}>Platform</option>
          <option value="iOS" ${this.selected.platform === 'iOS' ? 'selected' : ''}>iOS</option>
          <option value="Android" ${this.selected.platform === 'Android' ? 'selected' : ''}>Android</option>
        </select>
        <div class="reserve-field-wrap">
          <input
            type="text" id="earlyAccessCountry" name="entry.1997565566" placeholder="Country"
            autocomplete="country-name" required class="reserve-input" value="${this.selected.country}" ${this.isSubmitting ? 'disabled' : ''}
          />
          <div id="country-dropdown" class="custom-dropdown"></div>
        </div>
        <div class="reserve-field-wrap">
          <input
            type="text" id="earlyAccessState" name="entry.1519677256" placeholder="State/Province"
            autocomplete="address-level1" required class="reserve-input" value="${this.selected.state}" ${this.isSubmitting ? 'disabled' : ''}
          />
          <div id="state-dropdown" class="custom-dropdown"></div>
        </div>
        <div class="reserve-field-wrap">
          <input
            type="text" id="earlyAccessCity" name="entry.2053319293" placeholder="City"
            autocomplete="address-level2" required class="reserve-input" value="${this.selected.city}" ${this.isSubmitting ? 'disabled' : ''}
          />
          <div id="city-dropdown" class="custom-dropdown"></div>
        </div>
        <button type="submit" class="btn btn-gold reserve-submit" style="margin-top: 0.5rem" ${this.isSubmitting ? 'disabled' : ''}>
          ${this.isSubmitting ? 'Submitting...' : 'Join Early Access'}
        </button>
      </form>
      <div id="earlyAccessSuccess" style="display: none; color: var(--primary); margin-top: 1rem; text-align: center; font-size: 0.95rem; font-weight: 500;">
        Thanks! We'll be in touch soon.
      </div>
    `;

    const formEl = this.querySelector('form');
    if (formEl) formEl.addEventListener('submit', (e) => this.handleSubmit(e));
    this.bindEvents();
  }
}

customElements.define('early-access-form', EarlyAccessForm);
