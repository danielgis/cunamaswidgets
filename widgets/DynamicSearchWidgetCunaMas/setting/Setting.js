import declare from 'dojo/_base/declare';
import BaseWidgetSetting from 'jimu/BaseWidgetSetting';

export default declare([BaseWidgetSetting], {
  baseClass: 'dynamic-search-widget-cuna-mas-setting',

  postCreate () {
    // the config object is passed in
    this.setConfig(this.config);
  },

  setConfig (config) {
    this.textNode.value = config.serviceUrl;
  },

  getConfig () {
    // WAB will get config object through this method
    return {
      serviceUrl: this.textNode.value
    };
  }
});
