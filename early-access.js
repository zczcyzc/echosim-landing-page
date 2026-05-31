/**
 * @file early-access.js
 * @description EchoSim 早期访问表单 Web Component，使用文本输入框与自定义等宽下拉列表。
 * 支持 Autofill，强制用户必须从下拉选项中选择，否则报错并拒绝提交表单。
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

  async handleSubmit(e) {
    e.preventDefault();
    if (this.isSubmitting) return;

    const formEl = this.querySelector('form');
    const cInput = this.querySelector('#earlyAccessCountry');
    const sInput = this.querySelector('#earlyAccessState');
    const yInput = this.querySelector('#earlyAccessCity');

    cInput.setCustomValidity('');
    sInput.setCustomValidity('');
    yInput.setCustomValidity('');

    if (this.countries.length > 0) {
      const val = cInput.value.trim().toLowerCase();
      if (!this.countries.some(c => c.toLowerCase() === val)) {
        cInput.setCustomValidity('Please select a Country from the suggested options list.');
        formEl.reportValidity();
        return;
      }
    }
    if (this.states.length > 0) {
      const val = sInput.value.trim().toLowerCase();
      if (!this.states.some(s => s.toLowerCase() === val)) {
        sInput.setCustomValidity('Please select a State/Province from the suggested options list.');
        formEl.reportValidity();
        return;
      }
    }
    if (this.cities.length > 0) {
      const val = yInput.value.trim().toLowerCase();
      if (!this.cities.some(c => c.toLowerCase() === val)) {
        yInput.setCustomValidity('Please select a City from the suggested options list.');
        formEl.reportValidity();
        return;
      }
    }

    // 先构建 FormData，此时输入框尚未被禁用，值会完整包含在内
    const formData = new FormData(formEl);

    this.isSubmitting = true;
    this.render();

    const googleFormUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSdRRVGnVEO8P5wiENS8EgS3v5igh6l9ZzujiDoKdrUrIt7iqg/formResponse';

    try {
      await fetch(googleFormUrl, { method: 'POST', mode: 'no-cors', body: formData });
      this.querySelector('form').style.display = 'none';
      const successDiv = this.querySelector('#earlyAccessSuccess');
      if (successDiv) successDiv.style.display = 'block';
    } catch (err) {
      console.error('Waitlist submission error:', err);
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
      const filtered = list.filter(item => item.toLowerCase().includes(val.toLowerCase()));
      dropdown.innerHTML = filtered.map(item => `<div class="dropdown-item" data-value="${item}">${item}</div>`).join('');
      dropdown.style.display = filtered.length ? 'block' : 'none';
    };

    input.addEventListener('focus', () => {
      this.closeAllDropdowns();
      filterList();
    });

    input.addEventListener('input', (e) => {
      input.setCustomValidity('');
      this.selected[listKey.replace('ies', 'y').replace('s', '')] = e.target.value;
      filterList();
    });

    dropdown.addEventListener('click', (e) => {
      const item = e.target.closest('.dropdown-item');
      if (item) {
        const val = item.getAttribute('data-value');
        input.value = val;
        this.selected[listKey.replace('ies', 'y').replace('s', '')] = val;
        dropdown.style.display = 'none';
        input.setCustomValidity('');
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
  }

  render() {
    const emailInput = this.querySelector('#earlyAccessEmail');
    const platformInput = this.querySelector('select[name="entry.147168178"]');
    if (emailInput) this.selected.email = emailInput.value;
    if (platformInput) this.selected.platform = platformInput.value;

    const btnText = this.isSubmitting ? 'Submitting...' : 'Join Early Access';
    const btnDisabled = this.isSubmitting ? 'disabled' : '';

    this.innerHTML = `
      <style>
        .reserve-field-wrap { position: relative; width: 100%; box-sizing: border-box; }
        .reserve-field-wrap .reserve-input { width: 100%; box-sizing: border-box; }
        .custom-dropdown {
          position: absolute; top: calc(100% + 4px); left: 0; right: 0;
          max-height: 200px; overflow-y: auto; background: var(--bg-card);
          border: 1px solid var(--outline); border-radius: var(--radius);
          z-index: 1000; box-shadow: 0 10px 30px rgba(26,28,27,0.12); display: none;
          box-sizing: border-box;
        }
        html[data-theme="dark"] .custom-dropdown {
          background: #1e1324; border-color: rgba(255,255,255,0.12);
          box-shadow: 0 10px 30px rgba(0,0,0,0.35);
        }
        .dropdown-item {
          padding: 0.65rem 1.25rem; font-size: 0.9rem; color: var(--text);
          cursor: pointer; text-align: left; transition: background 0.15s, color 0.15s;
        }
        .dropdown-item:hover { background: rgba(142,75,110,0.1); color: var(--primary); }
        html[data-theme="dark"] .dropdown-item:hover { background: rgba(255,255,255,0.08); color: #fff; }
      </style>
      <form class="reserve-form-extended">
        <input
          type="email" id="earlyAccessEmail" name="entry.329827072"
          placeholder="Enter your email address" required class="reserve-input"
          value="${this.selected.email}" autocomplete="email" ${this.isSubmitting ? 'disabled' : ''}
        />

        <select name="entry.147168178" required class="reserve-input" ${this.isSubmitting ? 'disabled' : ''}>
          <option value="" disabled ${!this.selected.platform ? 'selected' : ''}>Platform</option>
          <option value="iOS" ${this.selected.platform === 'iOS' ? 'selected' : ''}>iOS</option>
          <option value="Android" ${this.selected.platform === 'Android' ? 'selected' : ''}>Android</option>
        </select>

        <div class="reserve-field-wrap">
          <input
            type="text" id="earlyAccessCountry" name="entry.1997565566"
            placeholder="Country" autocomplete="country-name" required class="reserve-input"
            value="${this.selected.country}" ${this.isSubmitting ? 'disabled' : ''}
          />
          <div id="country-dropdown" class="custom-dropdown"></div>
        </div>

        <div class="reserve-field-wrap">
          <input
            type="text" id="earlyAccessState" name="entry.1519677256"
            placeholder="State/Province" autocomplete="address-level1" required class="reserve-input"
            value="${this.selected.state}" ${this.isSubmitting ? 'disabled' : ''}
          />
          <div id="state-dropdown" class="custom-dropdown"></div>
        </div>

        <div class="reserve-field-wrap">
          <input
            type="text" id="earlyAccessCity" name="entry.2053319293"
            placeholder="City" autocomplete="address-level2" required class="reserve-input"
            value="${this.selected.city}" ${this.isSubmitting ? 'disabled' : ''}
          />
          <div id="city-dropdown" class="custom-dropdown"></div>
        </div>

        <button type="submit" class="btn btn-gold reserve-submit" style="margin-top: 0.5rem" ${btnDisabled}>${btnText}</button>
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
