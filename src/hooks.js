window.customUI = window.customUI || {
  VERSION: '20170830',

  SUPPORTED_SLIDER_MODES: [
    'single-line', 'break-slider', 'break-slider-toggle', 'hide-slider', 'no-slider'
  ],

  lightOrShadow: function (elem, selector) {
    return elem.shadowRoot ?
      elem.shadowRoot.querySelector(selector) :
      elem.querySelector(selector);
  },

  getElementHierarchy: function (root, hierarchy) {
    if (root === null) return null;
    const elem = hierarchy.shift();
    if (elem) {
      return window.customUI.getElementHierarchy(
        window.customUI.lightOrShadow(root, elem), hierarchy);
    }
    return root;
  },

  getContext: function (elem) {
    if (elem._context === undefined) {
      elem._context = [];
      for (let element = (elem.tagName === 'HA-ENTITIES-CARD' ? elem.domHost : elem); element; element = element.domHost) {
        switch (element.tagName) {
          case 'HA-ENTITIES-CARD':
            if (element.groupEntity) {
              elem._context.push(element.groupEntity.entity_id);
            } else if (element.groupEntity === false && element.states && element.states.length) {
              elem._context.push('group.' + window.hassUtil.computeDomain(element.states[0]));
            }
            break;
          case 'MORE-INFO-GROUP':
            if (element.stateObj) {
              elem._context.push(element.stateObj.entity_id);
            }
            break;
          case 'PARTIAL-CARDS':
            elem._context.push(element.currentView ? element.currentView : 'default_view');
            break;
          // no default
        }
      }
      elem._context.reverse();
    }
    return elem._context;
  },

  maybeChangeObjectByDevice: function (stateObj) {
    const name = window.customUI.getName();
    if (!name) return stateObj;

    if (!stateObj.attributes.device || !stateObj.attributes.device[name]) {
      return stateObj;
    }
    const attributes = Object.assign({}, stateObj.attributes.device[name]);

    if (!Object.keys(attributes).length) return stateObj;
    return window.customUI.applyAttributes(stateObj, attributes);
  },

  maybeChangeObjectByGroup: function (elem, stateObj) {
    const context = window.customUI.getContext(elem);
    if (!context) return stateObj;

    if (!stateObj.attributes.group) {
      return stateObj;
    }
    const attributes = {};
    context.forEach((c) => {
      if (stateObj.attributes.group[c]) {
        Object.assign(attributes, stateObj.attributes.group[c]);
      }
    });

    if (!Object.keys(attributes).length) return stateObj;

    return window.customUI.applyAttributes(stateObj, attributes);
  },

  applyAttributes: function (stateObj, attributes) {
    return {
      entity_id: stateObj.entity_id,
      state: stateObj.state,
      attributes: Object.assign({}, stateObj.attributes, attributes),
      last_changed: stateObj.last_changed,
    };
  },

  maybeChangeObject: function (elem, stateObj, inDialog, allowHidden) {
    if (inDialog) return stateObj;
    let obj = window.customUI.maybeChangeObjectByDevice(stateObj);
    obj = window.customUI.maybeChangeObjectByGroup(elem, obj);

    if (obj !== stateObj && obj.attributes.hidden && allowHidden) {
      return null;
    }
    return obj;
  },

  fixGroupTitles: function () {
    const haCards = window.customUI.getElementHierarchy(document, [
      'home-assistant',
      'home-assistant-main',
      'partial-cards',
      'ha-cards']);
    if (haCards === null) return;
    const main = window.customUI.lightOrShadow(haCards, '.main');
    const cards = main.querySelectorAll('ha-entities-card');
    cards.forEach((card) => {
      if (card.groupEntity) {
        const obj = window.customUI.maybeChangeObject(
          card,
          card.groupEntity,
          false /* inDialog */,
          false /* allowHidden */);
        if (obj !== card.groupEntity && obj.attributes.friendly_name) {
          const nameElem = window.customUI.lightOrShadow(card, '.name');
          nameElem.textContent = obj.attributes.friendly_name;
        }
      }
    });
  },

  showVersion: function () {
    if (window.location.pathname !== '/dev-info') return;
    const devInfo = window.customUI.getElementHierarchy(document, [
      'home-assistant',
      'home-assistant-main',
      'partial-panel-resolver',
      'ha-panel-dev-info']);
    if (devInfo === null) {
      // DOM not ready. Wait 1 second.
      window.setTimeout(window.customUI.showVersion, 1000);
      return;
    }
    const about = window.customUI.lightOrShadow(devInfo, '.about');
    const secondP = about.querySelectorAll('p')[1];
    const version = document.createElement('p');
    version.textContent = 'Custom UI ' + window.customUI.VERSION;
    about.insertBefore(version, secondP);
  },

  useCustomizer: function () {
    const main = window.customUI.lightOrShadow(document, 'home-assistant');
    const customizer = main.hass.states['customizer.customizer'];
    if (!customizer) return;

    if (customizer.attributes.hide_attributes) {
      if (window.hassUtil.LOGIC_STATE_ATTRIBUTES) {
        Array.prototype.push.apply(
          window.hassUtil.LOGIC_STATE_ATTRIBUTES, customizer.attributes.hide_attributes);
      }
      if (window.hassAttributeUtil.LOGIC_STATE_ATTRIBUTES) {
        customizer.attributes.hide_attributes.forEach((attr) => {
          if (!Object.prototype.hasOwnProperty.call(
            window.hassAttributeUtil.LOGIC_STATE_ATTRIBUTES, attr)) {
            window.hassAttributeUtil.LOGIC_STATE_ATTRIBUTES[attr] = undefined;
          }
        });
      }
    }
  },

  updateAttributes: function () {
    const customUiAttributes = {
      group: undefined,
      device: undefined,
      state_card_mode: {
        type: 'array',
        options: {
          light: window.customUI.SUPPORTED_SLIDER_MODES,
          cover: window.customUI.SUPPORTED_SLIDER_MODES,
          group: ['badges'],
        },
      },
      badges_list: { type: 'json' },
      show_last_changed: { type: 'boolean' },
      hide_control: { type: 'boolean' },
      extra_data_template: { type: 'string' },
      extra_badge: { type: 'json' },
      stretch_slider: { type: 'boolean' },
      slider_theme: { type: 'json' },
      theme: { type: 'string' },
      theme_template: { type: 'string' },
      confirm_controls: { type: 'boolean' },
      confirm_controls_show_lock: { type: 'boolean' },
    };
    if (window.hassUtil.LOGIC_STATE_ATTRIBUTES) {
      Array.prototype.push.apply(
        window.hassUtil.LOGIC_STATE_ATTRIBUTES, Object.keys(customUiAttributes));
    }
    if (window.hassAttributeUtil.LOGIC_STATE_ATTRIBUTES) {
      Object.assign(window.hassAttributeUtil.LOGIC_STATE_ATTRIBUTES, customUiAttributes);
    }
  },

  updateConfigPanel: function () {
    if (!window.location.pathname.startsWith('/config')) return;
    const haPanelConfig = window.customUI.getElementHierarchy(document, [
      'home-assistant',
      'home-assistant-main',
      'partial-panel-resolver',
      'ha-panel-config']);
    if (!haPanelConfig) {
      // DOM not ready. Wait 1 second.
      window.setTimeout(window.customUI.updateConfigPanel, 1000);
      return;
    }
    const ironPages = window.customUI.lightOrShadow(haPanelConfig, 'iron-pages');
    if (!ironPages) return;
    const haConfigNavigation = window.customUI.getElementHierarchy(haPanelConfig, [
      'ha-config-dashboard',
      'ha-config-navigation']);
    if (!haConfigNavigation) return;
    if (ironPages.lastElementChild.tagName !== 'HA-CONFIG-CUSTOM-UI') {
      const haConfigCustomUi = document.createElement('ha-config-custom-ui');
      haConfigCustomUi.isWide = ironPages.domHost.isWide;
      haConfigCustomUi.setAttribute('page-name', 'customui');
      ironPages.appendChild(haConfigCustomUi);
      ironPages.addEventListener('iron-items-changed', () => {
        if (window.location.pathname.startsWith('/config/customui')) {
          ironPages.select('customui');
        }
      });
    }
    if (!haConfigNavigation.pages.some(conf => conf.domain === 'customui')) {
      haConfigNavigation.push('pages', {
        domain: 'customui',
        caption: 'Custom UI',
        description: 'Set UI tweaks.',
        loaded: true
      });
    }
  },

  init: function () {
    if (window.customUI.initDone) return;
    const main = window.customUI.lightOrShadow(document, 'home-assistant');
    if (!main.hass) {
      // Connection wasn't made yet. Try in 1 second.
      window.setTimeout(window.customUI.init, 1000);
      return;
    }
    window.customUI.initDone = true;

    window.customUI.runHooks();
    window.customUI.useCustomizer();
    window.addEventListener('location-changed', window.setTimeout.bind(null, window.customUI.runHooks, 100));
    /* eslint-disable no-console */
    console.log('Loaded CustomUI ' + window.customUI.VERSION);
    /* eslint-enable no-console */
  },

  runHooks: function () {
    window.customUI.fixGroupTitles();
    window.customUI.showVersion();
    window.customUI.updateAttributes();
    window.customUI.updateConfigPanel();
  },

  getName: function () {
    return window.localStorage.getItem('ha-device-name') || '';
  },

  setName: function (name) {
    window.localStorage.setItem('ha-device-name', name || '');
  },

  computeTemplate: function (template, hass, entities, entity, attributes) {
    const functionBody = (template.indexOf('return') >= 0) ? template : 'return `' + template + '`;';
    /* eslint-disable no-new-func */
    const func = new Function('hass', 'entities', 'entity', 'attributes', functionBody);
    /* eslint-enable no-new-func */
    return func(hass, entities, entity, attributes);
  },
};

window.customUI.init();
