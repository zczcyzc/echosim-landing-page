/**
 * @file early-access.js
 * @description EchoSim 早期访问表单原生 Web Component，包含国家-州/省-城市三级级联过滤器及超时自动降级容错机制。
 */

class EarlyAccessForm extends HTMLElement {
  constructor() {
    super();
    this.countries = [];
    this.states = [];
    this.cities = [];
    this.loading = { countries: true, states: false, cities: false };
    this.selected = { country: '', state: '', city: '', email: '', platform: '' };
    this.fallbackMode = false;
    this.isSubmitting = false;
  }

  /**
   * @description 组件加载到 DOM 时触发，开始初始化渲染并异步加载国家数据。
   */
  connectedCallback() {
    this.render();
    this.fetchCountries();
  }

  /**
   * @description 激活降级模式，当地理 API 失败或超时，自动切换到普通文本输入框。
   */
  triggerFallback() {
    if (this.fallbackMode) return;
    console.warn('CountriesNow API unavailable. Switching to text input fallback.');
    this.fallbackMode = true;
    this.loading = { countries: false, states: false, cities: false };
    this.render();
  }

  /**
   * @description 异步获取全球所有国家列表。
   */
  async fetchCountries() {
    try {
      this.countries = await window.EarlyAccessAPI.getCountries();
      this.loading.countries = false;
      this.render();
    } catch (err) {
      this.triggerFallback();
    }
  }

  /**
   * @description 当选择国家后，获取其对应的省份/州列表。
   * @param {string} country 国家名称
   */
  async fetchStates(country) {
    this.loading.states = true;
    this.states = [];
    this.cities = [];
    this.selected.state = '';
    this.selected.city = '';
    this.render();

    try {
      this.states = await window.EarlyAccessAPI.getStates(country);
      this.loading.states = false;
      if (this.states.length === 0) {
        await this.fetchCitiesOfCountry(country);
      } else {
        this.render();
      }
    } catch (err) {
      try {
        await this.fetchCitiesOfCountry(country);
      } catch {
        this.triggerFallback();
      }
    }
  }

  /**
   * @description 当选择省份/州后，获取其对应的城市列表。
   * @param {string} country 国家名称
   * @param {string} state 省份/州名称
   */
  async fetchCities(country, state) {
    this.loading.cities = true;
    this.cities = [];
    this.selected.city = '';
    this.render();

    try {
      this.cities = await window.EarlyAccessAPI.getCities(country, state);
      this.loading.cities = false;
      this.render();
    } catch (err) {
      this.triggerFallback();
    }
  }

  /**
   * @description 兜底方法：对于没有省份/州的国家，直接获取该国家所有城市列表。
   * @param {string} country 国家名称
   */
  async fetchCitiesOfCountry(country) {
    this.loading.states = false;
    this.loading.cities = true;
    this.render();

    try {
      this.cities = await window.EarlyAccessAPI.getCitiesOfCountry(country);
      this.loading.cities = false;
      this.render();
    } catch (err) {
      this.triggerFallback();
    }
  }

