/**
 * @file early-access-api.js
 * @description CountriesNow 地理数据 API 服务接口，提供超时控制及全球国家、州/省、城市数据的异步加载服务。
 */

(() => {
  const API_BASE = 'https://countriesnow.space/api/v0.1';

  /**
   * @description 带超时控制的异步 Fetch 辅助函数。
   * @param {string} url 请求 URL
   * @param {object} options Fetch 参数选项
   * @param {number} timeout 超时毫秒数，默认 3000ms
   */
  async function fetchWithTimeout(url, options = {}, timeout = 3000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      if (!response.ok) throw new Error('API Response Error');
      return await response.json();
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  }

  /**
   * @description 获取全球所有国家列表。
   */
  async function getCountries() {
    const res = await fetchWithTimeout(`${API_BASE}/countries`);
    if (res && !res.error && Array.isArray(res.data)) {
      return res.data.map(item => item.country).sort();
    }
    throw new Error('Invalid countries response');
  }

  /**
   * @description 获取特定国家的所有省份/州列表。
   * @param {string} country 国家名称
   */
  async function getStates(country) {
    const res = await fetchWithTimeout(`${API_BASE}/countries/states`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country })
    });
    if (res && !res.error && res.data && Array.isArray(res.data.states)) {
      return res.data.states;
    }
    throw new Error('Invalid states response');
  }

  /**
   * @description 获取特定国家特定省份/州的城市列表。
   * @param {string} country 国家名称
   * @param {string} state 省份/州名称
   */
  async function getCities(country, state) {
    const res = await fetchWithTimeout(`${API_BASE}/countries/state/cities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country, state })
    });
    if (res && !res.error && Array.isArray(res.data)) {
      return res.data.sort();
    }
    throw new Error('Invalid cities response');
  }

  /**
   * @description 直接获取特定国家的所有城市列表（无省份/州划分时的兜底方法）。
   * @param {string} country 国家名称
   */
  async function getCitiesOfCountry(country) {
    const res = await fetchWithTimeout(`${API_BASE}/countries/cities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country })
    });
    if (res && !res.error && Array.isArray(res.data)) {
      return res.data.sort();
    }
    throw new Error('Invalid country cities response');
  }

  // 挂载到全局 window 对象上，以便在组件中调用
  window.EarlyAccessAPI = {
    getCountries,
    getStates,
    getCities,
    getCitiesOfCountry
  };
})();
