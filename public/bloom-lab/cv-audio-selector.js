/**
 * CV Audio Device Selector Web Component
 *
 * A reusable audio output device selector with ES-8 auto-detection.
 *
 * Usage:
 *   <cv-audio-selector id="deviceSelector"></cv-audio-selector>
 *
 * Attributes:
 *   - disabled: Boolean attribute to disable the selector
 *   - auto-select-pattern: Pattern to auto-select (default: "ES-8")
 *
 * Events:
 *   - change: Fired when device selection changes
 *     event.detail = { deviceId, label }
 *
 * Methods:
 *   - populateDevices(devices): Updates device list
 *     devices = [{ deviceId, label }, ...]
 *   - getSelectedDevice(): Returns { deviceId, label } or null
 *   - setDevice(deviceId): Programmatically select a device
 */

class CVAudioSelector extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._devices = [];
  }

  static get observedAttributes() {
    return ['disabled', 'auto-select-pattern'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      if (name === 'disabled') {
        const select = this.shadowRoot.querySelector('select');
        if (select) {
          select.disabled = this.hasAttribute('disabled');
        }
      }
    }
  }

  render() {
    const isDisabled = this.hasAttribute('disabled');

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          width: 100%;
        }

        select {
          width: 100%;
          background-color: #3c414d;
          color: #abb2bf;
          border: 1px solid #4b5263;
          border-radius: 3px;
          padding: 0.5em;
          font-size: 1em;
          font-family: inherit;
          cursor: pointer;
          outline: none;
          transition: border-color 0.2s ease;
        }

        select:hover:not(:disabled) {
          border-color: #61afef;
        }

        select:focus {
          border-color: #61afef;
          box-shadow: 0 0 0 2px rgba(97, 175, 239, 0.2);
        }

        select:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background-color: #2c313c;
          color: #5c6370;
        }

        option {
          background-color: #282c34;
          color: #abb2bf;
          padding: 0.5em;
        }
      </style>

      <select aria-label="Audio device" ${isDisabled ? 'disabled' : ''}>
        <option value="">Select audio device...</option>
      </select>
    `;

    this.attachEventListeners();
  }

  attachEventListeners() {
    const select = this.shadowRoot.querySelector('select');

    select.addEventListener('change', () => {
      const device = this.getSelectedDevice();

      this.dispatchEvent(new CustomEvent('change', {
        detail: device,
        bubbles: true,
        composed: true
      }));
    });
  }

  // Public API
  populateDevices(devices, selectedId) {
    if (!Array.isArray(devices)) {
      console.error('populateDevices expects an array');
      return;
    }

    this._devices = devices;
    const select = this.shadowRoot.querySelector('select');
    if (!select) return;

    // Clear existing options
    select.innerHTML = '';

    if (devices.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No audio devices found';
      select.appendChild(option);
      select.disabled = true;
      return;
    }

    // Add device options
    devices.forEach(device => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.textContent = device.label || `Device ${device.deviceId.substring(0, 8)}`;
      select.appendChild(option);
    });

    if (selectedId !== undefined) {
      select.value = selectedId;
      select.disabled = this.hasAttribute('disabled');
      return;
    }

    // Auto-select based on pattern (default: ES-8)
    const autoSelectPattern = this.getAttribute('auto-select-pattern') || 'ES-8';
    const matchingDevice = devices.find(d =>
      d.label && d.label.toLowerCase().includes(autoSelectPattern.toLowerCase())
    );

    if (matchingDevice) {
      select.value = matchingDevice.deviceId;

      // Fire change event for auto-selection
      this.dispatchEvent(new CustomEvent('change', {
        detail: { deviceId: matchingDevice.deviceId, label: matchingDevice.label },
        bubbles: true,
        composed: true
      }));
    } else if (devices.length > 0) {
      // Select first device if no match found
      select.value = devices[0].deviceId;

      this.dispatchEvent(new CustomEvent('change', {
        detail: { deviceId: devices[0].deviceId, label: devices[0].label },
        bubbles: true,
        composed: true
      }));
    }

    // Enable selector if it was disabled
    if (!this.hasAttribute('disabled')) {
      select.disabled = false;
    }
  }

  getSelectedDevice() {
    const select = this.shadowRoot.querySelector('select');
    if (!select || !select.value) return null;

    const device = this._devices.find(d => d.deviceId === select.value);
    return device ? { deviceId: device.deviceId, label: device.label } : null;
  }

  setDevice(deviceId) {
    const select = this.shadowRoot.querySelector('select');
    if (!select) return;

    const device = this._devices.find(d => d.deviceId === deviceId);
    if (device) {
      select.value = deviceId;

      this.dispatchEvent(new CustomEvent('change', {
        detail: { deviceId: device.deviceId, label: device.label },
        bubbles: true,
        composed: true
      }));
    }
  }

  // Enable/disable programmatically
  enable() {
    this.removeAttribute('disabled');
    const select = this.shadowRoot.querySelector('select');
    if (select) select.disabled = false;
  }

  disable() {
    this.setAttribute('disabled', '');
    const select = this.shadowRoot.querySelector('select');
    if (select) select.disabled = true;
  }
}

customElements.define('cv-audio-selector', CVAudioSelector);