  /**
   * @description 处理等待名单表单的提交请求，集成 Google 表单。
   * @param {Event} e 表单提交事件
   */
  async handleSubmit(e) {
    e.preventDefault();
    if (this.isSubmitting) return;

    this.isSubmitting = true;
    this.render();

    const formEl = this.querySelector('form');
    const formData = new FormData(formEl);
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

  /**
   * @description 重新渲染组件的 HTML DOM 结构。
   */
  render() {
    const emailInput = this.querySelector('#earlyAccessEmail');
    const platformInput = this.querySelector('select[name="entry.147168178"]');
    if (emailInput) this.selected.email = emailInput.value;
    if (platformInput) this.selected.platform = platformInput.value;

    const btnText = this.isSubmitting ? 'Submitting...' : 'Join Early Access';
    const btnDisabled = this.isSubmitting ? 'disabled' : '';

    this.innerHTML = `
      <form class="reserve-form-extended">
        <input
          type="email"
          id="earlyAccessEmail"
          name="entry.329827072"
          placeholder="Enter your email address"
          required
          class="reserve-input"
          value="${this.selected.email}"
          ${this.isSubmitting ? 'disabled' : ''}
        />
        <div class="reserve-row">
          <select name="entry.147168178" required class="reserve-input" ${this.isSubmitting ? 'disabled' : ''}>
            <option value="" disabled ${!this.selected.platform ? 'selected' : ''}>Platform</option>
            <option value="iOS" ${this.selected.platform === 'iOS' ? 'selected' : ''}>iOS</option>
            <option value="Android" ${this.selected.platform === 'Android' ? 'selected' : ''}>Android</option>
          </select>

          ${this.fallbackMode ? `
            <input type="text" name="entry.1997565566" placeholder="Country" required class="reserve-input" ${this.isSubmitting ? 'disabled' : ''} />
          ` : `
            <select name="entry.1997565566" required class="reserve-input" ${this.isSubmitting || this.loading.countries ? 'disabled' : ''}>
              <option value="" disabled ${!this.selected.country ? 'selected' : ''}>
                ${this.loading.countries ? 'Loading countries...' : 'Country'}
              </option>
              ${this.countries.map(c => `<option value="${c}" ${this.selected.country === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          `}
        </div>

        <div class="reserve-row">
          ${this.fallbackMode ? `
            <input type="text" name="entry.1519677256" placeholder="State/Province" required class="reserve-input" ${this.isSubmitting ? 'disabled' : ''} />
            <input type="text" name="entry.2053319293" placeholder="City" required class="reserve-input" ${this.isSubmitting ? 'disabled' : ''} />
          ` : `
            <select name="entry.1519677256" required class="reserve-input" ${this.isSubmitting || this.loading.states || !this.selected.country || this.states.length === 0 ? 'disabled' : ''}>
              <option value="" disabled ${!this.selected.state ? 'selected' : ''}>
                ${this.loading.states ? 'Loading states...' : (this.selected.country && this.states.length === 0 ? 'N/A' : 'State/Province')}
              </option>
              ${this.states.map(s => `<option value="${s}" ${this.selected.state === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>

            <select name="entry.2053319293" required class="reserve-input" ${this.isSubmitting || this.loading.cities || (!this.selected.state && this.states.length > 0) || !this.selected.country ? 'disabled' : ''}>
              <option value="" disabled ${!this.selected.city ? 'selected' : ''}>
                ${this.loading.cities ? 'Loading cities...' : 'City'}
              </option>
              ${this.cities.map(c => `<option value="${c}" ${this.selected.city === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          `}
        </div>
        <button type="submit" class="btn btn-gold reserve-submit" style="margin-top: 0.5rem" ${btnDisabled}>${btnText}</button>
      </form>
      <div id="earlyAccessSuccess" style="display: none; color: var(--primary); margin-top: 1rem; text-align: center; font-size: 0.95rem; font-weight: 500;">
        Thanks! We'll be in touch soon.
      </div>
    `;

    const formEl = this.querySelector('form');
    if (formEl) formEl.addEventListener('submit', (e) => this.handleSubmit(e));

    const countrySelect = this.querySelector('select[name="entry.1997565566"]');
    if (countrySelect) {
      countrySelect.addEventListener('change', (e) => {
        this.selected.country = e.target.value;
        this.fetchStates(this.selected.country);
      });
    }

    const stateSelect = this.querySelector('select[name="entry.1519677256"]');
    if (stateSelect) {
      stateSelect.addEventListener('change', (e) => {
        this.selected.state = e.target.value;
        this.fetchCities(this.selected.country, this.selected.state);
      });
    }

    const citySelect = this.querySelector('select[name="entry.2053319293"]');
    if (citySelect) {
      citySelect.addEventListener('change', (e) => {
        this.selected.city = e.target.value;
      });
    }
  }
}

customElements.define('early-access-form', EarlyAccessForm);
